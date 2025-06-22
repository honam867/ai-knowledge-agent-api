import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { logInfo, logError } from '../utils/logger';
import { LoginDTO, RegisterDTO, TypedRequest } from '../types';
import { asyncErrorHandler } from '../utils/error';
import { 
  registerUser, 
  loginUser, 
  getUserById, 
  updateUserLastLogin 
} from '../services/auth.service';

/**
 * User registration controller
 * Creates a new user account with email and password
 */
export const registerController = asyncErrorHandler(
  async (req: TypedRequest<RegisterDTO>, res: Response, next: NextFunction) => {
    const { email, password, name } = req.body;

    logInfo('User registration attempt', { email, name });

    try {
      const result = await registerUser(email, password, name);

      logInfo('User registered successfully', { userId: result.user.id, email });

      return sendSuccess(
        res,
        'User registered successfully',
        {
          user: result.user,
          token: result.token,
        },
        201
      );
    } catch (error: any) {
      logError('Registration error', error);
      
      // Handle validation errors (like duplicate email)
      if (error.statusCode === 400) {
        return sendError(res, error.message, undefined, 400);
      }
      
      return sendError(res, 'Registration failed', undefined, 500);
    }
  }
);

/**
 * User login controller
 * Authenticates user with email and password
 */
export const loginController = asyncErrorHandler(
  async (req: TypedRequest<LoginDTO>, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    logInfo('User login attempt', { email });

    try {
      const result = await loginUser(email, password);

      // Update last login timestamp
      await updateUserLastLogin(result.user.id);

      logInfo('User logged in successfully', { userId: result.user.id, email });

      return sendSuccess(res, 'Login successful', {
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      logError('Login error', error);
      
      // Handle validation errors (like invalid credentials)
      if (error.statusCode === 400) {
        return sendError(res, error.message, undefined, 401);
      }
      
      return sendError(res, 'Login failed', undefined, 500);
    }
  }
);

/**
 * Token refresh controller
 * Simplified - no longer needed with long-lived tokens
 * Keeping for API compatibility but returns current token info
 */
export const refreshTokenController = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // With simplified approach, we don't need token refresh
    // This endpoint is kept for API compatibility
    return sendSuccess(res, 'Token refresh not needed with current implementation', {
      message: 'Tokens are long-lived (7 days). Re-login when expired.',
    });
  }
);

/**
 * Logout controller
 * Logs out user (client-side token removal)
 */
export const logoutController = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // In a JWT-based system, logout is typically handled client-side
    // by removing the tokens from storage
    const userId = req.user?.id;

    if (userId) {
      logInfo('User logged out', { userId });
    }

    return sendSuccess(res, 'Logout successful', {
      message: 'Please remove token from client storage',
    });
  }
);

/**
 * Get current user profile controller
 * Returns current authenticated user's profile
 */
export const getCurrentUserController = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 'User not authenticated', undefined, 401);
    }

    try {
      const user = await getUserById(userId);

      return sendSuccess(res, 'User profile retrieved successfully', user);
    } catch (error: any) {
      logError('Get current user error', error);
      
      if (error.statusCode === 404) {
        return sendError(res, 'User not found', undefined, 404);
      }
      
      return sendError(res, 'Failed to retrieve user profile', undefined, 500);
    }
  }
);
