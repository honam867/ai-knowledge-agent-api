import { Router } from 'express';
import {
  registerController,
  loginController,
  refreshTokenController,
  logoutController,
  getCurrentUserController,
} from '@/controllers/auth.controller';
import { validateUserRegistration, validateUserLogin } from '@/utils/validation';
import { createJwtAuthMiddleware } from '@/middleware';

/**
 * Creates authentication routes with functional composition
 * Pure function for auth route configuration
 */
export const createAuthRoutes = (): Router => {
  const router = Router();

  // User registration
  router.post('/register', validateUserRegistration, registerController);

  // User login
  router.post('/login', validateUserLogin, loginController);

  // Token refresh
  router.post('/refresh', refreshTokenController);

  // User logout
  router.post('/logout', logoutController);

  // Get current user profile (requires authentication)
  router.get('/me', createJwtAuthMiddleware(), getCurrentUserController);

  return router;
};

// Export configured router
export const authRoutes = createAuthRoutes();
