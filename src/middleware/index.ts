import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { config } from '../config';
import { createRequestLogger } from '../utils/logger';
import { createErrorHandler } from '../utils/error';
import { sendError } from '../utils/response';
import { JWTPayload } from '../types';

/**
 * Creates CORS middleware configuration
 * Pure function for CORS setup
 */
export const createCorsOptions = (nodeEnv: string) => ({
  origin: nodeEnv === 'production' 
    ? ['https://yourdomain.com'] // Add your production domains
    : true, // Allow all origins in development
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});

/**
 * Creates rate limiting middleware
 * Function for rate limiter configuration
 */
export const createRateLimiter = (windowMs: number, maxRequests: number) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later',
      error: 'Rate limit exceeded',
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Creates security middleware
 * Function for helmet configuration
 */
export const createSecurityMiddleware = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });
};

/**
 * Creates request parsing middleware
 * Function for request body parsing
 */
export const createRequestParser = () => {
  const express = require('express');
  return [
    express.json({ limit: '100mb' }),
    express.urlencoded({ extended: true, limit: '100mb' }),
  ];
};

/**
 * Creates not found middleware
 * Function for 404 error handling
 */
export const createNotFoundMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    sendError(res, `Route ${req.originalUrl} not found`, undefined, 404);
  };
};

/**
 * Creates health check middleware
 * Function for health endpoint
 */
export const createHealthCheckMiddleware = () => {
  return (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Server is healthy',
      data: {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        version: process.env.npm_package_version || '1.0.0',
      },
      timestamp: new Date().toISOString(),
    });
  };
};

/**
 * Creates request ID middleware
 * Function for request tracking
 */
export const createRequestIdMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] || 
                     `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    req.headers['x-request-id'] = requestId as string;
    res.setHeader('X-Request-ID', requestId);
    
    next();
  };
};

/**
 * Creates API version middleware
 * Function for API versioning
 */
export const createApiVersionMiddleware = (version: string = 'v1') => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-API-Version', version);
    next();
  };
};

/**
 * Creates request timeout middleware
 * Function for request timeout handling
 */
export const createTimeoutMiddleware = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        sendError(res, 'Request timeout', undefined, 408);
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

/**
 * Creates JWT authentication middleware
 * Function for JWT token verification from cookies or headers
 */
export const createJwtAuthMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Try to get token from cookie first, then fallback to Authorization header
    let token = req.cookies?.auth_token;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : null;
    }

    if (!token) {
      return sendError(res, 'Access token is required', undefined, 401);
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      
      // Ensure the token has the expected payload structure
      if (!decoded.userId || !decoded.email) {
        return sendError(res, 'Invalid token payload', undefined, 401);
      }
      
      // Set user info on request object
      req.user = {
        id: decoded.userId,
        email: decoded.email,
      };
      
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return sendError(res, 'Invalid token', undefined, 401);
      }
      if (error instanceof jwt.TokenExpiredError) {
        return sendError(res, 'Token expired', undefined, 401);
      }
      return sendError(res, 'Authentication failed', undefined, 401);
    }
  };
};

/**
 * Creates optional JWT authentication middleware
 * Function for optional JWT token verification from cookies or headers (doesn't fail if no token)
 */
export const createOptionalJwtAuthMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Try to get token from cookie first, then fallback to Authorization header
    let token = req.cookies?.auth_token;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : null;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
        req.user = decoded;
      } catch (error) {
        // Token is invalid, but we don't fail - just continue without user
        req.user = undefined;
      }
    }

    next();
  };
};

/**
 * Creates cookie parser middleware
 * Function for cookie parsing configuration
 */
export const createCookieParserMiddleware = () => {
  return cookieParser();
};

/**
 * Applies all common middleware to express app
 * Function composition for middleware setup
 */
export const applyCommonMiddleware = (app: any) => {
  // Security middleware
  app.use(createSecurityMiddleware());
  
  // CORS middleware
  app.use(cors(createCorsOptions(config.nodeEnv)));
  
  // Rate limiting
  app.use(createRateLimiter(config.rateLimitWindowMs, config.rateLimitMaxRequests));
  
  // Request parsing
  app.use(...createRequestParser());
  
  // Cookie parsing
  app.use(createCookieParserMiddleware());
  
  // Request tracking
  app.use(createRequestIdMiddleware());
  
  // API versioning
  app.use(createApiVersionMiddleware());
  
  // Request timeout
  app.use(createTimeoutMiddleware());
  
  // Logging
  if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
  }
  app.use(createRequestLogger());
  
  return app;
};

/**
 * Applies error handling middleware to express app
 * Function for error middleware setup
 */
export const applyErrorMiddleware = (app: any) => {
  // 404 handler
  app.use(createNotFoundMiddleware());
  
  // Global error handler
  app.use(createErrorHandler());
  
  return app;
};

// Export individual middleware components
export const corsMiddleware = cors(createCorsOptions(config.nodeEnv));
export const rateLimitMiddleware = createRateLimiter(config.rateLimitWindowMs, config.rateLimitMaxRequests);
export const securityMiddleware = createSecurityMiddleware();
export const healthCheckMiddleware = createHealthCheckMiddleware();
export const jwtAuthMiddleware = createJwtAuthMiddleware();
export const optionalJwtAuthMiddleware = createOptionalJwtAuthMiddleware();
export const notFoundMiddleware = createNotFoundMiddleware();
export const errorHandlerMiddleware = createErrorHandler(); 