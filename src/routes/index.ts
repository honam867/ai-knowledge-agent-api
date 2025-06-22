import { Router } from 'express';
import { testingRoutes } from './testing.routes';
import { authRoutes } from './auth.routes';
import { healthCheckMiddleware } from '../middleware';

/**
 * Creates main API routes with functional composition
 * Pure function for route aggregation
 */
export const createAPIRoutes = (): Router => {
  const router = Router();

  // Global health check
  router.get('/health', healthCheckMiddleware);

  // API version info
  router.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Node.js API Template',
      data: {
        version: '1.0.0',
        name: 'nodejs-api-template',
        description:
          'Scalable Node.js API with Express, TypeScript, Supabase, Drizzle ORM, and AI integration',
        endpoints: {
          health: '/api/health',
          auth: '/api/auth',
          testing: '/api/testing',
          ai: '/api/ai',
        },
        documentation: 'https://github.com/your-repo/api-docs',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  });
  
  // Mount route modules
  router.use('/auth', authRoutes);
  router.use('/testing', testingRoutes);
  
  return router;
};

/**
 * Creates all application routes
 * Function for complete route setup
 */
export const createRoutes = (): Router => {
  const router = Router();

  // Mount API routes under /api prefix
  router.use('/api', createAPIRoutes());

  return router;
};

// Export configured routers
export const apiRoutes = createAPIRoutes();
export const appRoutes = createRoutes();
