import { Response } from 'express';
import { ApiResponse } from '../types';

/**
 * Creates a standardized API response object
 * Pure function for response formatting
 */
export const createApiResponse = <T>(
  success: boolean,
  message: string,
  data?: T,
  error?: string | null
): ApiResponse<T> => ({
  success,
  message,
  data,
  error,
  timestamp: new Date().toISOString(),
});

/**
 * Creates a success response
 * Specialized function for successful operations
 */
export const createSuccessResponse = <T>(
  message: string,
  data?: T
): ApiResponse<T> => createApiResponse(true, message, data);

/**
 * Creates an error response
 * Specialized function for error responses
 */
export const createErrorResponse = (
  message: string,
  error?: string
): ApiResponse => createApiResponse(false, message, undefined, error);

/**
 * Sends a standardized API response
 * Higher-order function for response sending
 */
export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  response: ApiResponse<T>
): Response => {
  return res.status(statusCode).json(response);
};

/**
 * Sends a success response
 * Composed function for successful responses
 */
export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): Response => {
  const response = createSuccessResponse(message, data);
  return sendResponse(res, statusCode, response);
};

/**
 * Sends an error response
 * Composed function for error responses
 */
export const sendError = (
  res: Response,
  message: string,
  error?: string,
  statusCode: number = 400
): Response => {
  const response = createErrorResponse(message, error);
  return sendResponse(res, statusCode, response);
};

/**
 * Sends a not found response
 * Specialized function for 404 errors
 */
export const sendNotFound = (
  res: Response,
  resource: string = 'Resource'
): Response => {
  return sendError(res, `${resource} not found`, undefined, 404);
};

/**
 * Sends an internal server error response
 * Specialized function for 500 errors
 */
export const sendInternalError = (
  res: Response,
  error?: string
): Response => {
  return sendError(res, 'Internal server error', error, 500);
};

/**
 * Sends an unauthorized response
 * Specialized function for 401 errors
 */
export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized'
): Response => {
  return sendError(res, message, undefined, 401);
};

/**
 * Sends a forbidden response
 * Specialized function for 403 errors
 */
export const sendForbidden = (
  res: Response,
  message: string = 'Forbidden'
): Response => {
  return sendError(res, message, undefined, 403);
}; 