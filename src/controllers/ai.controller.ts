// import { Request, Response, NextFunction } from 'express';
// import {
//   generateWithGemini,
//   generateSummary,
//   generateKeywords,
//   generateAnswer,
//   emailGenerator,
//   blogPostGenerator,
//   productDescriptionGenerator,
//   batchGenerate,
// } from '../services/ai.service';
// import { sendSuccess, sendError } from '../utils/response';
// import { logInfo } from '../utils/logger';
// import { AIPromptRequest, TypedRequest } from '../types';
// import { asyncErrorHandler } from '../utils/error';

// /**
//  * Generates AI content from prompt
//  * Controller function for basic AI generation
//  */
// export const generateContentController = asyncErrorHandler(
//   async (req: TypedRequest<AIPromptRequest>, res: Response, next: NextFunction) => {
//     logInfo('Generating AI content', {
//       promptLength: req.body.prompt?.length,
//       hasContext: !!req.body.context,
//     });
    
//     const result = await generateWithGemini(req.body);
    
//     return sendSuccess(
//       res,
//       'AI content generated successfully',
//       result
//     );
//   }
// );

// /**
//  * Generates a summary from text
//  * Controller function for text summarization
//  */
// export const generateSummaryController = asyncErrorHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { text, maxLength = 500 } = req.body;
    
//     if (!text || typeof text !== 'string') {
//       return sendError(res, 'Text is required for summarization', undefined, 400);
//     }
    
//     logInfo('Generating summary', {
//       textLength: text.length,
//       maxLength,
//     });
    
//     const result = await generateSummary(text, maxLength);
    
//     return sendSuccess(
//       res,
//       'Summary generated successfully',
//       result
//     );
//   }
// );

// /**
//  * Extracts keywords from text
//  * Controller function for keyword extraction
//  */
// export const generateKeywordsController = asyncErrorHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { text, maxKeywords = 10 } = req.body;
    
//     if (!text || typeof text !== 'string') {
//       return sendError(res, 'Text is required for keyword extraction', undefined, 400);
//     }
    
//     logInfo('Generating keywords', {
//       textLength: text.length,
//       maxKeywords,
//     });
    
//     const result = await generateKeywords(text, maxKeywords);
    
//     return sendSuccess(
//       res,
//       'Keywords generated successfully',
//       result
//     );
//   }
// );

// /**
//  * Generates an answer to a question
//  * Controller function for Q&A
//  */
// export const generateAnswerController = asyncErrorHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { question, context, temperature = 0.7 } = req.body;
    
//     if (!question || typeof question !== 'string') {
//       return sendError(res, 'Question is required', undefined, 400);
//     }
    
//     logInfo('Generating answer', {
//       questionLength: question.length,
//       hasContext: !!context,
//       temperature,
//     });
    
//     const result = await generateAnswer(question, context, temperature);
    
//     return sendSuccess(
//       res,
//       'Answer generated successfully',
//       result
//     );
//   }
// );

// /**
//  * Generates email content from template
//  * Controller function for email generation
//  */
// export const generateEmailController = asyncErrorHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { subject, recipient, purpose, tone, context } = req.body;
    
//     const requiredFields = { subject, recipient, purpose, tone };
//     const missingFields = Object.entries(requiredFields)
//       .filter(([_, value]) => !value)
//       .map(([key, _]) => key);
    
//     if (missingFields.length > 0) {
//       return sendError(
//         res,
//         `Missing required fields: ${missingFields.join(', ')}`,
//         undefined,
//         400
//       );
//     }
    
//     logInfo('Generating email', { subject, recipient, purpose, tone });
    
//     const result = await emailGenerator({
//       subject,
//       recipient,
//       purpose,
//       tone,
//       context: context || '',
//     });
    
//     return sendSuccess(
//       res,
//       'Email generated successfully',
//       result
//     );
//   }
// );

// /**
//  * Generates blog post content from template
//  * Controller function for blog post generation
//  */
// export const generateBlogPostController = asyncErrorHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { topic, audience, tone, wordCount, keyPoints } = req.body;
    
//     const requiredFields = { topic, audience, tone };
//     const missingFields = Object.entries(requiredFields)
//       .filter(([_, value]) => !value)
//       .map(([key, _]) => key);
    
//     if (missingFields.length > 0) {
//       return sendError(
//         res,
//         `Missing required fields: ${missingFields.join(', ')}`,
//         undefined,
//         400
//       );
//     }
    
//     logInfo('Generating blog post', { topic, audience, tone, wordCount });
    
//     const result = await blogPostGenerator({
//       topic,
//       audience,
//       tone,
//       wordCount: wordCount || '800',
//       keyPoints: keyPoints || '',
//     });
    
//     return sendSuccess(
//       res,
//       'Blog post generated successfully',
//       result
//     );
//   }
// );

// /**
//  * Generates product description from template
//  * Controller function for product description generation
//  */
// export const generateProductDescriptionController = asyncErrorHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { productName, category, features, audience, tone } = req.body;
    
//     const requiredFields = { productName, category, features, audience, tone };
//     const missingFields = Object.entries(requiredFields)
//       .filter(([_, value]) => !value)
//       .map(([key, _]) => key);
    
//     if (missingFields.length > 0) {
//       return sendError(
//         res,
//         `Missing required fields: ${missingFields.join(', ')}`,
//         undefined,
//         400
//       );
//     }
    
//     logInfo('Generating product description', { productName, category, tone });
    
//     const result = await productDescriptionGenerator({
//       productName,
//       category,
//       features,
//       audience,
//       tone,
//     });
    
//     return sendSuccess(
//       res,
//       'Product description generated successfully',
//       result
//     );
//   }
// );

// /**
//  * Processes multiple AI requests in batch
//  * Controller function for batch AI processing
//  */
// export const batchGenerateController = asyncErrorHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { requests, maxConcurrency = 3 } = req.body;
    
//     if (!Array.isArray(requests) || requests.length === 0) {
//       return sendError(res, 'Requests array is required and cannot be empty', undefined, 400);
//     }
    
//     if (requests.length > 10) {
//       return sendError(res, 'Maximum 10 requests allowed per batch', undefined, 400);
//     }
    
//     logInfo('Processing batch AI requests', {
//       requestCount: requests.length,
//       maxConcurrency,
//     });
    
//     const results = await batchGenerate(requests, maxConcurrency);
    
//     return sendSuccess(
//       res,
//       'Batch AI requests processed successfully',
//       {
//         results,
//         processed: results.length,
//         requested: requests.length,
//       }
//     );
//   }
// );

// /**
//  * Health check for AI endpoints
//  * Controller function for AI service health check
//  */
// export const aiHealthController = asyncErrorHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     // Test basic AI functionality
//     const testPrompt = 'Say "AI service is working" in exactly those words.';
    
//     try {
//       const result = await generateWithGemini({
//         prompt: testPrompt,
//         temperature: 0,
//         maxTokens: 20,
//       });
      
//       const isWorking = result.content.toLowerCase().includes('ai service is working');
      
//       return sendSuccess(
//         res,
//         'AI service health check completed',
//         {
//           status: isWorking ? 'healthy' : 'degraded',
//           model: 'gemini-pro',
//           responseTime: Date.now(),
//           testPassed: isWorking,
//         }
//       );
//     } catch (error) {
//       return sendSuccess(
//         res,
//         'AI service health check completed',
//         {
//           status: 'unhealthy',
//           model: 'gemini-pro',
//           error: 'Service unavailable',
//         }
//       );
//     }
//   }
// ); 