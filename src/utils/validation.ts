import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { sendError } from './response';
import { ValidationError } from '../types';

/**
 * Creates a Joi validation schema for testing entity
 * Pure function for schema definition
 */
export const createTestingValidationSchema = () => ({
  create: Joi.object({
    name: Joi.string().min(1).max(255).required().messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 1 character long',
      'string.max': 'Name must not exceed 255 characters',
    }),
    description: Joi.string().optional().allow(''),
    status: Joi.string().valid('active', 'inactive', 'pending').optional(),
  }),
  update: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().optional().allow(''),
    status: Joi.string().valid('active', 'inactive', 'pending').optional(),
  }).min(1),
});

/**
 * Creates a Joi validation schema for authentication
 * Pure function for auth schema definition
 */
export const createAuthValidationSchema = () => ({
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required',
    }),
  }),
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(1).max(255).required(),
  }),
});

/**
 * Creates a Joi validation schema for AI requests
 * Pure function for AI schema definition
 */
export const createAIValidationSchema = () => ({
  prompt: Joi.object({
    prompt: Joi.string().min(1).max(5000).required().messages({
      'string.empty': 'Prompt is required',
      'string.max': 'Prompt must not exceed 5000 characters',
    }),
    context: Joi.string().max(2000).optional(),
    temperature: Joi.number().min(0).max(2).optional(),
    maxTokens: Joi.number().min(1).max(4000).optional(),
  }),
});

/**
 * Transforms Joi validation errors to custom format
 * Pure function for error transformation
 */
export const transformValidationErrors = (error: Joi.ValidationError): ValidationError[] => {
  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value,
  }));
};

/**
 * Validates data against a Joi schema
 * Pure function for validation logic
 */
export const validateData = <T>(
  data: any,
  schema: Joi.ObjectSchema<T>
): { isValid: boolean; data?: T; errors?: ValidationError[] } => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: transformValidationErrors(error),
    };
  }
  
  return {
    isValid: true,
    data: value,
  };
};

/**
 * Creates a validation middleware function
 * Higher-order function for request validation
 */
export const createValidationMiddleware = <T>(
  schema: Joi.ObjectSchema<T>,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const dataToValidate = req[source];
    const validation = validateData(dataToValidate, schema);
    
    if (!validation.isValid) {
      const errorMessage = validation.errors?.map(err => err.message).join(', ') || 'Validation failed';
      return sendError(res, errorMessage, JSON.stringify(validation.errors), 400);
    }
    
    // Replace the original data with validated data
    req[source] = validation.data;
    next();
  };
};

/**
 * Creates validation middleware for testing entity creation
 * Specialized validation function
 */
export const validateTestingCreation = createValidationMiddleware(
  createTestingValidationSchema().create
);

/**
 * Creates validation middleware for testing entity update
 * Specialized validation function
 */
export const validateTestingUpdate = createValidationMiddleware(
  createTestingValidationSchema().update
);

/**
 * Creates validation middleware for user login
 * Specialized validation function
 */
export const validateUserLogin = createValidationMiddleware(
  createAuthValidationSchema().login
);

/**
 * Creates validation middleware for user registration
 * Specialized validation function
 */
export const validateUserRegistration = createValidationMiddleware(
  createAuthValidationSchema().register
);

/**
 * Creates validation middleware for AI prompts
 * Specialized validation function
 */
export const validateAIPrompt = createValidationMiddleware(
  createAIValidationSchema().prompt
);

/**
 * Validates UUID format
 * Pure function for UUID validation
 */
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Creates UUID validation middleware
 * Higher-order function for UUID parameter validation
 */
export const createUUIDValidationMiddleware = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    
    if (!id || !isValidUUID(id)) {
      return sendError(res, `Invalid ${paramName} format`, undefined, 400);
    }
    
    next();
  };
};

// Export commonly used UUID validation middleware
export const validateIdParam = createUUIDValidationMiddleware('id'); 