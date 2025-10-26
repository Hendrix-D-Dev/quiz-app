// server/src/services/parsers/docxParser.ts
import mammoth from "mammoth";
import { parseWithTextract } from "../parsers/shared/textractFallback.js";
import { debugLogger } from "../../utils/debugLogger.js";
/**
 * Parses .docx files safely using mammoth, with textract fallback.
 */
export async function parseDocx(buffer, filename) {
    try {
        debugLogger("docxParser", {
            step: "start",
            isBuffer: Buffer.isBuffer(buffer),
            size: buffer.length,
        });
        const result = await mammoth.extractRawText({ buffer });
        let text = (result.value || "").replace(/\s+/g, " ").trim();
        // Fallback if mammoth fails
        if (!text || text.length < 10) {
            debugLogger("docxParser", { step: "fallback", note: "Mammoth returned empty" });
            text = await parseWithTextract(buffer, filename);
        }
        debugLogger("docxParser", {
            step: "success",
            length: text.length,
            preview: text.slice(0, 100),
        });
        return text;
    }
    catch (err) {
        debugLogger("docxParser", { step: "error", error: String(err) });
        return buffer.toString("utf8").replace(/\s+/g, " ").trim();
    }
}
