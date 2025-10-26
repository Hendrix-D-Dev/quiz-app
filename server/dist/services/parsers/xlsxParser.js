import * as XLSX from "xlsx";
import { debugLogger } from "../../utils/debugLogger.js";
/**
 * XLSX Parser — extracts sheet data as plain text
 * npm install xlsx
 */
export async function parseXlsx(buffer) {
    try {
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const allSheets = Object.keys(workbook.Sheets)
            .map((name) => XLSX.utils.sheet_to_csv(workbook.Sheets[name]))
            .join("\n");
        const text = allSheets.replace(/\s+/g, " ").trim();
        debugLogger("xlsxParser", { step: "success", length: text.length });
        return text;
    }
    catch (err) {
        debugLogger("xlsxParser", { step: "error", error: err });
        return buffer.toString("utf8");
    }
}
