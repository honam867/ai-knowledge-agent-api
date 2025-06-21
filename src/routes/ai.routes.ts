// import { Router } from 'express';
// import {
//   generateContentController,
//   generateSummaryController,
//   generateKeywordsController,
//   generateAnswerController,
//   generateEmailController,
//   generateBlogPostController,
//   generateProductDescriptionController,
//   batchGenerateController,
//   aiHealthController,
// } from '../controllers/ai.controller';
// import { validateAIPrompt } from '../utils/validation';

// /**
//  * Creates AI routes with functional composition
//  * Pure function for route configuration
//  */
// export const createAIRoutes = (): Router => {
//   const router = Router();

//   // Health check endpoint
//   router.get('/health', aiHealthController);

//   // Basic generation endpoint
//   router.post('/generate', validateAIPrompt, generateContentController);

//   // Specialized generation endpoints
//   router.post('/summary', generateSummaryController);
//   router.post('/keywords', generateKeywordsController);
//   router.post('/answer', generateAnswerController);

//   // Template-based generation endpoints
//   router.post('/email', generateEmailController);
//   router.post('/blog-post', generateBlogPostController);
//   router.post('/product-description', generateProductDescriptionController);

//   // Batch processing endpoint
//   router.post('/batch', batchGenerateController);

//   return router;
// };

// // Export configured router
// export const aiRoutes = createAIRoutes();
