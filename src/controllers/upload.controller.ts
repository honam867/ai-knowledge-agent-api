import { Response } from 'express';
import { uploadService } from '@/services/upload.service';
import { sendSuccess, sendError } from '@/utils/response';
import { logInfo, logError } from '@/utils/logger';
import { asyncErrorHandler } from '@/utils/error';
import { pick } from 'lodash';
import {
  AuthenticatedRequest,
  UploadFile,
  UploadController,
  UploadRequestBody,
  ListUploadsQuery,
  UploadParams,
} from '@/types/upload';

export const uploadController: UploadController = {
  uploadPublic: asyncErrorHandler(async (req, res: Response) => {
    logInfo('Public upload request received');

    if (!req.file) {
      return sendError(res, '', 'No file uploaded', 400);
    }

    const file = req.file as UploadFile;
    const metadata = pick(req.body as UploadRequestBody, ['title', 'description', 'tags']);
    const result = await uploadService.handlePublicUpload(file, metadata);

    if (!result.success || !result.data) {
      logError('Public upload failed', { error: result.error?.message });
      return sendError(res, result.error?.message || 'Upload failed', '', 500);
    }

    logInfo('Public upload successful', { documentId: result.data.id });
    return sendSuccess(res, 'File uploaded successfully', result.data);
  }),

  uploadPrivate: asyncErrorHandler(async (req: AuthenticatedRequest, res: Response) => {
    logInfo('Private upload request received', { userId: req.user?.id });

    if (!req.user) {
      return sendError(res, '', 'Authentication required', 401);
    }

    if (!req.file) {
      return sendError(res, '', 'No file uploaded', 400);
    }

    const file = req.file as UploadFile;
    const metadata = pick(req.body as UploadRequestBody, ['title', 'description', 'tags']);
    const result = await uploadService.handlePrivateUpload(file, req.user.id, metadata);

    if (!result.success || !result.data) {
      logError('Private upload failed', {
        error: result.error?.message,
        userId: req.user.id,
      });
      return sendError(res, result.error?.message || 'Upload failed', '', 500);
    }

    logInfo('Private upload successful', {
      documentId: result.data.id,
      userId: req.user.id,
    });
    return sendSuccess(res, 'File uploaded successfully', result.data);
  }),

  getUploadById: asyncErrorHandler(async (req, res: Response) => {
    const { id } = req.params as unknown as UploadParams;

    if (!id) {
      return sendError(res, '', 'Upload ID is required', 400);
    }

    const result = await uploadService.getDocumentById(id);

    if (!result.success) {
      logError('Get upload failed', {
        error: result.error?.message,
        uploadId: id,
      });
      return sendError(res, result.error?.message || 'Failed to retrieve document', '', 500);
    }

    if (!result.data) {
      return sendError(res, '', 'Document not found', 404);
    }

    return sendSuccess(res, 'Document retrieved successfully', result.data);
  }),

  listUploads: asyncErrorHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return sendError(res, '', 'Authentication required', 401);
    }

    const { page = '1', limit = '10', status, fileType } = req.query as ListUploadsQuery;

    const filters = {
      userId: req.user.id,
      status,
      fileType,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };

    const result = await uploadService.listDocuments(filters);

    if (!result.success || !result.data) {
      logError('List uploads failed', {
        error: result.error?.message,
        userId: req.user.id,
      });
      return sendError(res, result.error?.message || 'Failed to retrieve documents', '', 500);
    }

    return sendSuccess(res, 'Documents retrieved successfully', result.data);
  }),

  uploadPublicMultiple: asyncErrorHandler(async (req, res: Response) => {
    logInfo('Multiple public upload request received');

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return sendError(res, '', 'No files uploaded', 400);
    }

    const files = req.files as UploadFile[];
    const metadata = pick(req.body as UploadRequestBody, ['title', 'description', 'tags']);
    const result = await uploadService.handlePublicMultipleUpload(files, metadata);

    if (!result.success || !result.data) {
      logError('Multiple public upload failed', { error: result.error?.message });
      return sendError(res, result.error?.message || 'Upload failed', '', 500);
    }

    logInfo('Multiple public upload completed', {
      total: result.data.summary.total,
      successful: result.data.summary.successful,
      failed: result.data.summary.failed,
    });

    return sendSuccess(res, 'Files processed', result.data);
  }),

  uploadPrivateMultiple: asyncErrorHandler(async (req: AuthenticatedRequest, res: Response) => {
    logInfo('Multiple private upload request received', { userId: req.user?.id });

    if (!req.user) {
      return sendError(res, '', 'Authentication required', 401);
    }

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return sendError(res, '', 'No files uploaded', 400);
    }

    const files = req.files as UploadFile[];
    const metadata = pick(req.body as UploadRequestBody, ['title', 'description', 'tags']);
    const result = await uploadService.handlePrivateMultipleUpload(files, req.user.id, metadata);

    if (!result.success || !result.data) {
      logError('Multiple private upload failed', {
        error: result.error?.message,
        userId: req.user.id,
      });
      return sendError(res, result.error?.message || 'Upload failed', '', 500);
    }

    logInfo('Multiple private upload completed', {
      total: result.data.summary.total,
      successful: result.data.summary.successful,
      failed: result.data.summary.failed,
      userId: req.user.id,
    });

    return sendSuccess(res, 'Files processed', result.data);
  }),

  deleteUpload: asyncErrorHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return sendError(res, '', 'Authentication required', 401);
    }

    const { id } = req.params as unknown as UploadParams;

    if (!id) {
      return sendError(res, '', 'Upload ID is required', 400);
    }

    const result = await uploadService.deleteDocument(id, req.user.id);

    if (!result.success || !result.data) {
      logError('Delete upload failed', {
        error: result.error?.message,
        uploadId: id,
        userId: req.user.id,
      });
      return sendError(res, result.error?.message || 'Failed to delete document', '', 500);
    }

    if (!result.data.success) {
      return sendError(res, result.data.message, '', result.data.status || 400);
    }

    return sendSuccess(res, 'Document deleted successfully', { deleted: true });
  }),
};
