import db from '@/db/connection';
import { documentsTable, documentProcessingTable } from '@/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { deleteFromCloudinary } from '@/config/upload';
import { logInfo, logError } from '@/utils/logger';
import { safeAsync } from '@/utils/error';
import { get } from 'lodash';
import {
  UploadFile,
  UploadMetadata,
  DocumentFilters,
  DocumentResponse,
  DocumentRecord,
  ListDocumentsResponse,
  MultipleUploadResponse,
  DeleteDocumentResponse,
  ServiceResult,
  UploadServiceMethods,
  FileType,
  UploadError,
  TextExtractionResult,
} from '@/types/upload';
import { textExtractionService } from '@/services/text-extraction.service';

const extractFileType = (mimetype: string): FileType => {
  const typeMap: Record<string, FileType> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'docx',
    'text/markdown': 'md',
    'text/plain': 'txt',
    'application/rtf': 'txt',
  };

  return typeMap[mimetype] || 'txt';
};

const createDocumentRecord = async (
  file: UploadFile,
  userId: string | null,
  metadata: UploadMetadata
): Promise<DocumentRecord> => {
  const fileType = extractFileType(file.mimetype);
  const enhancedMetadata = {
    ...metadata,
    ...file,
    public_id: file.filename,
  };

  const [document] = await db
    .insert(documentsTable)
    .values({
      userId,
      filename: file.filename,
      originalName: file.originalname,
      fileType,
      fileSize: file.size,
      uploadPath: file.path,
      status: 'uploading',
      metadata: enhancedMetadata,
    })
    .returning();

  await db.insert(documentProcessingTable).values({
    documentId: document.id,
    stage: 'upload',
    status: 'success',
  });

  // Check if file type supports text extraction
  const supportedTypes = ['pdf', 'docx', 'md', 'txt'];
  const shouldExtractText = supportedTypes.includes(fileType);

  if (shouldExtractText) {
    logInfo('Starting automatic text extraction', {
      documentId: document.id,
      fileType,
      originalName: file.originalname,
    });

    // Process text extraction asynchronously (don't await to avoid blocking upload response)
    processDocumentText(document.id)
      .then(result => {
        if (result.success) {
          logInfo('Automatic text extraction completed', {
            documentId: document.id,
            textLength: result.data?.text.length || 0,
          });
        } else {
          logError('Automatic text extraction failed', {
            documentId: document.id,
            error: result.error?.message,
          });
        }
      })
      .catch(error => {
        logError('Automatic text extraction error', {
          documentId: document.id,
          error: error.message,
        });
      });

    // Set initial status to 'processing' since text extraction is running
    await db
      .update(documentsTable)
      .set({
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(documentsTable.id, document.id));
  } else {
    // For unsupported file types, set status directly to 'ready'
    await db
      .update(documentsTable)
      .set({
        status: 'ready',
        updatedAt: new Date(),
      })
      .where(eq(documentsTable.id, document.id));
  }

  return document as DocumentRecord;
};

const formatDocumentResponse = (
  document: DocumentRecord,
  isPrivate: boolean = false
): DocumentResponse => ({
  id: document.id,
  filename: document.filename,
  originalName: document.originalName,
  fileType: document.fileType,
  fileSize: document.fileSize,
  status: document.status || 'ready',
  uploadPath: document.uploadPath,
  metadata: document.metadata,
  ...(isPrivate && { userId: document.userId }),
  createdAt: document.createdAt,
  isPublic: !document.userId,
});

/**
 * Process text extraction for an uploaded document
 */
const processDocumentText = async (
  documentId: string
): Promise<ServiceResult<TextExtractionResult>> => {
  return safeAsync(async () => {
    logInfo('Starting text processing for document', { documentId });

    // Get document details
    const [document] = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .limit(1);

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    await db
      .update(documentProcessingTable)
      .set({
        stage: 'extract',
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(documentProcessingTable.documentId, documentId));

    // Set document status to 'processing'
    await db
      .update(documentsTable)
      .set({
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(documentsTable.id, documentId));

    try {
      // Create UploadFile-like object for text extraction
      const fileForExtraction: UploadFile = {
        fieldname: 'document',
        originalname: document.originalName,
        encoding: '7bit',
        mimetype: `${
          document.fileType === 'pdf'
            ? 'application/pdf'
            : document.fileType === 'docx'
              ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              : document.fileType === 'md'
                ? 'text/markdown'
                : 'text/plain'
        }`,
        size: document.fileSize,
        destination: '',
        filename: document.filename,
        path: document.uploadPath,
        buffer: Buffer.alloc(0), // Not used since we fetch from path
        // Cloudinary-specific fields
        public_id: get(document.metadata, 'public_id', ''),
        secure_url: document.uploadPath,
        resource_type: 'raw',
        format: document.fileType,
        bytes: document.fileSize,
        folder: get(document.metadata, 'folder', ''),
      };

      // Extract text using the text extraction service
      const extractionResult = await textExtractionService.extractText(fileForExtraction);

      if (!extractionResult.success) {
        throw new Error(`Text extraction failed: ${extractionResult.error?.message}`);
      }

      const textData = extractionResult.data!;

      // Update document with extracted text and metadata
      const updateResult = await updateDocumentWithText(
        documentId,
        textData.text,
        textData.metadata
      );

      if (!updateResult.success) {
        throw new Error(`Failed to update document with text: ${updateResult.error?.message}`);
      }

      // Set document status to 'ready'
      await db
        .update(documentsTable)
        .set({
          status: 'ready',
          updatedAt: new Date(),
        })
        .where(eq(documentsTable.id, documentId));

      await db
        .update(documentProcessingTable)
        .set({
          stage: 'extract',
          status: 'success',
        })
        .where(eq(documentProcessingTable.documentId, documentId));

      logInfo('Text processing completed successfully', {
        documentId,
        textLength: textData.text.length,
        wordCount: textData.metadata?.wordCount,
      });

      return textData;
    } catch (error) {
      logError('Text processing failed', { documentId, error: (error as Error).message });
      // Set document status back to 'ready' (document is still usable without text)
      await db
        .update(documentsTable)
        .set({
          status: 'ready',
          updatedAt: new Date(),
        })
        .where(eq(documentsTable.id, documentId));

      // Return empty result instead of throwing - document remains usable
      return {
        text: '',
        metadata: {
          format: 'error',
          wordCount: 0,
          characterCount: 0,
          warnings: [`Text extraction failed: ${(error as Error).message}`],
        },
      };
    }
  });
};

/**
 * Update document with extracted text and metadata
 */
const updateDocumentWithText = async (
  documentId: string,
  text: string,
  metadata: any
): Promise<ServiceResult<boolean>> => {
  return safeAsync(async () => {
    logInfo('Updating document with extracted text', {
      documentId,
      textLength: text.length,
      hasMetadata: !!metadata,
    });

    // Get current document to merge metadata
    const [currentDocument] = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .limit(1);

    if (!currentDocument) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Merge extraction metadata with existing metadata
    const enhancedMetadata = {
      ...currentDocument.metadata,
      textExtraction: {
        extractedAt: new Date().toISOString(),
        ...metadata,
      },
    };

    // Update document with text content and enhanced metadata
    await db
      .update(documentsTable)
      .set({
        contentText: text,
        metadata: enhancedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(documentsTable.id, documentId));

    logInfo('Document updated with extracted text', {
      documentId,
      textLength: text.length,
      wordCount: metadata?.wordCount,
    });

    return true;
  });
};

export const uploadService: UploadServiceMethods = {
  handlePublicUpload: async (
    file: UploadFile,
    metadata: UploadMetadata = {}
  ): Promise<ServiceResult<DocumentResponse>> => {
    return safeAsync(async () => {
      const document = await createDocumentRecord(file, null, metadata);

      logInfo('Public upload completed', { documentId: document.id });

      return formatDocumentResponse(document);
    });
  },

  handlePrivateUpload: async (
    file: UploadFile,
    userId: string,
    metadata: UploadMetadata = {}
  ): Promise<ServiceResult<DocumentResponse>> => {
    return safeAsync(async () => {
      const document = await createDocumentRecord(file, userId, metadata);

      logInfo('Private upload completed', { documentId: document.id, userId });

      return formatDocumentResponse(document, true);
    });
  },

  getDocumentById: async (documentId: string): Promise<ServiceResult<DocumentResponse | null>> => {
    return safeAsync(async () => {
      const [document] = await db
        .select()
        .from(documentsTable)
        .where(eq(documentsTable.id, documentId))
        .limit(1);

      if (!document) {
        return null;
      }

      return {
        ...document,
        isPublic: !document.userId,
      } as DocumentResponse;
    });
  },

  listDocuments: async (
    filters: DocumentFilters
  ): Promise<ServiceResult<ListDocumentsResponse>> => {
    return safeAsync(async () => {
      const { userId, status, fileType, page, limit } = filters;
      const conditions = [];

      if (userId) conditions.push(eq(documentsTable.userId, userId));
      if (status) conditions.push(eq(documentsTable.status, status as any));
      if (fileType) conditions.push(eq(documentsTable.fileType, fileType as any));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [{ totalCount }] = await db
        .select({ totalCount: count(documentsTable.id) })
        .from(documentsTable)
        .where(whereClause);

      const offset = (page - 1) * limit;
      const documents = await db
        .select()
        .from(documentsTable)
        .where(whereClause)
        .orderBy(desc(documentsTable.createdAt))
        .limit(limit)
        .offset(offset);

      const enhancedDocuments: DocumentResponse[] = documents.map(
        doc =>
          ({
            ...doc,
            isPublic: !doc.userId,
          }) as DocumentResponse
      );

      return {
        documents: enhancedDocuments,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      };
    });
  },

  deleteDocument: async (
    documentId: string,
    userId?: string
  ): Promise<ServiceResult<DeleteDocumentResponse>> => {
    return safeAsync(async () => {
      const [document] = await db
        .select()
        .from(documentsTable)
        .where(eq(documentsTable.id, documentId))
        .limit(1);

      if (!document) {
        return {
          success: false,
          message: 'Document not found',
          status: 404,
        };
      }

      if (userId && document.userId !== userId) {
        return {
          success: false,
          message: 'You do not have permission to delete this document',
          status: 403,
        };
      }

      const publicId = get(document, 'metadata.public_id', '');

      if (publicId) {
        await deleteFromCloudinary(publicId);
      }

      await db
        .delete(documentProcessingTable)
        .where(eq(documentProcessingTable.documentId, documentId));

      await db.delete(documentsTable).where(eq(documentsTable.id, documentId));

      logInfo('Document deleted successfully', { documentId, userId, publicId });

      return {
        success: true,
        message: 'Document deleted successfully',
      };
    });
  },

  handlePublicMultipleUpload: async (
    files: UploadFile[],
    metadata: UploadMetadata = {}
  ): Promise<ServiceResult<MultipleUploadResponse>> => {
    return safeAsync(async () => {
      logInfo('Processing multiple public uploads', {
        fileCount: files.length,
        files: files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })),
      });

      const results: DocumentResponse[] = [];
      const errors: UploadError[] = [];

      for (const file of files) {
        const result = await uploadService.handlePublicUpload(file, metadata);

        if (result.success && result.data) {
          results.push(result.data);
        } else {
          errors.push({
            filename: file.originalname,
            error: result.error?.message || 'Unknown error',
          });
        }
      }

      logInfo('Multiple public uploads completed', {
        successCount: results.length,
        errorCount: errors.length,
      });

      return {
        success: results,
        errors,
        summary: {
          total: files.length,
          successful: results.length,
          failed: errors.length,
        },
      };
    });
  },

  handlePrivateMultipleUpload: async (
    files: UploadFile[],
    userId: string,
    metadata: UploadMetadata = {}
  ): Promise<ServiceResult<MultipleUploadResponse>> => {
    return safeAsync(async () => {
      logInfo('Processing multiple private uploads', {
        fileCount: files.length,
        userId,
        files: files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })),
      });

      const results: DocumentResponse[] = [];
      const errors: UploadError[] = [];

      for (const file of files) {
        const result = await uploadService.handlePrivateUpload(file, userId, metadata);

        if (result.success && result.data) {
          results.push(result.data);
        } else {
          errors.push({
            filename: file.originalname,
            error: result.error?.message || 'Unknown error',
          });
        }
      }

      logInfo('Multiple private uploads completed', {
        successCount: results.length,
        errorCount: errors.length,
        userId,
      });

      return {
        success: results,
        errors,
        summary: {
          total: files.length,
          successful: results.length,
          failed: errors.length,
        },
      };
    });
  },

  // Text processing methods
  processDocumentText,
  updateDocumentWithText,
};
