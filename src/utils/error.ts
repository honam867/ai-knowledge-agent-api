import { AppError } from '../types';

/**
 * Creates a custom application error
 * Pure function for error creation
 */
export const createAppError = (
  message: string,
  statusCode: number,
  isOperational: boolean = true
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = isOperational;
  return error;
};

/**
 * Creates a bad request error
 * Specialized error creation function
 */
export const createBadRequestError = (message: string = 'Bad Request'): AppError => {
  return createAppError(message, 400);
};

/**
 * Creates an unauthorized error
 * Specialized error creation function
 */
export const createUnauthorizedError = (message: string = 'Unauthorized'): AppError => {
  return createAppError(message, 401);
};

/**
 * Creates a forbidden error
 * Specialized error creation function
 */
export const createForbiddenError = (message: string = 'Forbidden'): AppError => {
  return createAppError(message, 403);
};

/**
 * Creates a not found error
 * Specialized error creation function
 */
export const createNotFoundError = (resource: string = 'Resource'): AppError => {
  return createAppError(`${resource} not found`, 404);
};

/**
 * Creates a conflict error
 * Specialized error creation function
 */
export const createConflictError = (message: string = 'Conflict'): AppError => {
  return createAppError(message, 409);
};

/**
 * Creates an internal server error
 * Specialized error creation function
 */
export const createInternalServerError = (message: string = 'Internal Server Error'): AppError => {
  return createAppError(message, 500, false);
};

/**
 * Checks if error is operational
 * Pure function for error classification
 */
export const isOperationalError = (error: Error): boolean => {
  return (error as AppError).isOperational === true;
};

/**
 * Extracts error message safely
 * Pure function for error message extraction
 */
export const getErrorMessage = (error: unknown): any => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return error.message || 'An unknown error occurred';
};

/**
 * Extracts error stack safely
 * Pure function for error stack extraction
 */
export const getErrorStack = (error: unknown): string | undefined => {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
};

/**
 * Creates a safe error object for logging
 * Pure function for error serialization
 */
export const createSafeErrorObject = (error: unknown) => ({
  message: getErrorMessage(error),
  stack: getErrorStack(error),
  statusCode: (error as AppError)?.statusCode,
  isOperational: (error as AppError)?.isOperational,
});

/**
 * Wraps async functions with error handling
 * Higher-order function for async error handling
 */
export const asyncErrorHandler = <T extends any[], R>(fn: (...args: T) => Promise<R>) => {
  return (...args: T): Promise<R> => {
    return fn(...args).catch(error => {
      throw isOperationalError(error) ? error : createInternalServerError(getErrorMessage(error));
    });
  };
};

/**
 * Creates a try-catch wrapper for async operations
 * Higher-order function for safe async execution
 */
export const safeAsync = <T>(
  asyncFn: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: AppError }> => {
  return asyncFn()
    .then(data => ({ success: true as const, data }))
    .catch(error => ({
      success: false as const,
      error: isOperationalError(error) ? error : createInternalServerError(getErrorMessage(error)),
    }));
};

/**
 * Creates error handling middleware
 * Function for Express error middleware creation
 */
export const createErrorHandler = () => {
  return (error: Error, req: any, res: any, next: any) => {
    const appError = error as AppError;
    const statusCode = appError.statusCode || 500;
    const message = appError.message || 'Internal Server Error';
    console.log('❤️ ~ return ~ message:', message);

    // Log error details
    const errorDetails = createSafeErrorObject(error);
    console.error('❓❌ Error Details:', errorDetails);

    // Send error response
    res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? errorDetails : null,
      timestamp: new Date().toISOString(),
    });
  };
};
