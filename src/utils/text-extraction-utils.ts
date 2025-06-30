import { safeAsync } from '@/utils/error';
import { logInfo, logError } from '@/utils/logger';
import { ServiceResult, TextExtractionResult } from '@/types/upload';
import { isEmpty } from 'lodash';
import { createWorker } from 'tesseract.js';
import pdf2poppler from 'pdf-poppler';

/**
 * Utility function to fetch file content from URL
 */
export const fetchFileContent = async (url: string): Promise<Buffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

/**
 * Utility function to calculate basic text statistics
 */
export const calculateTextMetadata = (text: string, additionalMeta: any = {}): TextExtractionResult['metadata'] => {
  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  const characterCount = text.replace(/\s/g, '').length;
  
  return {
    wordCount,
    characterCount,
    ...additionalMeta,
  };
};

/**
 * Utility function to assess text quality for OCR fallback decision
 */
export const isTextContentSufficient = (text: string): boolean => {
  if (isEmpty(text)) return false;
  
  const trimmedText = text.trim();
  const wordCount = trimmedText.split(/\s+/).filter(word => word.length > 0).length;
  const charCount = trimmedText.length;
  
  // More lenient thresholds to avoid false OCR triggering:
  // - At least 15 characters (was 50)
  // - At least 3 words (was 10) 
  // - Less strict special character ratio (was 0.5, now 0.8)
  const specialCharRatio = charCount > 0 ? (trimmedText.match(/[^\w\s]/g) || []).length / charCount : 1;
  
  // Additional check: if text is mostly whitespace or line breaks, it's not sufficient
  const meaningfulContent = trimmedText.replace(/[\s\n\r]+/g, ' ').trim();
  if (meaningfulContent.length < 8) return false;
  
  return charCount >= 10 && wordCount >= 2 && specialCharRatio < 0.8;
};

/**
 * Utility function to convert PDF pages to images for OCR
 */
export const convertPDFPagesToImages = async (pdfBuffer: Buffer): Promise<ServiceResult<Buffer[]>> => {
  return safeAsync(async () => {
    logInfo('Converting PDF pages to images for OCR using pdf-poppler');

    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');

    // Create temporary directory for PDF and output images
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-ocr-'));
    const pdfPath = path.join(tempDir, 'temp.pdf');
    
    try {
      // Write buffer to temporary PDF file
      await fs.writeFile(pdfPath, pdfBuffer);
      
      const options = {
        format: 'png' as const,
        out_dir: tempDir,
        out_prefix: 'page',
        page: null, // Convert all pages
        density: 300, // 300 DPI for good OCR quality
      };

      logInfo('Starting PDF to image conversion', { 
        tempDir, 
        pdfSize: pdfBuffer.length 
      });

      // Convert PDF to images
      await pdf2poppler.convert(pdfPath, options);

      // Read generated image files
      const files = await fs.readdir(tempDir);
      const imageFiles = files.filter(file => file.startsWith('page-') && file.endsWith('.png'));
      
      logInfo(`Found ${imageFiles.length} converted images`, { imageFiles });

      if (imageFiles.length === 0) {
        throw new Error('No images were generated from PDF');
      }

      // Read image buffers (limit to first 10 pages to avoid excessive processing)
      const maxPages = Math.min(10, imageFiles.length);
      const images: Buffer[] = [];

      for (let i = 0; i < maxPages; i++) {
        const imagePath = path.join(tempDir, imageFiles[i]);
        const imageBuffer = await fs.readFile(imagePath);
        images.push(imageBuffer);
        
        logInfo(`Loaded image ${i + 1}/${maxPages}`, { 
          imagePath: imageFiles[i],
          imageSize: imageBuffer.length 
        });
      }

      logInfo(`Successfully converted ${images.length} PDF pages to images`);
      return images;

    } finally {
      // Clean up temporary directory and all files
      try {
        const files = await fs.readdir(tempDir);
        for (const file of files) {
          await fs.unlink(path.join(tempDir, file)).catch(() => {});
        }
        await fs.rmdir(tempDir).catch(() => {});
        logInfo('Temporary files cleaned up', { tempDir });
      } catch (cleanupError) {
        logError('Failed to cleanup temporary files', { error: cleanupError, tempDir });
      }
    }
  });
};

/**
 * Utility function to perform OCR on image buffers
 */
export const performOCROnImages = async (imageBuffers: Buffer[], language: string = 'eng+vie'): Promise<ServiceResult<{ text: string; confidence: number; processingTime: number }>> => {
  return safeAsync(async () => {
    const startTime = Date.now();
    logInfo('Starting OCR processing', { 
      imageCount: imageBuffers.length,
      language 
    });

    const worker = await createWorker(language, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logInfo('OCR Progress', { progress: `${Math.round(m.progress * 100)}%` });
        }
      },
    });

    let combinedText = '';
    let totalConfidence = 0;
    let processedPages = 0;

    try {
      for (let i = 0; i < imageBuffers.length; i++) {
        try {
          logInfo(`Processing OCR for page ${i + 1}/${imageBuffers.length}`);
          
          const { data } = await worker.recognize(imageBuffers[i]);
          
          if (data.text && data.text.trim().length > 0) {
            combinedText += `\n--- Page ${i + 1} ---\n${data.text}\n`;
            totalConfidence += data.confidence || 0;
            processedPages++;
          }
          
          logInfo(`OCR completed for page ${i + 1}`, {
            textLength: data.text.length,
            confidence: data.confidence
          });
        } catch (pageError) {
          logError(`OCR failed for page ${i + 1}`, { error: pageError });
          // Continue processing other pages
        }
      }
    } finally {
      await worker.terminate();
    }

    const processingTime = Date.now() - startTime;
    const averageConfidence = processedPages > 0 ? totalConfidence / processedPages : 0;

    logInfo('OCR processing completed', {
      totalPages: imageBuffers.length,
      processedPages,
      textLength: combinedText.length,
      averageConfidence,
      processingTime,
    });

    return {
      text: combinedText.trim(),
      confidence: averageConfidence,
      processingTime,
    };
  });
}; 