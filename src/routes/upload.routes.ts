import { Router } from 'express';
import { uploadController } from '@/controllers/upload.controller';
import { uploadSingle, uploadMultiple } from '@/config/upload';
import { createJwtAuthMiddleware } from '@/middleware';

export const uploadRoutes = Router();

/**
 * Public upload route - allows anonymous users to upload files
 * POST /api/upload/public
 */
uploadRoutes.post('/public', uploadSingle, uploadController.uploadPublic);

/**
 * Public multiple upload route - allows anonymous users to upload multiple files
 * POST /api/upload/public/multiple
 */
uploadRoutes.post('/public/multiple', uploadMultiple, uploadController.uploadPublicMultiple);

/**
 * Authenticated upload route - requires user authentication
 * POST /api/upload/private
 */
uploadRoutes.post(
  '/private',
  createJwtAuthMiddleware(),
  uploadSingle,
  uploadController.uploadPrivate
);

/**
 * Authenticated multiple upload route - requires user authentication
 * POST /api/upload/private/multiple
 */
uploadRoutes.post(
  '/private/multiple',
  createJwtAuthMiddleware(),
  uploadMultiple,
  uploadController.uploadPrivateMultiple
);

/**
 * Get upload by ID - public access for now
 * GET /api/upload/:id
 */
uploadRoutes.get('/:id', uploadController.getUploadById);

/**
 * List uploads - authenticated only
 * GET /api/upload/
 */
uploadRoutes.get('/', createJwtAuthMiddleware(), uploadController.listUploads);

/**
 * Delete upload - authenticated only
 * DELETE /api/upload/:id
 */
uploadRoutes.delete('/:id', createJwtAuthMiddleware(), uploadController.deleteUpload);
