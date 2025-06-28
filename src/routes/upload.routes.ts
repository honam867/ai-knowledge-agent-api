import { Router } from 'express';
import { uploadController } from '@/controllers/upload.controller';
import { uploadSingle, uploadMultiple } from '@/config/upload';
import { createJwtAuthMiddleware } from '@/middleware';

export const uploadRoutes: Router = Router();

uploadRoutes.post('/public', uploadSingle, uploadController.uploadPublic);

uploadRoutes.post('/public/multiple', uploadMultiple, uploadController.uploadPublicMultiple);

uploadRoutes.post(
  '/private',
  createJwtAuthMiddleware(),
  uploadSingle,
  uploadController.uploadPrivate
);

uploadRoutes.post(
  '/private/multiple',
  createJwtAuthMiddleware(),
  uploadMultiple,
  uploadController.uploadPrivateMultiple
);

uploadRoutes.get('/:id', uploadController.getUploadById);

uploadRoutes.get('/', createJwtAuthMiddleware(), uploadController.listUploads);

uploadRoutes.delete('/:id', createJwtAuthMiddleware(), uploadController.deleteUpload);
