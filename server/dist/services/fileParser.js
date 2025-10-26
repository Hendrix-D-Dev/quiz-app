// server/src/services/fileParser.ts
import Papa from "papaparse";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";
// @ts-expect-error textract has no official types
import textract from "textract";
import { debugLogger } from "../utils/debugLogger.js";
const Textract = textract;
/**
 * ✅ Robust, ESM + CJS compatible PDF Parser
 * Handles both `import pdf from "pdf-parse"` and `const pdf = require("pdf-parse")` styles.
 */
async function parsePdf(buffer) {
    try {
        // Dynamic import
        const mod = await import("pdf-parse");
        // Extract the actual function (works in all TS/Node modes)
        const pdfFn = typeof mod === "function"
            ? mod
            : typeof mod?.default === "function"
                ? mod.default
                : typeof mod?.PDFParse === "function"
                    ? mod.PDFParse
                    : null;
        if (!pdfFn)
            throw new Error("Invalid pdf-parse import structure");
        const data = await pdfFn(buffer);
        const text = (data?.text || "").replace(/\s+/g, " ").trim();
        if (!text || text.length < 20)
            throw new Error("Parsed PDF text empty");
        debugLogger("fileParser", {
            step: "pdf-success",
            length: text.length,
            preview: text.slice(0, 120),
        });
        return text;
    }
    catch (err) {
        debugLogger("fileParser", { step: "pdf-error", error: String(err) });
        // Fallback: plain UTF-8
        return buffer.toString("utf8").replace(/\s+/g, " ").trim();
    }
}
/** ✅ Textract fallback */
async function parseWithTextract(buffer, filename) {
    return new Promise((resolve, reject) => {
        Textract.fromBufferWithName(filename, buffer, (error, text) => {
            if (error) {
                debugLogger("fileParser", { step: "textract-error", error });
                return reject(error);
            }
            resolve((text || "").replace(/\s+/g, " ").trim());
        });
    });
}
/** ✅ OCR Image Parser */
async function parseImage(buffer) {
    try {
        const { data: { text }, } = await Tesseract.recognize(buffer, "eng");
        return (text || "").replace(/\s+/g, " ").trim();
    }
    catch (err) {
        debugLogger("fileParser", { step: "ocr-error", error: err });
        return buffer.toString("utf8");
    }
}
/** ✅ DOCX Parser */
async function parseDocx(buffer, filename) {
    try {
        debugLogger("fileParser", {
            step: "docx-start",
            isBuffer: Buffer.isBuffer(buffer),
            byteLength: buffer.length,
        });
        const result = await mammoth.extractRawText({ buffer });
        let text = (result.value || "").replace(/\s+/g, " ").trim();
        if (!text || text.length < 10) {
            debugLogger("fileParser", { step: "docx-fallback", note: "Mammoth returned empty" });
            text = await parseWithTextract(buffer, filename);
        }
        return text;
    }
    catch (err) {
        debugLogger("fileParser", { step: "docx-error", error: err });
        return buffer.toString("utf8").replace(/\s+/g, " ").trim();
    }
}
/** ✅ CSV Parser */
function parseCsv(buffer) {
    try {
        const text = buffer.toString("utf8");
        const parsed = Papa.parse(text, { skipEmptyLines: true });
        const rows = parsed.data.map((r) => r.join(" "));
        return rows.join("\n").replace(/\s+/g, " ").trim();
    }
    catch (err) {
        debugLogger("fileParser", { step: "csv-error", error: err });
        return buffer.toString("utf8");
    }
}
/** ✅ Main File Parser */
export async function parseFile(buffer, filename) {
    const lower = filename.toLowerCase();
    debugLogger("fileParser", { step: "parse-start", filename });
    let extracted = "";
    try {
        if (lower.endsWith(".pdf"))
            extracted = await parsePdf(buffer);
        else if (lower.endsWith(".docx") || lower.endsWith(".doc"))
            extracted = await parseDocx(buffer, filename);
        else if (lower.endsWith(".csv"))
            extracted = parseCsv(buffer);
        else if (/\.(png|jpg|jpeg)$/i.test(lower))
            extracted = await parseImage(buffer);
        else {
            debugLogger("fileParser", { step: "universal-start", note: "using textract" });
            extracted = await parseWithTextract(buffer, filename);
        }
    }
    catch (primaryErr) {
        debugLogger("fileParser", { step: "primary-parser-error", error: primaryErr });
        extracted = buffer.toString("utf8").replace(/\s+/g, " ").trim();
    }
    const finalText = (extracted || "").replace(/\s+/g, " ").trim();
    if (!finalText || finalText.length < 10) {
        debugLogger("fileParser", { step: "parse-empty" });
        throw new Error("File parsing returned empty or unreadable text");
    }
    debugLogger("fileParser", {
        step: "parse-complete",
        extractedLength: finalText.length,
        preview: finalText.slice(0, 200),
    });
    return finalText;
}
