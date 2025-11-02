import { debugLogger } from "../../utils/debugLogger.js";

/**
 * ✅ Enhanced PDF Parser with Multiple Fallback Strategies
 * 1️⃣ Primary: pdfjs-dist (without worker for simplicity)
 * 2️⃣ Secondary: pdf-parse 
 * 3️⃣ Fallback: Enhanced manual extraction
 * 4️⃣ Final: OCR for image-based PDFs
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  // --- Strategy 1: pdfjs-dist (Most Reliable) ---
  try {
    const text = await extractWithPdfJs(buffer);
    if (text && text.length >= 200 && isReadableText(text)) {
      debugLogger("pdfParser", {
        step: "pdfjs-dist success",
        length: text.length,
        preview: text.slice(0, 150),
      });
      return text;
    }
  } catch (err) {
    debugLogger("pdfParser", { 
      step: "pdfjs-dist failed", 
      error: String(err) 
    });
  }

  // --- Strategy 2: pdf-parse ---
  try {
    const pdfParse = await import("pdf-parse");
    const pdfParseFn = pdfParse.default || pdfParse;
    
    const data = await pdfParseFn(buffer);
    let text = (data.text || "").trim();
    text = cleanExtractedText(text);
    
    if (text.length >= 200 && isReadableText(text)) {
      debugLogger("pdfParser", {
        step: "pdf-parse success",
        length: text.length,
        preview: text.slice(0, 150),
      });
      return text;
    }
  } catch (err) {
    debugLogger("pdfParser", { 
      step: "pdf-parse failed", 
      error: String(err) 
    });
  }

  // --- Strategy 3: Enhanced Manual Extraction ---
  try {
    const manualText = await extractTextManually(buffer);
    const cleanText = cleanExtractedText(manualText);
    
    if (cleanText.length >= 100 && isReadableText(cleanText)) {
      debugLogger("pdfParser", {
        step: "manual extraction success",
        length: cleanText.length,
        preview: cleanText.slice(0, 150),
      });
      return cleanText;
    }
  } catch (err) {
    debugLogger("pdfParser", {
      step: "manual extraction failed",
      error: String(err),
    });
  }

  // --- Strategy 4: OCR Fallback ---
  try {
    const ocrText = await extractWithOCR(buffer);
    if (ocrText && ocrText.length >= 100) {
      debugLogger("pdfParser", {
        step: "OCR fallback success",
        length: ocrText.length,
        preview: ocrText.slice(0, 150),
      });
      return ocrText;
    }
  } catch (err) {
    debugLogger("pdfParser", {
      step: "OCR fallback failed",
      error: String(err),
    });
  }

  throw new Error(
    "PDF_CONTENT_ERROR: This PDF appears to be image-based, scanned, or encrypted. " +
    "The system could not extract readable text. Please use text-based PDFs for best results."
  );
}

/** Extract text using pdfjs-dist without worker for simplicity */
async function extractWithPdfJs(buffer: Buffer): Promise<string> {
  // Use dynamic import to avoid TypeScript errors
  const pdfjsLib = await import('pdfjs-dist');
  const pdfjs = pdfjsLib as any;
  
  // Disable worker for now to avoid import issues
  pdfjs.GlobalWorkerOptions.workerSrc = '';
  
  try {
    // Load PDF document
    const loadingTask = pdfjs.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .trim();
        
        fullText += pageText + '\n\n';
        
        // Early validation for poor content
        if (pageNum === 3 && !hasSubstantialContent(fullText)) {
          throw new Error('Insufficient content in first few pages');
        }
      } catch (pageErr) {
        debugLogger("pdfParser", {
          step: "page extraction failed",
          page: pageNum,
          error: String(pageErr)
        });
        continue; // Continue with next page
      }
    }
    
    await pdf.destroy();
    const cleanedText = cleanExtractedText(fullText);
    
    // Validate extracted content
    if (!isValidContent(cleanedText)) {
      throw new Error('Extracted content appears to be metadata or poor quality');
    }
    
    return cleanedText;
  } catch (err) {
    throw new Error(`PDF.js extraction failed: ${err}`);
  }
}

/** Enhanced manual text extraction */
async function extractTextManually(buffer: Buffer): Promise<string> {
  try {
    const pdfString = buffer.toString('binary');
    let extractedText = '';
    
    // Method 1: Extract text between parentheses (most common PDF text format)
    const parenMatches = pdfString.match(/\(([^)]+)\)/g) || [];
    const parenText = parenMatches
      .map(match => {
        let text = match.slice(1, -1); // Remove parentheses
        
        // Handle escaped characters
        text = text.replace(/\\([()\\])/g, '$1');
        text = text.replace(/\\\n/g, '');
        text = text.replace(/\\\r/g, '');
        
        return text;
      })
      .filter(text => text.length > 1 && !isGibberish(text))
      .join(' ');
    
    extractedText += parenText + ' ';
    
    // Method 2: Extract from text operators (Tj, TJ)
    const tjMatches = pdfString.match(/(Tj|TJ)\s*\(([^)]+)\)/g) || [];
    const tjText = tjMatches
      .map(match => {
        const textMatch = match.match(/\(([^)]+)\)/);
        return textMatch ? textMatch[1] : '';
      })
      .filter(text => text.length > 1 && !isGibberish(text))
      .join(' ');
    
    extractedText += tjText + ' ';
    
    // Method 3: Look for readable strings in the binary data
    const readableStrings = extractReadableStrings(buffer);
    extractedText += readableStrings + ' ';
    
    return cleanExtractedText(extractedText);
  } catch (err) {
    return '';
  }
}

