import fs from "fs";
import path from "path";
import util from "util";
import { fileURLToPath } from "url";
// Ensure logs folder relative to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.resolve(__dirname, "../../logs");
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, "debug.log");
function timestamp() {
    return new Date().toISOString();
}
export function debugLogger(source, data) {
    const ts = timestamp();
    const message = typeof data === "string"
        ? data
        : util.inspect(data, { depth: 5, colors: false });
    const consoleMsg = `[${ts}] [${source}] ${message}`;
    if (typeof data === "object" && data.error) {
        console.error("\x1b[31m%s\x1b[0m", consoleMsg);
    }
    else {
        console.log("\x1b[36m%s\x1b[0m", consoleMsg);
    }
    try {
        fs.appendFileSync(logFile, `[${ts}] [${source}] ${message}\n`, { flag: "a" });
    }
    catch (err) {
        console.error("❌ Failed to write debug log:", err);
    }
}
