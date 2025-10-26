import Tesseract from "tesseract.js";
import { debugLogger } from "../../utils/debugLogger.js";
/**
 * Image Parser — OCR extraction for .jpg, .jpeg, .png
 */
export async function parseImage(buffer) {
    try {
        const { data: { text }, } = await Tesseract.recognize(buffer, "eng");
        const cleaned = (text || "").replace(/\s+/g, " ").trim();
        debugLogger("imageParser", { step: "success", length: cleaned.length });
        return cleaned;
    }
    catch (err) {
        debugLogger("imageParser", { step: "error", error: err });
        return buffer.toString("utf8");
    }
}
