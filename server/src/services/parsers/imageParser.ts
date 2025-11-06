import Tesseract from "tesseract.js";
import { debugLogger } from "../../utils/debugLogger.js";

/**
 * Image Parser — OCR extraction for .jpg, .jpeg, .png, .gif
 */
export async function parseImage(buffer: Buffer): Promise<string> {
  try {
    debugLogger("imageParser", { 
      step: "starting-ocr", 
      bufferSize: buffer.length 
    });

    const {
      data: { text, confidence },
    } = await Tesseract.recognize(buffer, "eng", {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          debugLogger("imageParser", { 
            step: "ocr-progress", 
            progress: m.progress 
          });
        }
      }
    });
    
    const cleaned = (text || "").replace(/\s+/g, " ").trim();
    
    debugLogger("imageParser", { 
      step: "ocr-completed", 
      length: cleaned.length,
      confidence: confidence,
      preview: cleaned.substring(0, 100) 
    });

    // If OCR confidence is very low or text is too short, it might not be readable
    if (confidence < 10 || cleaned.length < 10) {
      debugLogger("imageParser", { 
        step: "low-confidence", 
        confidence,
        textLength: cleaned.length 
      });
      throw new Error("OCR could not extract readable text from this image");
    }

    return cleaned;
  } catch (err: any) {
    debugLogger("imageParser", { 
      step: "error", 
      error: err.message 
    });
    
    // Re-throw with more descriptive error
    if (err.message.includes('readable text')) {
      throw err; // Re-throw our custom error
    }
    
    throw new Error(`OCR processing failed: ${err.message}`);
  }
}