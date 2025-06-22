import { Request, Response, NextFunction } from 'express';
import {
  createTesting,
  getAllTesting,
  getTestingById,
  updateTestingById,
  deleteTestingById,
  getTestingStats,
} from '@/services/testing.service';
import { sendSuccess, sendError } from '@/utils/response';
import { logInfo } from '@/utils/logger';
import { CreateTestingDTO, UpdateTestingDTO, TypedRequest } from '@/types';
import { asyncErrorHandler } from '@/utils/error';

/**
 * Creates a new testing record
 * Controller function for testing creation
 */
export const createTestingController = asyncErrorHandler(
  async (req: TypedRequest<CreateTestingDTO>, res: Response, next: NextFunction) => {
    logInfo('Creating new testing record', { body: req.body });
    
    const result = await createTesting(req.body);
    
    return sendSuccess(
      res,
      'Testing record created successfully',
      result,
      201
    );
  }
);

/**
 * Retrieves all testing records with filtering and pagination
 * Controller function for testing listing
 */
export const getAllTestingController = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      page = '1',
      limit = '10',
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;
    
    logInfo('Retrieving testing records', {
      page: pageNum,
      limit: limitNum,
      status,
      search,
      sortBy,
      sortOrder,
    });
    
    const result = await getAllTesting({
      limit: limitNum,
      offset,
      status: status as string,
      search: search as string,
      sortBy: sortBy as 'name' | 'createdAt' | 'updatedAt',
      sortOrder: sortOrder as 'asc' | 'desc',
    });
    
    const responseData = {
      ...result,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        pages: Math.ceil(result.total / limitNum),
      },
    };
    
    return sendSuccess(
      res,
      'Testing records retrieved successfully',
      responseData
    );
  }
);

/**
 * Retrieves a single testing record by ID
 * Controller function for testing retrieval
 */
export const getTestingByIdController = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    
    logInfo('Retrieving testing record by ID', { id });
    
    const result = await getTestingById(id);
    
    return sendSuccess(
      res,
      'Testing record retrieved successfully',
      result
    );
  }
);

/**
 * Updates a testing record by ID
 * Controller function for testing update
 */
export const updateTestingController = asyncErrorHandler(
  async (req: TypedRequest<UpdateTestingDTO>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    
    logInfo('Updating testing record', { id, body: req.body });
    
    const result = await updateTestingById(id, req.body);
    
    return sendSuccess(
      res,
      'Testing record updated successfully',
      result
    );
  }
);

/**
 * Deletes a testing record by ID
 * Controller function for testing deletion
 */
export const deleteTestingController = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    
    logInfo('Deleting testing record', { id });
    
    await deleteTestingById(id);
    
    return sendSuccess(
      res,
      'Testing record deleted successfully',
      { id }
    );
  }
);

/**
 * Retrieves testing statistics
 * Controller function for testing analytics
 */
export const getTestingStatsController = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    logInfo('Retrieving testing statistics');
    
    const result = await getTestingStats();
    
    return sendSuccess(
      res,
      'Testing statistics retrieved successfully',
      result
    );
  }
);

/**
 * Health check for testing endpoints
 * Controller function for testing health check
 */
export const testingHealthController = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const stats = await getTestingStats();
    
    return sendSuccess(
      res,
      'Testing service is healthy',
      {
        status: 'healthy',
        totalRecords: stats.total,
        timestamp: new Date().toISOString(),
      }
    );
  }
);

/**
 * Bulk operations controller
 * Controller function for bulk testing operations
 */
export const bulkTestingController = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { action, ids, data } = req.body;
    
    logInfo('Performing bulk testing operation', { action, idsCount: ids?.length });
    
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return sendError(res, 'Invalid bulk operation request', undefined, 400);
    }
    
    // For now, only implement status update
    if (action === 'updateStatus' && data?.status) {
      const results = await Promise.all(
        ids.map(id => updateTestingById(id, { status: data.status }))
      );
      
      return sendSuccess(
        res,
        `Successfully updated ${results.length} testing records`,
        { updated: results.length, ids }
      );
    }
    
    return sendError(res, 'Unsupported bulk operation', undefined, 400);
  }
); 
 