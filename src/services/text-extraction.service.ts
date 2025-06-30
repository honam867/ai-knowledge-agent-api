import { safeAsync } from '@/utils/error';
import { logInfo, logError } from '@/utils/logger';
import { ServiceResult, UploadFile, TextExtractionResult } from '@/types/upload';
import _, { isEmpty, get } from 'lodash';
// import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import matter from 'gray-matter';
import axios from 'axios';
import FormData from 'form-data';
import {
  fetchFileContent,
  calculateTextMetadata,
  // isTextContentSufficient,
  // convertPDFPagesToImages,
  // performOCROnImages,
} from '@/utils/text-extraction-utils';
import { getConfig } from '@/config';

const { ocrApiUrl, ocrApiTimeout } = getConfig();

// Service methods interface
export interface TextExtractionServiceMethods {
  extractTextFromPDF: (buffer: Buffer) => Promise<ServiceResult<TextExtractionResult>>;
  extractTextFromDOCX: (filePath: string) => Promise<ServiceResult<TextExtractionResult>>;
  extractTextFromMarkdown: (content: string) => Promise<ServiceResult<TextExtractionResult>>;
  extractTextFromTXT: (content: string) => Promise<ServiceResult<TextExtractionResult>>;
  extractText: (file: UploadFile) => Promise<ServiceResult<TextExtractionResult>>;
}

