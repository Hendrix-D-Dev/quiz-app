import Papa from "papaparse";
import { debugLogger } from "../../utils/debugLogger.js";
/**
 * CSV Parser — uses PapaParse to read and flatten CSVs
 */
export async function parseCsv(buffer) {
    try {
        const text = buffer.toString("utf8");
        const parsed = Papa.parse(text, { skipEmptyLines: true });
        const rows = parsed.data.map((r) => r.join(" "));
        const result = rows.join("\n").replace(/\s+/g, " ").trim();
        debugLogger("csvParser", {
            step: "success",
            lines: rows.length,
            preview: result.slice(0, 100),
        });
        return result;
    }
    catch (err) {
        debugLogger("csvParser", { step: "error", error: err });
        return buffer.toString("utf8");
    }
}
