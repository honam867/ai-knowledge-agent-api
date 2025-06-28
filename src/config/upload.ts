import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { config } from './index';
import { logInfo, logError } from '@/utils/logger';
import _ from 'lodash';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

// Supported file types for document upload
const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'text/plain', // .txt
  'text/markdown', // .md
  'application/rtf', // .rtf
] as const;

// File size limits (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    // Get file extension from original filename
    const extension = file.originalname.split('.').pop()?.toLowerCase() || 'bin';

    // Generate unique filename with timestamp (WITHOUT extension for public_id)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const originalName = _.kebabCase(file.originalname.split('.')[0]);
    const filenameWithoutExt = `${timestamp}-${originalName}`;

    const uploadParams = {
      folder: 'ai-knowledge-agent/documents',
      resource_type: 'raw' as const,
      public_id: filenameWithoutExt,
      use_filename: false,
      unique_filename: false,
      format: extension,
      upload_preset: config.cloudinary.uploadPreset,
    };

    logInfo('Cloudinary upload params', {
      originalName: file.originalname,
      generatedPublicId: filenameWithoutExt,
      mimetype: file.mimetype,
      extension,
      uploadParams,
    });

    return uploadParams;
  },
});

// File filter function
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  logInfo('File upload attempt', {
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });

  // Check file type
  if (!_.includes(SUPPORTED_FILE_TYPES, file.mimetype)) {
    logError('File type not supported', {
      mimetype: file.mimetype,
      originalName: file.originalname,
    });
    return cb(
      new Error(`File type not supported. Supported types: ${SUPPORTED_FILE_TYPES.join(', ')}`)
    );
  }

  // Accept the file
  cb(null, true);
};

// Create multer upload configuration for single files
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Allow only 1 file per upload
  },
});

// Create multer upload configuration for multiple files
const uploadMultipleConfig = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5, // Allow up to 5 files per upload
  },
});

// Single file upload middleware
export const uploadSingle = upload.single('document');

// Multiple files upload middleware (if needed later)
export const uploadMultiple = uploadMultipleConfig.array('documents', 5);

// Export Cloudinary instance for direct use
export { cloudinary };

// Utility function to delete file from Cloudinary
export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    // Try different resource types since files might be uploaded as different types
    const resourceTypes = ['auto', 'raw', 'image'] as const;

    for (const resourceType of resourceTypes) {
      try {
        const result = await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType,
        });

        if (result.result === 'ok') {
          logInfo('File deleted from Cloudinary', {
            publicId,
            resourceType,
            result: result.result,
          });
          return true;
        }
      } catch (err) {
        // Continue to next resource type
        continue;
      }
    }

    logError('Failed to delete file from Cloudinary - not found in any resource type', {
      publicId,
    });
    return false;
  } catch (error) {
    logError('Failed to delete file from Cloudinary', {
      publicId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
};

// Utility function to get file info from Cloudinary
export const getCloudinaryFileInfo = async (publicId: string) => {
  try {
    // Try different resource types to find the file
    const resourceTypes = ['auto', 'raw', 'image'] as const;

    for (const resourceType of resourceTypes) {
      try {
        const result = await cloudinary.api.resource(publicId, {
          resource_type: resourceType,
        });

        return {
          publicId: result.public_id,
          secureUrl: result.secure_url,
          bytes: result.bytes,
          format: result.format,
          createdAt: result.created_at,
          resourceType,
        };
      } catch (err) {
        // Continue to next resource type
        continue;
      }
    }

    logError('File not found in Cloudinary', { publicId });
    return null;
  } catch (error) {
    logError('Failed to get file info from Cloudinary', {
      publicId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
};

// Export supported file types and limits for validation
export const UPLOAD_CONFIG = {
  SUPPORTED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_SINGLE: 1,
  MAX_FILES_MULTIPLE: 5,
} as const;