export const textExtractionService: TextExtractionServiceMethods = {
  /**
   * Extract text from PDF buffer using external OCR API service
   */
  extractTextFromPDF: async (buffer: Buffer): Promise<ServiceResult<TextExtractionResult>> => {
    return safeAsync(async () => {
      logInfo('Starting PDF text extraction using external OCR API', { bufferSize: buffer.length });

      if (isEmpty(buffer) || buffer.length === 0) {
        throw new Error('PDF buffer is empty');
      }

      const startTime = Date.now();

      try {
        // Prepare form data for external OCR API
        const formData = new FormData();
        formData.append('file', buffer, {
          filename: 'document.pdf',
          contentType: 'application/pdf',
        });
        formData.append('language', 'en'); // Default to English

        // Call external OCR API
        const response = await axios.post(ocrApiUrl, formData, {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: ocrApiTimeout,
        });

        const apiProcessingTime = Date.now() - startTime;

        if (!_.get(response, 'data.success')) {
          throw new Error(`OCR API failed: ${_.get(response, 'data.message') || 'Unknown error'}`);
        }

        const ocrData = _.get(response, 'data.data');
        const extractedText = _.get(ocrData, 'extracted_text') || '';

        const result: TextExtractionResult = {
          text: extractedText,
          metadata: calculateTextMetadata(extractedText, {
            pageCount: _.get(ocrData, 'metrics.page_count') || 1,
            format: 'pdf',
            extractionMethod: 'external-ocr-api',
            ocrProcessingTime: _.get(ocrData, 'metrics.execution_time_seconds') || 0,
            ocrLanguage: _.get(ocrData, 'language') || 'en',
            apiResponseTime: apiProcessingTime,
            ocrConfidence: undefined, // Not provided by this API
          }),
        };

        logInfo('PDF text extraction completed using external OCR API', {
          textLength: result.text.length,
          pageCount: _.get(ocrData, 'metrics.page_count') || 1,
          wordCount: result.metadata?.wordCount,
          ocrProcessingTime: _.get(ocrData, 'metrics.execution_time_seconds'),
          apiResponseTime: apiProcessingTime,
        });

        return result;
      } catch (error) {
        const apiProcessingTime = Date.now() - startTime;

        logError('External OCR API failed, returning empty result', {
          error: error instanceof Error ? error.message : String(error),
          apiResponseTime: apiProcessingTime,
        });

        // Graceful fallback: return empty result on failure
        return {
          text: '',
          metadata: {
            format: 'pdf',
            wordCount: 0,
            characterCount: 0,
            extractionMethod: 'external-ocr-api',
            apiResponseTime: apiProcessingTime,
            warnings: [
              `External OCR API failed: ${error instanceof Error ? error.message : String(error)}`,
            ],
          },
        };
      }
    });
  },

  // /**
  //  * Extract text from PDF buffer using pdf-parse with OCR fallback
  //  * COMMENTED OUT: Replaced with external OCR API integration
  //  */
  // extractTextFromPDF_LEGACY: async (buffer: Buffer): Promise<ServiceResult<TextExtractionResult>> => {
  //   return safeAsync(async () => {
  //     logInfo('Starting PDF text extraction with OCR fallback', { bufferSize: buffer.length });

  //     if (isEmpty(buffer) || buffer.length === 0) {
  //       throw new Error('PDF buffer is empty');
  //     }

  //     // First attempt: Standard PDF text extraction
  //     let pdfData;
  //     try {
  //       pdfData = await pdfParse(buffer);
  //       logInfo('PDF parsing completed', {
  //         textLength: pdfData.text?.length || 0,
  //         pageCount: pdfData.numpages,
  //       });
  //     } catch (parseError) {
  //       logError('PDF parsing failed, falling back to OCR', { error: parseError });
  //       // If PDF parsing fails completely, go straight to OCR
  //       return await textExtractionService.extractTextFromPDFWithOCR(buffer);
  //     }

  //     const extractedText = pdfData.text || '';
  //     const isTextSufficient = isTextContentSufficient(extractedText);

  //     logInfo('Assessing PDF text quality', {
  //       textLength: extractedText.length,
  //       isTextSufficient,
  //       pageCount: pdfData.numpages,
  //     });

  //     // If text is sufficient, return the pdf-parse result
  //     if (isTextSufficient) {
  //       const result: TextExtractionResult = {
  //         text: extractedText,
  //         metadata: calculateTextMetadata(extractedText, {
  //           pageCount: pdfData.numpages,
  //           format: 'pdf',
  //           extractionMethod: 'pdf-parse',
  //         }),
  //       };

  //       logInfo('PDF text extraction completed using pdf-parse', {
  //         textLength: result.text.length,
  //         pageCount: pdfData.numpages,
  //         wordCount: result.metadata?.wordCount,
  //       });

  //       return result;
  //     }

  //     // If text is insufficient, fall back to OCR
  //     logInfo('PDF text insufficient, falling back to OCR', {
  //       extractedTextLength: extractedText.length,
  //       pageCount: pdfData.numpages,
  //     });

  //     const ocrResult = await textExtractionService.extractTextFromPDFWithOCR(buffer);

  //     if (!ocrResult.success || !ocrResult.data) {
  //       // If OCR fails, return the original pdf-parse result with warning
  //       logError('OCR fallback failed, returning pdf-parse result');
  //       return {
  //         text: extractedText,
  //         metadata: calculateTextMetadata(extractedText, {
  //           pageCount: pdfData.numpages,
  //           format: 'pdf',
  //           extractionMethod: 'pdf-parse',
  //           warnings: ['OCR fallback failed, text may be incomplete'],
  //         }),
  //       };
  //     }

  //     // If OCR succeeds, combine results or use the better one
  //     const ocrText = ocrResult.data.text;
  //     const shouldUseOCR = ocrText.length > extractedText.length * 2; // OCR text is significantly longer

  //     if (shouldUseOCR) {
  //       // Use OCR result
  //       logInfo('Using OCR result as primary text');
  //       return {
  //         text: ocrText,
  //         metadata: {
  //           ...ocrResult.data.metadata,
  //           pageCount: pdfData.numpages,
  //           extractionMethod: 'ocr',
  //         },
  //       };
  //     } else {
  //       // Combine both results
  //       logInfo('Combining pdf-parse and OCR results');
  //       const combinedText = extractedText + '\n\n--- OCR Supplement ---\n' + ocrText;
  //       return {
  //         text: combinedText,
  //         metadata: calculateTextMetadata(combinedText, {
  //           pageCount: pdfData.numpages,
  //           format: 'pdf',
  //           extractionMethod: 'hybrid',
  //           ocrProcessingTime: ocrResult.data.metadata?.ocrProcessingTime,
  //           ocrConfidence: ocrResult.data.metadata?.ocrConfidence,
  //           ocrLanguage: ocrResult.data.metadata?.ocrLanguage,
  //         }),
  //       };
  //     }
  //   });
  // },

  // /**
  //  * Extract text from PDF buffer using OCR only
  //  * COMMENTED OUT: Replaced with external OCR API integration
  //  */
  // extractTextFromPDFWithOCR: async (buffer: Buffer): Promise<ServiceResult<TextExtractionResult>> => {
  //   return safeAsync(async () => {
  //     logInfo('Starting PDF OCR text extraction', { bufferSize: buffer.length });

  //     if (isEmpty(buffer) || buffer.length === 0) {
  //       throw new Error('PDF buffer is empty');
  //     }

  //     // Convert PDF pages to images
  //     const imageBuffersResult = await convertPDFPagesToImages(buffer);
  //     if (!imageBuffersResult.success || !imageBuffersResult.data) {
  //       throw new Error(`PDF to image conversion failed: ${imageBuffersResult.error?.message}`);
  //     }

  //     const imageBuffers = imageBuffersResult.data;

  //     // Perform OCR on images
  //     const ocrResult = await performOCROnImages(imageBuffers);
  //     if (!ocrResult.success || !ocrResult.data) {
  //       throw new Error(`OCR processing failed: ${ocrResult.error?.message}`);
  //     }

  //     const { text, confidence, processingTime } = ocrResult.data;

  //     const result: TextExtractionResult = {
  //       text,
  //       metadata: calculateTextMetadata(text, {
  //         pageCount: imageBuffers.length,
  //         format: 'pdf',
  //         extractionMethod: 'ocr',
  //         ocrProcessingTime: processingTime,
  //         ocrConfidence: confidence,
  //         ocrLanguage: 'eng',
  //       }),
  //     };

  //     logInfo('PDF OCR text extraction completed', {
  //       textLength: result.text.length,
  //       pageCount: imageBuffers.length,
  //       wordCount: result.metadata?.wordCount,
  //       confidence,
  //       processingTime,
  //     });

  //     return result;
  //   });
  // },

  /**
   * Extract text from DOCX file using mammoth
   */
  extractTextFromDOCX: async (filePath: string): Promise<ServiceResult<TextExtractionResult>> => {
    return safeAsync(async () => {
      logInfo('Starting DOCX text extraction', { filePath });

      if (isEmpty(filePath)) {
        throw new Error('File path is required for DOCX extraction');
      }

      // Fetch file content from Cloudinary URL
      const buffer = await fetchFileContent(filePath);

      const extractionResult = await mammoth.extractRawText({ buffer });
      const text = extractionResult.value || '';
      const warnings = extractionResult.messages?.map(msg => msg.message) || [];

      const result: TextExtractionResult = {
        text,
        metadata: calculateTextMetadata(text, {
          format: 'docx',
          warnings: warnings.length > 0 ? warnings : undefined,
        }),
      };

      logInfo('DOCX text extraction completed', {
        textLength: result.text.length,
        wordCount: result.metadata?.wordCount,
        warningsCount: warnings.length,
      });

      if (warnings.length > 0) {
        logInfo('DOCX extraction warnings', { warnings });
      }

      return result;
    });
  },

  /**
   * Extract text from Markdown content using gray-matter
   */
  extractTextFromMarkdown: async (
    content: string
  ): Promise<ServiceResult<TextExtractionResult>> => {
    return safeAsync(async () => {
      logInfo('Starting Markdown text extraction', { contentLength: content.length });

      if (isEmpty(content)) {
        throw new Error('Markdown content is empty');
      }

      const parsed = matter(content);
      const frontMatter = parsed.data;
      const mainContent = parsed.content || '';

      // Combine front matter and content for full text
      const frontMatterText = !isEmpty(frontMatter)
        ? Object.entries(frontMatter)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n') + '\n\n'
        : '';

      const fullText = frontMatterText + mainContent;

      const result: TextExtractionResult = {
        text: fullText,
        metadata: calculateTextMetadata(fullText, {
          format: 'markdown',
          frontMatter: !isEmpty(frontMatter) ? frontMatter : undefined,
        }),
      };

      logInfo('Markdown text extraction completed', {
        textLength: result.text.length,
        wordCount: result.metadata?.wordCount,
        hasFrontMatter: !isEmpty(frontMatter),
      });

      return result;
    });
  },

  /**
   * Extract text from plain text content (no processing needed)
   */
  extractTextFromTXT: async (content: string): Promise<ServiceResult<TextExtractionResult>> => {
    return safeAsync(async () => {
      logInfo('Starting TXT text extraction', { contentLength: content.length });

      if (isEmpty(content)) {
        logInfo('TXT content is empty, returning empty result');
        content = '';
      }

      const result: TextExtractionResult = {
        text: content,
        metadata: calculateTextMetadata(content, {
          format: 'txt',
        }),
      };

      logInfo('TXT text extraction completed', {
        textLength: result.text.length,
        wordCount: result.metadata?.wordCount,
      });

      return result;
    });
  },

  /**
   * Main dispatcher function to extract text based on file type
   */
  extractText: async (file: UploadFile): Promise<ServiceResult<TextExtractionResult>> => {
    return safeAsync(async () => {
      logInfo('Starting text extraction', {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });

      const fileType = file.mimetype;
      let extractionResult: ServiceResult<TextExtractionResult>;

      switch (fileType) {
        case 'application/pdf':
          // For PDF, we need to fetch the buffer from Cloudinary
          const pdfBuffer = await fetchFileContent(file.path);
          extractionResult = await textExtractionService.extractTextFromPDF(pdfBuffer);
          break;

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          extractionResult = await textExtractionService.extractTextFromDOCX(file.path);
          break;

        case 'text/markdown':
          // For markdown, fetch content as text
          const mdBuffer = await fetchFileContent(file.path);
          const mdContent = mdBuffer.toString('utf-8');
          extractionResult = await textExtractionService.extractTextFromMarkdown(mdContent);
          break;

        case 'text/plain':
        case 'application/rtf':
          // For plain text, fetch content as text
          const txtBuffer = await fetchFileContent(file.path);
          const txtContent = txtBuffer.toString('utf-8');
          extractionResult = await textExtractionService.extractTextFromTXT(txtContent);
          break;

        default:
          logError('Unsupported file type for text extraction', {
            mimetype: fileType,
            filename: file.originalname,
          });

          // Return empty result for unsupported formats instead of failing
          extractionResult = {
            success: true,
            data: {
              text: '',
              metadata: {
                format: 'unsupported',
                wordCount: 0,
                characterCount: 0,
                warnings: [`Unsupported file type: ${fileType}`],
              },
            },
          };
      }

      if (!extractionResult.success) {
        logError('Text extraction failed', {
          filename: file.originalname,
          error: extractionResult.error?.message,
        });

        // Return empty result on failure instead of throwing
        return {
          text: '',
          metadata: {
            format: 'error',
            wordCount: 0,
            characterCount: 0,
            warnings: [`Extraction failed: ${extractionResult.error?.message}`],
          },
        };
      }

      logInfo('Text extraction completed successfully', {
        filename: file.originalname,
        textLength: extractionResult.data?.text.length || 0,
        wordCount: extractionResult.data?.metadata?.wordCount || 0,
      });

      return extractionResult.data!;
    });
  },
};
