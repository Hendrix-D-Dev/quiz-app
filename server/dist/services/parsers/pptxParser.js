import textract from "textract";
import { debugLogger } from "../../utils/debugLogger.js";
const Textract = textract;
/**
 * PPTX Parser — uses Textract for PowerPoint files
 */
export async function parsePptx(buffer, filename) {
    return new Promise((resolve) => {
        Textract.fromBufferWithName(filename, buffer, (err, text) => {
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
