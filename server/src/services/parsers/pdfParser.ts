import { debugLogger } from "../../utils/debugLogger.js";

/**
 * ✅ Improved PDF Parser with Better Text Extraction
 * 1️⃣ Primary: pdf-parse with better error handling
 * 2️⃣ Fallback: Manual text extraction from PDF streams
 * 3️⃣ Final: Clean binary extraction
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  // --- Primary parser: pdf-parse with improved handling ---
  try {
    const pdfParse = await import("pdf-parse");
    const pdfParseFn = pdfParse.default || pdfParse;
    
    // ✅ FIXED: pdf-parse only takes one argument
    const data = await pdfParseFn(buffer);
    
    let text = (data.text || "").trim();
    
    // Clean up the text
    text = cleanExtractedText(text);
    
    if (text.length >= 200) { // Increased minimum threshold
      debugLogger("pdfParser", {
        step: "pdf-parse success",
        length: text.length,
        preview: text.slice(0, 150),
      });
      return text;
    }
    throw new Error(`Parsed text too short: ${text.length} chars`);
  } catch (err) {
    debugLogger("pdfParser", { 
      step: "pdf-parse failed", 
      error: String(err) 
    });
  }

  // --- Improved manual extraction ---
  try {
    const manualText = await extractTextManually(buffer);
    const cleanText = cleanExtractedText(manualText);
    
    if (cleanText.length >= 100) {
      debugLogger("pdfParser", {
        step: "manual extraction success",
        length: cleanText.length,
        preview: cleanText.slice(0, 150),
      });
      return cleanText;
    }
    throw new Error("Manual extraction yielded too little text");
  } catch (err) {
    debugLogger("pdfParser", {
      step: "manual extraction failed",
      error: String(err),
    });
  }

  // --- Final fallback: smart binary cleanup ---
  const fallbackText = extractTextFromBinary(buffer);
  const cleanFallback = cleanExtractedText(fallbackText);
  
  debugLogger("pdfParser", {
    step: "binary fallback",
    length: cleanFallback.length,
    preview: cleanFallback.slice(0, 150),
  });

  if (cleanFallback.length < 100) {
    return "This PDF appears to be image-based or scanned. The system could not extract readable text. Please use text-based PDFs for best results.";
  }

  return cleanFallback;
}

/** Manual text extraction from PDF buffer */
async function extractTextManually(buffer: Buffer): Promise<string> {
  try {
    const pdfString = buffer.toString('binary');
    
    // Look for text in parentheses (most common PDF text format)
    const textInParens = (pdfString.match(/\(([^)]+)\)/g) || [])
      .map(match => match.slice(1, -1)) // Remove parentheses
      .join(' ');
    
    // Look for hex encoded text
    const hexText = (pdfString.match(/<([0-9A-Fa-f]+)>/g) || [])
      .map(match => {
        const hex = match.slice(1, -1);
        try {
          return Buffer.from(hex, 'hex').toString('utf8');
        } catch {
          return '';
        }
      })
      .join(' ');
    
    // Look for stream content (between stream and endstream)
    const streamText = (pdfString.match(/stream[\s\S]*?endstream/g) || [])
      .map(stream => {
        return stream
          .replace(/stream|endstream/g, '')
          .replace(/[^\x20-\x7E\n\r]/g, ' ') // Remove non-printable
          .replace(/\s+/g, ' ')
          .trim();
      })
      .join(' ');
    
    return [textInParens, hexText, streamText]
      .filter(text => text.length > 10) // Only keep substantial chunks
      .join(' ')
      .substring(0, 10000); // Limit length
  } catch (err) {
    return '';
  }
}

/** Extract and clean text from binary buffer */
function extractTextFromBinary(buffer: Buffer): string {
  // Try multiple encodings
  const encodings = ['utf8', 'latin1', 'ascii'] as const;
  let bestText = '';
  
  for (const encoding of encodings) {
    try {
      const text = buffer.toString(encoding);
      if (text.length > bestText.length) {
        bestText = text;
      }
    } catch (e) {
      // Continue with next encoding
    }
  }
  
  return bestText;
}

/** Clean extracted text by removing garbage */
function cleanExtractedText(text: string): string {
  return text
    // Remove common PDF artifacts
    .replace(/\/[A-Za-z]+\s*/g, ' ') // Remove font names like /F1, /Helvetica
    .replace(/\[[^\]]*\]/g, ' ') // Remove array notations
    .replace(/BT|ET|Tm|Td|Tj|TJ|Tf|TD/g, ' ') // Remove PDF operators
    .replace(/\\[0-9]{3}/g, ' ') // Remove octal escapes
    .replace(/endobj|endstream|stream|obj/g, ' ') // Remove PDF structure
    // Clean up whitespace and special characters
    .replace(/[^\x20-\x7E\n\r]/g, ' ') // Remove non-printable chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}