import { Request, Response } from 'express';

// Base file type enum
export type FileType = 'pdf' | 'docx' | 'md' | 'txt';

// Document status enum
export type DocumentStatus = 'uploading' | 'ready' | 'processing' | 'failed' | 'deleted';

// Processing stage enum
export type ProcessingStage = 'upload' | 'validation' | 'processing' | 'completed';

// Processing status enum
export type ProcessingStatus = 'pending' | 'success' | 'failed';

// Base User interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Extended Request interface for authenticated routes
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Cloudinary metadata interface
export interface CloudinaryMetadata {
  publicId: string;
  secureUrl: string;
  folder: string;
  resourceType: string;
  format: string;
  bytes: number;
  [key: string]: any;
}

// Upload metadata interface
export interface UploadMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  cloudinary?: CloudinaryMetadata;
  [key: string]: any;
}

// Extended Multer file interface
export interface UploadFile extends Express.Multer.File {
  path: string;
  filename: string;
  public_id: string;
  secure_url: string;
  resource_type: string;
  format: string;
  bytes: number;
  folder: string;
  [key: string]: any;
}

// Document database record interface
export interface DocumentRecord {
  id: string;
  userId: string | null;
  filename: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  uploadPath: string;
  status: DocumentStatus;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Document response interface
export interface DocumentResponse {
  id: string;
  filename: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  status: DocumentStatus;
  uploadPath: string;
  metadata: Record<string, any>;
  userId?: string;
  createdAt: Date;
  isPublic: boolean;
}

// Document filters for listing
export interface DocumentFilters {
  userId?: string;
  status?: string;
  fileType?: string;
  page: number;
  limit: number;
}

// Pagination interface
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// List documents response
export interface ListDocumentsResponse {
  documents: DocumentResponse[];
  pagination: Pagination;
}

// Upload error interface
export interface UploadError {
  filename: string;
  error: string;
}

// Multiple upload summary
export interface UploadSummary {
  total: number;
  successful: number;
  failed: number;
}

// Multiple upload response
export interface MultipleUploadResponse {
  success: DocumentResponse[];
  errors: UploadError[];
  summary: UploadSummary;
}

// Delete document response
export interface DeleteDocumentResponse {
  success: boolean;
  message: string;
  status?: number;
}

// Service result wrapper
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

// Language mapping from Franc (ISO 639-3) codes to Tesseract.js language codes
export const LANGUAGE_MAPPING: Record<string, string> = {
  'eng': 'eng',     // English
  'vie': 'vie',     // Vietnamese
  'spa': 'spa',     // Spanish
  'fra': 'fra',     // French
  'deu': 'ger',     // German (Tesseract uses 'ger')
  'ita': 'ita',     // Italian
  'por': 'por',     // Portuguese
  'rus': 'rus',     // Russian
  'jpn': 'jpn',     // Japanese
  'kor': 'kor',     // Korean
  'cmn': 'chi_sim', // Chinese Simplified
  'ara': 'ara',     // Arabic
  'hin': 'hin',     // Hindi
  'tha': 'tha',     // Thai
  'nld': 'nld',     // Dutch
  'pol': 'pol',     // Polish
  'swe': 'swe',     // Swedish
  'dan': 'dan',     // Danish
  'nor': 'nor',     // Norwegian
  'fin': 'fin'      // Finnish
};

// Text extraction result interface
export interface TextExtractionResult {
  text: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    characterCount?: number;
    format?: string;
    warnings?: string[];
    frontMatter?: Record<string, any>;
    extractionMethod?: 'pdf-parse' | 'ocr' | 'hybrid' | 'text' | 'text-fallback';
    ocrProcessingTime?: number;
    ocrConfidence?: number;
    ocrLanguage?: string;
    detectedLanguage?: string;        // Language detected by ELD (ISO 639-1 code)
    languageConfidence?: number;      // ELD confidence score for detection
    usedLanguageDetection?: boolean;  // Boolean flag indicating if auto-detection was used
  };
}

// Route handler types
export type PublicUploadHandler = (req: Request, res: Response) => Promise<Response>;
export type PrivateUploadHandler = (req: AuthenticatedRequest, res: Response) => Promise<Response>;
export type GetUploadHandler = (req: Request, res: Response) => Promise<Response>;
export type ListUploadsHandler = (req: AuthenticatedRequest, res: Response) => Promise<Response>;
export type DeleteUploadHandler = (req: AuthenticatedRequest, res: Response) => Promise<Response>;

// Service method types
export interface UploadServiceMethods {
  handlePublicUpload: (
    file: UploadFile,
    metadata?: UploadMetadata
  ) => Promise<ServiceResult<DocumentResponse>>;
  
  handlePrivateUpload: (
    file: UploadFile,
    userId: string,
    metadata?: UploadMetadata
  ) => Promise<ServiceResult<DocumentResponse>>;
  
  getDocumentById: (documentId: string) => Promise<ServiceResult<DocumentResponse | null>>;
  
  listDocuments: (filters: DocumentFilters) => Promise<ServiceResult<ListDocumentsResponse>>;
  
  deleteDocument: (
    documentId: string,
    userId?: string
  ) => Promise<ServiceResult<DeleteDocumentResponse>>;
  
  handlePublicMultipleUpload: (
    files: UploadFile[],
    metadata?: UploadMetadata
  ) => Promise<ServiceResult<MultipleUploadResponse>>;
  
  handlePrivateMultipleUpload: (
    files: UploadFile[],
    userId: string,
    metadata?: UploadMetadata
  ) => Promise<ServiceResult<MultipleUploadResponse>>;

  // Text processing methods
  processDocumentText: (documentId: string) => Promise<ServiceResult<TextExtractionResult>>;
  
  updateDocumentWithText: (
    documentId: string,
    text: string,
    metadata: any
  ) => Promise<ServiceResult<boolean>>;
}

// Controller interface
export interface UploadController {
  uploadPublic: PublicUploadHandler;
  uploadPrivate: PrivateUploadHandler;
  uploadPublicMultiple: PublicUploadHandler;
  uploadPrivateMultiple: PrivateUploadHandler;
  getUploadById: GetUploadHandler;
  listUploads: ListUploadsHandler;
  deleteUpload: DeleteUploadHandler;
  processDocument: PrivateUploadHandler; // Process text extraction for existing document
}

// Request body interfaces
export interface UploadRequestBody {
  title?: string;
  description?: string;
  tags?: string[];
}

export interface ListUploadsQuery {
  page?: string;
  limit?: string;
  status?: string;
  fileType?: string;
}

export interface UploadParams {
  id: string;
} 