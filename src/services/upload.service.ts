import db from '@/db/connection';
import { documentsTable, documentProcessingTable } from '@/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { deleteFromCloudinary } from '@/config/upload';
import { logInfo, logError } from '@/utils/logger';
import _ from 'lodash';

interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  filename: string;
  path: string;
  public_id: string;
  secure_url: string;
  resource_type: string;
  format: string;
  bytes: number;
  folder: string;
  [key: string]: any;
}

interface UploadMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  cloudinary?: {
    publicId: string;
    secureUrl: string;
    folder: string;
    resourceType: string;
    format: string;
    bytes: number;
    [key: string]: any;
  };
  [key: string]: any;
}

interface DocumentFilters {
  userId?: string;
  status?: string;
  fileType?: string;
  page: number;
  limit: number;
}

/**
 * Upload Service
 * Handles file upload business logic with functional approach
 */
export const uploadService = {
  /**
   * Handle public file upload (anonymous users)
   */
  handlePublicUpload: async (file: UploadFile, metadata: UploadMetadata = {}) => {
    try {
      // Extract file type from mimetype
      const fileType = uploadService.extractFileType(file.mimetype);

      // Prepare metadata with Cloudinary information
      const enhancedMetadata = {
        ...metadata,
        ...file,
        public_id: file.filename,
      };

      // Create document record without userId (public upload)
      const [document] = await db
        .insert(documentsTable)
        .values({
          userId: null, // Public uploads have no associated user
          filename: file.filename,
          originalName: file.originalname,
          fileType: fileType,
          fileSize: file.size,
          uploadPath: file.path,
          status: 'uploading',
          metadata: enhancedMetadata,
        })
        .returning();

      // Create initial processing record
      await db.insert(documentProcessingTable).values({
        documentId: document.id,
        stage: 'upload',
        status: 'success',
      });

      // Update document status to ready (for now, later we'll add actual processing)
      await db
        .update(documentsTable)
        .set({
          status: 'ready',
          updatedAt: new Date(),
        })
        .where(eq(documentsTable.id, document.id));

      logInfo('Public upload completed', { documentId: document.id });

      return {
        id: document.id,
        filename: document.filename,
        originalName: document.originalName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        status: 'ready',
        uploadPath: document.uploadPath,
        metadata: document.metadata,
        createdAt: document.createdAt,
        isPublic: true,
      };
    } catch (error) {
      logError('Public upload processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filename: file.originalname,
      });
      throw error;
    }
  },

  /**
   * Handle private file upload (authenticated users)
   */
  handlePrivateUpload: async (file: UploadFile, userId: string, metadata: UploadMetadata = {}) => {
    try {
      // Extract file type from mimetype
      const fileType = uploadService.extractFileType(file.mimetype);

      // Prepare metadata with Cloudinary information
      const enhancedMetadata = {
        ...metadata,
        ...file,
        public_id: file.filename,
      };

      // Create document record with userId
      const [document] = await db
        .insert(documentsTable)
        .values({
          userId: userId,
          filename: file.filename,
          originalName: file.originalname,
          fileType: fileType,
          fileSize: file.size,
          uploadPath: file.path,
          status: 'uploading',
          metadata: enhancedMetadata,
        })
        .returning();

      // Create initial processing record
      await db.insert(documentProcessingTable).values({
        documentId: document.id,
        stage: 'upload',
        status: 'success',
      });

      // Update document status to ready (for now, later we'll add actual processing)
      await db
        .update(documentsTable)
        .set({
          status: 'ready',
          updatedAt: new Date(),
        })
        .where(eq(documentsTable.id, document.id));

      logInfo('Private upload completed', { documentId: document.id, userId });

      return {
        id: document.id,
        filename: document.filename,
        originalName: document.originalName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        status: 'ready',
        uploadPath: document.uploadPath,
        metadata: document.metadata,
        userId: document.userId,
        createdAt: document.createdAt,
        isPublic: false,
      };
    } catch (error) {
      logError('Private upload processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filename: file.originalname,
        userId,
      });
      throw error;
    }
  },

  /**
   * Get document by ID
   */
  getDocumentById: async (documentId: string) => {
    try {
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
      };
    } catch (error) {
      logError('Get document by ID failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
      });
      throw error;
    }
  },

  /**
   * List documents with filtering and pagination
   */
  listDocuments: async (filters: DocumentFilters) => {
    try {
      const { userId, status, fileType, page, limit } = filters;

      // Build where conditions
      const conditions = [];

      if (userId) {
        conditions.push(eq(documentsTable.userId, userId));
      }

      if (status) {
        conditions.push(eq(documentsTable.status, status as any));
      }

      if (fileType) {
        conditions.push(eq(documentsTable.fileType, fileType as any));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ totalCount }] = await db
        .select({
          totalCount: count(documentsTable.id),
        })
        .from(documentsTable)
        .where(whereClause);

      // Get paginated results
      const offset = (page - 1) * limit;
      const documents = await db
        .select()
        .from(documentsTable)
        .where(whereClause)
        .orderBy(desc(documentsTable.createdAt))
        .limit(limit)
        .offset(offset);

      const enhancedDocuments = documents.map(doc => ({
        ...doc,
        isPublic: !doc.userId,
      }));

      return {
        documents: enhancedDocuments,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      logError('List documents failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filters,
      });
      throw error;
    }
  },

  /**
   * Delete document by ID
   */
  deleteDocument: async (documentId: string, userId?: string) => {
    try {
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
      const publicId = _.get(document, 'metadata.public_id', '');
      await deleteFromCloudinary(publicId);
      await db
        .delete(documentProcessingTable)
        .where(eq(documentProcessingTable.documentId, documentId));
      await db.delete(documentsTable).where(eq(documentsTable.id, documentId));
      logInfo('Document deleted successfully', { documentId, userId, publicId });
      return {
        success: true,
        message: 'Document deleted successfully',
      };
    } catch (error) {
      logError('Delete document failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
        userId,
      });
      throw error;
    }
  },
  extractFileType: (mimetype: string): 'pdf' | 'docx' | 'md' | 'txt' => {
    const typeMap: Record<string, 'pdf' | 'docx' | 'md' | 'txt'> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'docx',
      'text/markdown': 'md',
      'text/plain': 'txt',
      'application/rtf': 'txt', // Treat RTF as txt for now
    };

    return typeMap[mimetype] || 'txt';
  },

  /**
   * Handle multiple public file uploads (anonymous users)
   */
  handlePublicMultipleUpload: async (files: UploadFile[], metadata: UploadMetadata = {}) => {
    try {
      logInfo('Processing multiple public uploads', {
        fileCount: files.length,
        files: files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })),
      });

      const results = [];
      const errors = [];

      for (const file of files) {
        try {
          const result = await uploadService.handlePublicUpload(file, metadata);
          results.push(result);
        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error instanceof Error ? error.message : 'Unknown error',
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
    } catch (error) {
      logError('Multiple public upload processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileCount: files.length,
      });
      throw error;
    }
  },

  /**
   * Handle multiple private file uploads (authenticated users)
   */
  handlePrivateMultipleUpload: async (
    files: UploadFile[],
    userId: string,
    metadata: UploadMetadata = {}
  ) => {
    try {
      logInfo('Processing multiple private uploads', {
        fileCount: files.length,
        userId,
        files: files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })),
      });

      const results = [];
      const errors = [];

      for (const file of files) {
        try {
          const result = await uploadService.handlePrivateUpload(file, userId, metadata);
          results.push(result);
        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error instanceof Error ? error.message : 'Unknown error',
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
    } catch (error) {
      logError('Multiple private upload processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileCount: files.length,
        userId,
      });
      throw error;
    }
  },
};
