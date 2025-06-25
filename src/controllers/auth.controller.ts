import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { logInfo, logError } from '../utils/logger';
import { LoginDTO, RegisterDTO, TypedRequest, GoogleOAuthDTO } from '../types';
import { asyncErrorHandler } from '../utils/error';
import {
  registerUser,
  loginUser,
  getUserById,
  updateUserLastLogin,
} from '../services/auth.service';
import { generateGoogleAuthUrl, completeGoogleOAuth } from '../services/google-oauth.service';

const clientUrl = process.env.CLIENT_URL;

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

      // Set auth token as HTTP-only cookie
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      // Set user data in a separate cookie (non-HTTP-only so frontend can read it)
      res.cookie(
        'user_data',
        JSON.stringify({
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          provider: result.user.provider,
          avatarUrl: result.user.avatarUrl,
          emailVerified: result.user.emailVerified,
        }),
        {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/',
        }
      );

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

      // Set auth token as HTTP-only cookie
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      // Set user data in a separate cookie (non-HTTP-only so frontend can read it)
      res.cookie(
        'user_data',
        JSON.stringify({
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          provider: result.user.provider,
          avatarUrl: result.user.avatarUrl,
          emailVerified: result.user.emailVerified,
        }),
        {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/',
        }
      );

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
    const userId = req.user?.id;

    if (userId) {
      logInfo('User logged out', { userId });
    }

    // Clear auth cookies
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.clearCookie('user_data', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return sendSuccess(res, 'Logout successful', {
      message: 'Cookies cleared successfully',
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

/**
 * Google OAuth redirect controller
 * Redirects user to Google OAuth consent screen
 */
export const googleOAuthController = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    logInfo('Initiating Google OAuth flow');

    try {
      const authUrl = generateGoogleAuthUrl();

      logInfo('Generated Google OAuth URL', { hasUrl: !!authUrl });

      // Redirect to Google OAuth consent screen
      return res.redirect(authUrl);
    } catch (error: any) {
      logError('Google OAuth initiation error', error);
      return sendError(res, 'Failed to initiate Google OAuth', undefined, 500);
    }
  }
);

/**
 * Google OAuth callback controller
 * Handles Google OAuth callback and completes authentication
 */
export const googleOAuthCallbackController = asyncErrorHandler(
  async (req: TypedRequest<GoogleOAuthDTO>, res: Response, next: NextFunction) => {
    const { code, error, state } = req.query;

    logInfo('Google OAuth callback received', {
      hasCode: !!code,
      hasError: !!error,
      state,
    });

    // Handle OAuth error
    if (error) {
      logError('Google OAuth error', { error, state });
      return res.redirect(`${clientUrl}/auth/signin?error=oauth_error`);
    }

    // Validate authorization code
    if (!code || typeof code !== 'string') {
      logError('Missing or invalid authorization code');
      return res.redirect(`${clientUrl}/auth/signin?error=invalid_code`);
    }

    try {
      // Complete OAuth flow
      const result = await completeGoogleOAuth(code);

      // Update last login timestamp
      await updateUserLastLogin(result.user.id);

      logInfo('Google OAuth completed successfully', {
        userId: result.user.id,
        email: result.user.email,
        isNewUser: result.isNewUser,
      });

      // Set auth token as HTTP-only cookie
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      // Set user data in a separate cookie (non-HTTP-only so frontend can read it)
      res.cookie(
        'user_data',
        JSON.stringify({
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          provider: result.user.provider,
          avatarUrl: result.user.avatarUrl,
          emailVerified: result.user.emailVerified,
        }),
        {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/',
        }
      );

      logInfo('Cookies set, redirecting to dashboard', {
        userId: result.user.id,
      });

      // Simple redirect to dashboard
      return res.redirect(`${clientUrl}/dashboard`);
    } catch (error: any) {
      logError('Google OAuth callback error', error);

      // Redirect to sign-in with error
      const errorMessage = error.statusCode === 400 ? 'invalid_request' : 'oauth_failed';
      return res.redirect(`${clientUrl}/auth/signin?error=${errorMessage}`);
    }
  }
);
