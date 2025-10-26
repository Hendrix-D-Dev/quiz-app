import { debugLogger } from "../../utils/debugLogger.js";

/**
 * TXT Parser — minimal, universal text parser
 */
export async function parseTxt(buffer: Buffer): Promise<string> {
  try {
    const text = buffer.toString("utf8").replace(/\s+/g, " ").trim();
    if (!text) throw new Error("Empty TXT content");

    debugLogger("txtParser", { step: "success", length: text.length });
    return text;
  } catch (err) {
    debugLogger("txtParser", { step: "error", error: err });
    return "";
  }
}
