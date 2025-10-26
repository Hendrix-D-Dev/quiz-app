import textract from "textract";
import { debugLogger } from "../../utils/debugLogger.js";

const Textract = textract as any;

/**
 * PPTX Parser — uses Textract for PowerPoint files
 */
export async function parsePptx(buffer: Buffer, filename: string): Promise<string> {
  return new Promise((resolve) => {
    Textract.fromBufferWithName(filename, buffer, (err: any, text: string) => {
      if (err) {
        debugLogger("pptxParser", { step: "error", error: err });
        return resolve(buffer.toString("utf8"));
      }
      const cleaned = (text || "").replace(/\s+/g, " ").trim();
      debugLogger("pptxParser", { step: "success", length: cleaned.length });
      resolve(cleaned);
    });
  });
}
