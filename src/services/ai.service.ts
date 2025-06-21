// import { GoogleGenerativeAI } from '@google/generative-ai';
// import { config } from '../config';
// import { AIPromptRequest, AIResponse } from '../types';
// import { createInternalServerError, createBadRequestError } from '../utils/error';
// import { logInfo, logError } from '../utils/logger';

// /**
//  * Creates Google Gemini AI client
//  * Pure function for AI client creation
//  */
// export const createGeminiClient = (apiKey: string) => {
//   if (!apiKey) {
//     throw createBadRequestError('Google API key is required');
//   }
//   return new GoogleGenerativeAI(apiKey);
// };

// /**
//  * Creates Gemini model instance
//  * Pure function for model configuration
//  */
// export const createGeminiModel = (client: GoogleGenerativeAI, modelName: string = 'gemini-pro') => {
//   return client.getGenerativeModel({ model: modelName });
// };

// /**
//  * Formats prompt with context
//  * Pure function for prompt formatting
//  */
// export const formatPrompt = (prompt: string, context?: string): string => {
//   if (!context) {
//     return prompt;
//   }

//   return `Context: ${context}\n\nPrompt: ${prompt}`;
// };

// /**
//  * Validates AI request parameters
//  * Pure function for parameter validation
//  */
// export const validateAIRequest = (request: AIPromptRequest): void => {
//   if (!request.prompt?.trim()) {
//     throw createBadRequestError('Prompt is required and cannot be empty');
//   }

//   if (request.prompt.length > 5000) {
//     throw createBadRequestError('Prompt must not exceed 5000 characters');
//   }

//   if (request.context && request.context.length > 2000) {
//     throw createBadRequestError('Context must not exceed 2000 characters');
//   }

//   if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
//     throw createBadRequestError('Temperature must be between 0 and 2');
//   }

//   if (request.maxTokens !== undefined && (request.maxTokens < 1 || request.maxTokens > 4000)) {
//     throw createBadRequestError('Max tokens must be between 1 and 4000');
//   }
// };

// /**
//  * Generates content using Gemini AI
//  * Pure function for AI content generation
//  */
// export const generateWithGemini = async (request: AIPromptRequest): Promise<AIResponse> => {
//   try {
//     validateAIRequest(request);

//     const client = createGeminiClient(config.googleApiKey);
//     const model = createGeminiModel(client);

//     const formattedPrompt = formatPrompt(request.prompt, request.context);

//     logInfo('AI Request', {
//       promptLength: request.prompt.length,
//       hasContext: !!request.context,
//       temperature: request.temperature,
//       maxTokens: request.maxTokens,
//     });

//     const result = await model.generateContent(formattedPrompt);
//     const response = await result.response;
//     const content = response.text();

//     if (!content) {
//       throw createInternalServerError('AI model returned empty response');
//     }

//     logInfo('AI Response', {
//       responseLength: content.length,
//       model: 'gemini-pro',
//     });

//     return {
//       content,
//       usage: {
//         promptTokens: Math.ceil(formattedPrompt.length / 4), // Rough estimation
//         completionTokens: Math.ceil(content.length / 4),
//         totalTokens: Math.ceil((formattedPrompt.length + content.length) / 4),
//       },
//     };
//   } catch (error) {
//     logError('AI Generation Failed', { error, request });
    
//     // Handle specific API errors
//     if (error instanceof Error) {
//       if (error.message.includes('API key')) {
//         throw createBadRequestError('Invalid or missing API key');
//       }
//       if (error.message.includes('quota')) {
//         throw createInternalServerError('API quota exceeded');
//       }
//       if (error.message.includes('rate limit')) {
//         throw createInternalServerError('Rate limit exceeded, please try again later');
//       }
//       if (error.message.includes('Bad Request')) {
//         throw error; // Re-throw validation errors
//       }
//     }
    
//     throw createInternalServerError('Failed to generate AI response');
//   }
// };

// /**
//  * Generates a summary using AI
//  * Specialized function for text summarization
//  */
// export const generateSummary = async (text: string, maxLength: number = 500): Promise<AIResponse> => {
//   try {
//     const prompt = `Please provide a concise summary of the following text in no more than ${maxLength} characters:\n\n${text}`;

//     return await generateWithGemini({
//       prompt,
//       temperature: 0.3,
//       maxTokens: Math.ceil(maxLength / 4),
//     });
//   } catch (error) {
//     logError('Summary generation failed', { error, textLength: text.length, maxLength });
//     throw createInternalServerError('Failed to generate summary');
//   }
// };

// /**
//  * Generates keywords from text using AI
//  * Specialized function for keyword extraction
//  */
// export const generateKeywords = async (text: string, maxKeywords: number = 10): Promise<AIResponse> => {
//   try {
//     const prompt = `Extract up to ${maxKeywords} relevant keywords from the following text. Return them as a comma-separated list:\n\n${text}`;

//     return await generateWithGemini({
//       prompt,
//       temperature: 0.2,
//       maxTokens: 200,
//     });
//   } catch (error) {
//     logError('Keyword generation failed', { error, textLength: text.length, maxKeywords });
//     throw createInternalServerError('Failed to generate keywords');
//   }
// };

// /**
//  * Generates a response to a question using AI
//  * Specialized function for Q&A
//  */
// export const generateAnswer = async (
//   question: string,
//   context?: string,
//   temperature: number = 0.7
// ): Promise<AIResponse> => {
//   try {
//     return await generateWithGemini({
//       prompt: question,
//       context,
//       temperature,
//       maxTokens: 1000,
//     });
//   } catch (error) {
//     logError('Answer generation failed', { error, question, hasContext: !!context });
//     throw createInternalServerError('Failed to generate answer');
//   }
// };

// /**
//  * Generates content based on a template
//  * Higher-order function for template-based generation
//  */
// export const generateFromTemplate = (template: string) => {
//   return async (variables: Record<string, string>): Promise<AIResponse> => {
//     try {
//       let prompt = template;

//       // Replace template variables
//       Object.entries(variables).forEach(([key, value]) => {
//         prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
//       });

//       return await generateWithGemini({
//         prompt,
//         temperature: 0.5,
//       });
//     } catch (error) {
//       logError('Template generation failed', { error, template, variables });
//       throw createInternalServerError('Failed to generate content from template');
//     }
//   };
// };

// /**
//  * Common templates for content generation
//  * Pre-defined templates for common use cases
//  */
// export const createCommonTemplates = () => ({
//   email: generateFromTemplate(`
//     Write a professional email with the following details:

//     Subject: {{subject}}
//     Recipient: {{recipient}}
//     Purpose: {{purpose}}
//     Tone: {{tone}}

//     Additional context: {{context}}

//     Please write a complete email including greeting and closing.
//   `),

//   blogPost: generateFromTemplate(`
//     Write a blog post about {{topic}} with the following requirements:

//     Target audience: {{audience}}
//     Tone: {{tone}}
//     Word count: {{wordCount}}
//     Key points to cover: {{keyPoints}}

//     Please include an engaging title, introduction, main content, and conclusion.
//   `),

//   socialMedia: generateFromTemplate(`
//     Create a {{platform}} post about {{topic}} with the following requirements:

//     Tone: {{tone}}
//     Include hashtags: {{includeHashtags}}
//     Call to action: {{callToAction}}
//     Character limit: {{characterLimit}}

//     Make it engaging and platform-appropriate.
//   `),
// });
