import { debugLogger } from "../../utils/debugLogger.js";
/**
 * ✅ Stable & Safe PDF Parser
 * 1️⃣ Primary: pdf-parse (pure text-based)
 * 2️⃣ Fallback: pdf-lib + regex text stream extraction
 * 3️⃣ Last resort: binary UTF8 readable fallback
 */
export async function parsePdf(buffer) {
    // --- Primary parser: pdf-parse ---
    try {
        const mod = await import("pdf-parse");
        const pdfParse = mod.default || mod;
        if (typeof pdfParse !== "function")
            throw new Error("Invalid pdf-parse import");
        const data = await pdfParse(buffer);
        const text = (data.text || "").replace(/\s+/g, " ").trim();
        if (text.length < 100)
            throw new Error("Parsed text too short");
        debugLogger("pdfParser", {
            step: "pdf-parse success",
            length: text.length,
            preview: text.slice(0, 120),
        });
        return text;
    }
    catch (err) {
        debugLogger("pdfParser", { step: "pdf-parse failed", error: String(err) });
    }
    // --- Fallback: pdf-lib with manual stream text extraction ---
    try {
        const { PDFDocument } = await import("pdf-lib");
        const pdfDoc = await PDFDocument.load(buffer);
        // Convert the raw PDF buffer to string and extract text-like data manually
        const raw = buffer.toString("latin1");
        const textMatches = raw.match(/\(([^)]+)\)\s*TJ?/g) || [];
        const extracted = textMatches
            .map((m) => m.replace(/\(|\)|TJ|Td|Tj|Tf|[\r\n]/g, " "))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
        if (extracted.length > 100) {
            debugLogger("pdfParser", {
                step: "pdf-lib fallback success",
                length: extracted.length,
            });
            return extracted;
        }
        else {
            throw new Error("pdf-lib fallback yielded too little text");
        }
    }
    catch (err) {
        debugLogger("pdfParser", {
            step: "pdf-lib fallback failed",
            error: String(err),
        });
    }
    // --- Final fallback: clean binary text ---
    const fallback = buffer
        .toString("latin1")
        .replace(/[^\x20-\x7E\n\r]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    debugLogger("pdfParser", {
        step: "binary fallback",
        length: fallback.length,
    });
    return fallback || "Unable to extract text from PDF.";
}
