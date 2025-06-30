import { Request, Response } from 'express';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string | null;
  timestamp: string;
}

// Express Request/Response Types
export interface TypedRequest<T = any> extends Request {
  body: T;
  user?: JWTPayload;
}

export interface TypedResponse<T = any> extends Response {
  json: (body: ApiResponse<T>) => this;
}

// Testing Entity Types
export interface TestingEntity {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTestingDTO {
  name: string;
  description?: string;
  status?: 'active' | 'inactive' | 'pending';
}

export interface UpdateTestingDTO {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'pending';
}

// Authentication Types
export interface JWTPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
}

// Google OAuth Types
export interface GoogleOAuthDTO {
  code: string;
  state?: string;
}

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

// AI Service Types
export interface AIPromptRequest {
  prompt: string;
  context?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Database Types
export interface DatabaseConfig {
  url: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

// Environment Types
export interface EnvConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  jwtSecret: string;
  jwtExpiresIn: string;
  database: DatabaseConfig;
  googleApiKey: string;
  googleOAuth: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    uploadPreset?: string;
  };
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  logLevel: string;
  clientUrl: string;
  ocrApiUrl: string;
  ocrApiTimeout: number;
}

// Utility Types
export type AsyncFunction<T = any, R = any> = (...args: T[]) => Promise<R>;
export type SyncFunction<T = any, R = any> = (...args: T[]) => R;

// Error Types
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export interface LogContext {
  timestamp?: string;
  level?: LogLevel;
  message?: string;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

// Re-export upload types
export * from './upload';
