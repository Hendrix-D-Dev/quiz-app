import { debugLogger } from "../../utils/debugLogger.js";
import { parsePdf } from "./pdfParser.js";
import { parseDocx } from "./docxParser.js";
import { parseDoc } from "./docParser.js";
import { parseEpub } from "./epubParser.js";
import { parseTxt } from "./txtParser.js";
import { parseCsv } from "./csvParser.js";
import { parseHtml } from "./htmlParser.js";
import { parsePptx } from "./pptxParser.js";
import { parseXlsx } from "./xlsxParser.js";
import { parseImage } from "./imageParser.js";
import { parseWithTextract } from "./shared/textractFallback.js";

/**
 * 🧠 Central Parser Manager
 * Auto-selects best parser per file type.
 * Supports hybrid parsing (e.g., images + text).
 */
export async function parseFile(buffer: Buffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase();
  debugLogger("parserManager", { step: "start", filename });

  let text = "";
  try {
    if (lower.endsWith(".pdf")) {
      text = await parsePdf(buffer);
    } else if (lower.endsWith(".docx")) {
      text = await parseDocx(buffer, filename);
    } else if (lower.endsWith(".doc")) {
      text = await parseDoc(buffer, filename);
    } else if (lower.endsWith(".epub")) {
      text = await parseEpub(buffer);
    } else if (lower.endsWith(".txt")) {
      text = await parseTxt(buffer);
    } else if (lower.endsWith(".csv")) {
      text = await parseCsv(buffer);
    } else if (lower.endsWith(".html") || lower.endsWith(".htm")) {
      text = await parseHtml(buffer);
    } else if (lower.endsWith(".pptx") || lower.endsWith(".ppt")) {
      text = await parsePptx(buffer, filename);
    } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      text = await parseXlsx(buffer);
    } else if (/\.(png|jpg|jpeg|gif)$/i.test(lower)) {
      text = await parseImage(buffer);
    } else {
      text = await parseWithTextract(buffer, filename);
    }

    // Hybrid fallback — image-based docs (e.g., scanned PDFs)
    if (!text || text.length < 100) {
      debugLogger("parserManager", { step: "hybrid-fallback", note: "attempting OCR textract" });
      try {
        const extra = await parseWithTextract(buffer, filename);
        if (extra && extra.length > text.length) text = extra;
      } catch (fallbackErr) {
        debugLogger("parserManager", { 
          step: "fallback-failed", 
          error: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr) 
        });
      }
    }

    const cleanedText = text.replace(/[^\x20-\x7E\n\r]+/g, " ").replace(/\s+/g, " ").trim();
    
    debugLogger("parserManager", {
      step: "completed",
      originalLength: text.length,
      cleanedLength: cleanedText.length,
      preview: cleanedText.substring(0, 200)
    });

    return cleanedText;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    debugLogger("parserManager", { 
      step: "error", 
      filename,
      error: errorMessage 
    });
    
    // For image files, provide more specific error
    if (/\.(png|jpg|jpeg|gif)$/i.test(lower)) {
      throw new Error(`Failed to extract text from image: ${errorMessage}`);
    }
    
    throw new Error(`Failed to parse file '${filename}': ${errorMessage}`);
  }
}