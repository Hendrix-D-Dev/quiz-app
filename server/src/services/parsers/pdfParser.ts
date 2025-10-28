import { debugLogger } from "../../utils/debugLogger.js";

/**
 * ✅ Simplified & Reliable PDF Parser
 * 1️⃣ Primary: pdf-parse (most reliable for text-based PDFs)
 * 2️⃣ Fallback: pdf-lib + enhanced regex extraction
 * 3️⃣ Final fallback: binary text cleanup
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  // --- Primary parser: pdf-parse ---
  try {
    const mod = await import("pdf-parse");
    const pdfParse = mod.default || mod;

    if (typeof pdfParse !== "function") throw new Error("Invalid pdf-parse import");

    const data = await pdfParse(buffer);
    const text = (data.text || "").replace(/\s+/g, " ").trim();

    if (text.length >= 100) {
      debugLogger("pdfParser", {
        step: "pdf-parse success",
        length: text.length,
        preview: text.slice(0, 120),
      });
      return text;
    }
    throw new Error("Parsed text too short");
  } catch (err) {
    debugLogger("pdfParser", { 
      step: "pdf-parse failed", 
      error: String(err) 
    });
  }

  // --- Enhanced Fallback: pdf-lib with comprehensive text extraction ---
  try {
    const { PDFDocument } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.load(buffer);

    // Convert to string and use multiple extraction strategies
    const raw = buffer.toString("binary");
    
    // Multiple regex patterns for different PDF text encodings
    const textPatterns = [
      /\(([^)]+)\)\s*TJ?/g,                    // Standard text in parentheses (TJ operator)
      /<([^>]+)>\s*TJ?/g,                      // Hex encoded text
      /\/[A-Za-z]+\s*\(([^)]+)\)/g,            // Text after font declarations
      /\(([^)]+)\)\s*Tj/g,                     // Simple text show operator (Tj)
      /\[[^\]]*\(([^)]+)\)[^\]]*\]\s*TJ/g,     // Array text in brackets
      /(\\[0-9]{3}|[A-Za-z0-9\s.,!?;:])+/g,   // Escaped character sequences
    ];

    let extracted = "";
    
    for (const pattern of textPatterns) {
      const matches = raw.match(pattern) || [];
      const textFromPattern = matches
        .map((m) => {
          // Clean the matched text
          return m
            .replace(/\(|\)|<|>|TJ|Tj|Td|Tf|TD|Tm|Tc|Tw|Tz|Ts|Tr|T\*|\[|\]|\\[0-9]{3}|\/[A-Za-z]+\s*/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        })
        .filter(text => text.length > 1) // Remove single characters/noise
        .join(" ");
      
      if (textFromPattern.length > extracted.length) {
        extracted = textFromPattern;
      }
    }

    // Additional: Try to extract from stream objects
    const streamMatches = raw.match(/stream[\s\S]*?endstream/g) || [];
    for (const stream of streamMatches) {
      const cleanStream = stream
        .replace(/stream|endstream/g, "")
        .replace(/[^\x20-\x7E\n\r]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      
      if (cleanStream.length > 50 && cleanStream.length > extracted.length) {
        extracted = cleanStream;
      }
    }

    if (extracted.length > 100) {
      debugLogger("pdfParser", {
        step: "pdf-lib fallback success",
        length: extracted.length,
        preview: extracted.slice(0, 120),
      });
      return extracted;
    } else {
      throw new Error("pdf-lib fallback yielded too little text");
    }
  } catch (err) {
    debugLogger("pdfParser", {
      step: "pdf-lib fallback failed",
      error: String(err),
    });
  }

  // --- Final fallback: comprehensive binary text extraction ---
  try {
    // Try multiple encodings
    const encodings = ['utf8', 'latin1', 'ascii', 'binary'] as const;
    let bestText = "";
    
    for (const encoding of encodings) {
      try {
        const text = buffer.toString(encoding)
          .replace(/[^\x20-\x7E\n\r\t]/g, " ") // Remove non-printable chars
          .replace(/\s+/g, " ")
          .trim();
        
        // Keep the longest extracted text
        if (text.length > bestText.length) {
          bestText = text;
        }
      } catch (e) {
        // Continue with next encoding
      }
    }

    if (bestText.length > 50) {
      debugLogger("pdfParser", {
        step: "binary fallback success",
        length: bestText.length,
        encoding: "multiple",
        preview: bestText.slice(0, 120),
      });
      return bestText;
    }
  } catch (err) {
    debugLogger("pdfParser", {
      step: "binary fallback failed",
      error: String(err),
    });
  }

  // --- Ultimate fallback: minimal text cleanup ---
  const minimalText = buffer.toString('utf8')
    .replace(/[^A-Za-z0-9\s.,!?;:()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  debugLogger("pdfParser", {
    step: "minimal fallback",
    length: minimalText.length,
    preview: minimalText.slice(0, 120),
  });

  if (minimalText.length < 50) {
    debugLogger("pdfParser", {
      step: "pdf-may-be-scanned-or-protected",
      warning: "PDF appears to be image-based, scanned, or protected. Text extraction yielded very little content.",
      extractedLength: minimalText.length
    });
    
    return "This PDF appears to be image-based or scanned. The system extracted very little text. For better results, use text-based PDFs or enable OCR features.";
  }

  return minimalText;
}