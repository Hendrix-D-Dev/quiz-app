import textract from "textract";
import { debugLogger } from "../../../utils/debugLogger.js";

const Textract = textract as any;

export async function parseWithTextract(buffer: Buffer, filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    Textract.fromBufferWithName(filename, buffer, (error: any, text: string) => {
      if (error) {
        debugLogger("textractFallback", { step: "error", error });
        return reject(error);
      }
      const cleaned = (text || "").replace(/\s+/g, " ").trim();
      debugLogger("textractFallback", { step: "success", length: cleaned.length });
      resolve(cleaned);
    });
  });
}
