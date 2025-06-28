import { Router } from 'express';
// import { testingRoutes } from './testing.routes';
import { authRoutes } from './auth.routes';
import { uploadRoutes } from './upload.routes';
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
      message: 'AI Knowledge Agent API',
      data: {
        version: '1.0.0',
        name: 'ai-knowledge-agent-api',
        description:
          'Enterprise AI assistant with document upload, processing, and RAG-powered chat capabilities',
        endpoints: {
          health: '/api/health',
          auth: '/api/auth',
          // testing: '/api/testing',
          upload: '/api/upload',
        },
        documentation: 'https://github.com/your-repo/api-docs',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Mount route modules
  router.use('/auth', authRoutes);
  // router.use('/testing', testingRoutes);
  router.use('/upload', uploadRoutes);

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
