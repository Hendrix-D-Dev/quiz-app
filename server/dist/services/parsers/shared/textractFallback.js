import textract from "textract";
import { debugLogger } from "../../../utils/debugLogger.js";
const Textract = textract;
export async function parseWithTextract(buffer, filename) {
    return new Promise((resolve, reject) => {
        Textract.fromBufferWithName(filename, buffer, (error, text) => {
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
