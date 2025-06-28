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
} from '@/types/upload';

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

  await db
    .update(documentsTable)
    .set({
      status: 'ready',
      updatedAt: new Date(),
    })
    .where(eq(documentsTable.id, document.id));

  return document as DocumentRecord;
};

const formatDocumentResponse = (document: DocumentRecord, isPrivate: boolean = false): DocumentResponse => ({
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

  listDocuments: async (filters: DocumentFilters): Promise<ServiceResult<ListDocumentsResponse>> => {
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

      const enhancedDocuments: DocumentResponse[] = documents.map(doc => ({
        ...doc,
        isPublic: !doc.userId,
      } as DocumentResponse));

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
};