/** Extract readable strings from binary buffer */
function extractReadableStrings(buffer: Buffer): string {
  // Try multiple encodings to find readable text
  const encodings = ['utf8', 'latin1', 'ascii', 'ucs2'] as const;
  let bestText = '';
  
  for (const encoding of encodings) {
    try {
      const text = buffer.toString(encoding);
      
      // Look for sequences of readable characters
      const words = text.match(/[a-zA-Z]{3,}/g) || [];
      const sentences = text.match(/[a-zA-Z][a-zA-Z\s,.!?]{10,}[.!?]/g) || [];
      
      const extracted = [...words, ...sentences]
        .filter(text => !isMetadataLine(text))
        .join(' ');
      
      if (extracted.length > bestText.length && isReadableText(extracted)) {
        bestText = extracted;
      }
    } catch (e) {
      // Continue with next encoding
    }
  }
  
  return bestText.substring(0, 5000);
}

/** OCR fallback for image-based PDFs */
async function extractWithOCR(buffer: Buffer): Promise<string> {
  try {
    // Simple OCR using textract (already in your dependencies)
    const textract = await import("textract");
    const Textract = textract as any;
    
    return new Promise((resolve, reject) => {
      Textract.fromBufferWithMime('application/pdf', buffer, (error: any, text: string) => {
        if (error) {
          reject(error);
        } else {
          resolve(cleanExtractedText(text || ''));
        }
      });
    });
  } catch (err) {
    throw new Error('OCR not available');
  }
}

/** Enhanced content validation */
function isValidContent(text: string): boolean {
  if (!text || text.length < 100) return false;
  
  const wordCount = text.split(/\s+/).length;
  const sentenceCount = text.split(/[.!?]+/).length;
  
  // Check for metadata patterns
  const metadataPatterns = [
    /Producer:.+/i,
    /Creator:.+/i,
    /CreationDate:.+/i,
    /ModDate:.+/i,
    /PDF-.+/i,
    /^[\d\s\.\-:]+$/m // Lines with only numbers, dots, dashes
  ];
  
  const hasMetadata = metadataPatterns.some(pattern => pattern.test(text));
  const metadataRatio = calculateMetadataRatio(text);
  
  return wordCount > 100 && 
         sentenceCount > 3 && 
         !hasMetadata && 
         metadataRatio < 0.3; // Less than 30% metadata-like content
}

/** Check if text has substantial content */
function hasSubstantialContent(text: string): boolean {
  const words = text.split(/\s+/);
  const uniqueWords = new Set(words.filter(word => word.length > 3));
  return uniqueWords.size > 20; // At least 20 unique substantial words
}

/** Calculate metadata ratio in text */
function calculateMetadataRatio(text: string): number {
  const metadataKeywords = [
    'producer', 'creator', 'creationdate', 'moddate', 
    'pdf', 'adobe', 'version', 'trapped', 'keywords'
  ];
  
  const words = text.toLowerCase().split(/\s+/);
  const metadataWords = words.filter(word => 
    metadataKeywords.some(keyword => word.includes(keyword))
  );
  
  return metadataWords.length / Math.max(words.length, 1);
}

/** Check if text is readable (not gibberish) */
function isReadableText(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  // Check for high percentage of readable characters
  const readableChars = text.replace(/[^a-zA-Z0-9\s.,!?;:'"-]/g, '').length;
  const readabilityScore = readableChars / text.length;
  
  // Check for presence of actual words
  const wordCount = (text.match(/\b[a-zA-Z]{3,}\b/g) || []).length;
  const wordRatio = wordCount / (text.split(/\s+/).length || 1);
  
  // Check for gibberish patterns
  const hasGibberish = isGibberish(text);
  
  return readabilityScore > 0.6 && wordRatio > 0.3 && !hasGibberish;
}

/** Detect gibberish text */
function isGibberish(text: string): boolean {
  // High frequency of special characters
  const specialCharRatio = (text.replace(/[a-zA-Z0-9\s]/g, '').length) / text.length;
  if (specialCharRatio > 0.4) return true;
  
  // Repeated unusual character sequences
  const unusualPatterns = [
    /[{}<>\[\]\\\/]{3,}/g, // Multiple brackets/slashes
    /[^\x20-\x7E]{3,}/g,   // Multiple non-printable chars
    /(\S)\1{4,}/g,         // Repeated characters (aaaaa)
  ];
  
  return unusualPatterns.some(pattern => pattern.test(text));
}

/** Check if line appears to be metadata */
function isMetadataLine(line: string): boolean {
  const metadataIndicators = [
    /^\d+\s+\d+\s+\w+$/, // PDF object references
    /^<<.*>>$/, // PDF dictionaries
    /^\/\w+/, // PDF commands
    /^(Producer|Creator|CreationDate|ModDate):/i,
    /^Page \d+ of \d+$/i,
    /^\d{4}-\d{2}-\d{2}/, // Dates
  ];
  
  return metadataIndicators.some(pattern => pattern.test(line.trim()));
}

/** Clean extracted text */
function cleanExtractedText(text: string): string {
  return text
    // Remove PDF artifacts and operators
    .replace(/\/(Font|F|Type|Subtype|BaseFont|Encoding)\s*\[?[^\s\]]*\]?/g, ' ')
    .replace(/(BT|ET|Tm|Td|Tj|TJ|Tf|TD|T\*)\b/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    // Remove common metadata lines
    .replace(/(Producer|Creator|CreationDate|ModDate|Keywords|Subject|Title|Author):.*\n/gi, '')
    // Clean up whitespace and encoding issues
    .replace(/\\[nrt]/g, ' ')
    .replace(/\\[0-9]{3}/g, ' ')
    .replace(/�/g, ' ')
    .replace(/[^\x20-\x7E\n\r]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}