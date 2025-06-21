import { Router } from 'express';
import {
  createTestingController,
  getAllTestingController,
  getTestingByIdController,
  updateTestingController,
  deleteTestingController,
  getTestingStatsController,
  testingHealthController,
  bulkTestingController,
} from '../controllers/testing.controller';
import {
  validateTestingCreation,
  validateTestingUpdate,
  validateIdParam,
} from '../utils/validation';

/**
 * Creates testing routes with functional composition
 * Pure function for route configuration
 */
export const createTestingRoutes = (): Router => {
  const router = Router();

  // Health check endpoint
  router.get('/health', testingHealthController);

  // Statistics endpoint
  router.get('/stats', getTestingStatsController);

  // Bulk operations endpoint
  router.post('/bulk', bulkTestingController);

  // CRUD endpoints
  router
    .route('/')
    .get(getAllTestingController)
    .post(validateTestingCreation, createTestingController);

  router
    .route('/:id')
    .get(validateIdParam, getTestingByIdController)
    .put(validateIdParam, validateTestingUpdate, updateTestingController)
    .delete(validateIdParam, deleteTestingController);

  return router;
};

// Export configured router
export const testingRoutes = createTestingRoutes(); 