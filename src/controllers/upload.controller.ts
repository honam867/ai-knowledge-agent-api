import { Request, Response } from 'express';
import { uploadService } from '@/services/upload.service';
import { sendSuccess, sendError } from '@/utils/response';
import { logInfo, logError } from '@/utils/logger';
import _ from 'lodash';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

interface UploadFile extends Express.Multer.File {
  path: string;
  filename: string;
}

/**
 * Upload Controller
 * Handles file upload operations with functional approach
 */
export const uploadController = {
  /**
   * Handle public file upload (anonymous users)
   * POST /api/upload/public
   */
  uploadPublic: async (req: Request, res: Response) => {
    try {
      logInfo('Public upload request received');

      // Check if file was uploaded
      if (!req.file) {
        return sendError(res, '', 'No file uploaded', 400);
      }

      const file = req.file as UploadFile;
      const metadata = _.pick(req.body, ['title', 'description', 'tags']);

      // Process the upload
      const result = await uploadService.handlePublicUpload(file, metadata);

      logInfo('Public upload successful', { documentId: result.id });

      return sendSuccess(res, 'File uploaded successfully', result);
    } catch (error) {
      logError('Public upload failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return sendError(res, error instanceof Error ? error.message : 'Upload failed', '', 500);
    }
  },

  /**
   * Handle authenticated file upload (logged-in users)
   * POST /api/upload/private
   */
  uploadPrivate: async (req: AuthenticatedRequest, res: Response) => {
    try {
      logInfo('Private upload request received', { userId: req.user?.id });
      if (!req.user) {
        return sendError(res, '', 'Authentication required', 401);
      }

      if (!req.file) {
        return sendError(res, '', 'No file uploaded', 400);
      }

      const file = req.file as UploadFile;
      const metadata = _.pick(req.body, ['title', 'description', 'tags']);

      const result = await uploadService.handlePrivateUpload(file, req.user.id, metadata);

      logInfo('Private upload successful', {
        documentId: result.id,
        userId: req.user.id,
      });

      return sendSuccess(res, 'File uploaded successfully', result);
    } catch (error) {
      logError('Private upload failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });
      return sendError(res, error instanceof Error ? error.message : 'Upload failed', '', 500);
    }
  },

  /**
   * Get upload by ID
   * GET /api/upload/:id
   */
  getUploadById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return sendError(res, '', 'Upload ID is required', 400);
      }

      const document = await uploadService.getDocumentById(id);

      if (!document) {
        return sendError(res, '', 'Document not found', 404);
      }

      return sendSuccess(res, 'Document retrieved successfully', document);
    } catch (error) {
      logError('Get upload failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        uploadId: req.params.id,
      });
      return sendError(
        res,
        error instanceof Error ? error.message : 'Failed to retrieve document',
        '',
        500
      );
    }
  },

  /**
   * List uploads for authenticated user
   * GET /api/upload/
   */
  listUploads: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return sendError(res, '', 'Authentication required', 401);
      }

      const { page = '1', limit = '10', status, fileType } = req.query;

      const filters = {
        userId: req.user.id,
        status: status as string,
        fileType: fileType as string,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const result = await uploadService.listDocuments(filters);

      return sendSuccess(res, 'Documents retrieved successfully', result);
    } catch (error) {
      logError('List uploads failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });
      return sendError(
        res,
        error instanceof Error ? error.message : 'Failed to retrieve documents',
        '',
        500
      );
    }
  },

  /**
   * Handle multiple public file uploads (anonymous users)
   * POST /api/upload/public/multiple
   */
  uploadPublicMultiple: async (req: Request, res: Response) => {
    try {
      logInfo('Multiple public upload request received');

      // Check if files were uploaded
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return sendError(res, '', 'No files uploaded', 400);
      }

      const files = req.files as UploadFile[];
      const metadata = _.pick(req.body, ['title', 'description', 'tags']);

      // Process the multiple uploads
      const result = await uploadService.handlePublicMultipleUpload(files, metadata);

      logInfo('Multiple public upload completed', {
        total: result.summary.total,
        successful: result.summary.successful,
        failed: result.summary.failed,
      });

      return sendSuccess(res, 'Files processed', result);
    } catch (error) {
      logError('Multiple public upload failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return sendError(res, error instanceof Error ? error.message : 'Upload failed', '', 500);
    }
  },

  /**
   * Handle multiple authenticated file uploads (logged-in users)
   * POST /api/upload/private/multiple
   */
  uploadPrivateMultiple: async (req: AuthenticatedRequest, res: Response) => {
    try {
      logInfo('Multiple private upload request received', { userId: req.user?.id });

      // Check if user is authenticated
      if (!req.user) {
        return sendError(res, '', 'Authentication required', 401);
      }

      // Check if files were uploaded
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return sendError(res, '', 'No files uploaded', 400);
      }

      const files = req.files as UploadFile[];
      const metadata = _.pick(req.body, ['title', 'description', 'tags']);

      // Process the multiple uploads with user association
      const result = await uploadService.handlePrivateMultipleUpload(files, req.user.id, metadata);

      logInfo('Multiple private upload completed', {
        total: result.summary.total,
        successful: result.summary.successful,
        failed: result.summary.failed,
        userId: req.user.id,
      });

      return sendSuccess(res, 'Files processed', result);
    } catch (error) {
      logError('Multiple private upload failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });
      return sendError(res, error instanceof Error ? error.message : 'Upload failed', '', 500);
    }
  },

  /**
   * Delete upload by ID
   * DELETE /api/upload/:id
   */
  deleteUpload: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return sendError(res, '', 'Authentication required', 401);
      }

      const { id } = req.params;

      if (!id) {
        return sendError(res, '', 'Upload ID is required', 400);
      }

      const result = await uploadService.deleteDocument(id, req.user.id);

      if (!result.success) {
        return sendError(res, result.message, '', result.status || 400);
      }

      return sendSuccess(res, 'Document deleted successfully', { deleted: true });
    } catch (error) {
      logError('Delete upload failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        uploadId: req.params.id,
        userId: req.user?.id,
      });
      return sendError(
        res,
        error instanceof Error ? error.message : 'Failed to delete document',
        '',
        500
      );
    }
  },
};
