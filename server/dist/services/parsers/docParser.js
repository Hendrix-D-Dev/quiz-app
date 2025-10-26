// server/src/services/parsers/docParser.ts
import { parseWithTextract } from "../parsers/shared/textractFallback.js";
import { debugLogger } from "../../utils/debugLogger.js";
/**
 * Parses .doc files using textract fallback.
 */
export async function parseDoc(buffer, filename) {
    try {
        debugLogger("docParser", { step: "start", filename });
        const text = await parseWithTextract(buffer, filename);
        const cleaned = (text || "").replace(/\s+/g, " ").trim();
        debugLogger("docParser", {
            step: "success",
            length: cleaned.length,
            preview: cleaned.slice(0, 100),
        });
        return cleaned;
    }
    catch (err) {
        debugLogger("docParser", { step: "error", error: String(err) });
        return buffer.toString("utf8").replace(/\s+/g, " ").trim();
    }
}
