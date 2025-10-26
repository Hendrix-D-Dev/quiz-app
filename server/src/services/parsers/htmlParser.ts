import { JSDOM } from "jsdom";
import { debugLogger } from "../../utils/debugLogger.js";

/**
 * HTML Parser — extracts readable text from HTML documents
 * npm install jsdom
 */
export async function parseHtml(buffer: Buffer): Promise<string> {
  try {
    const html = buffer.toString("utf8");
    const dom = new JSDOM(html);
    const text = dom.window.document.body.textContent || "";

    const cleaned = text.replace(/\s+/g, " ").trim();
    debugLogger("htmlParser", { step: "success", length: cleaned.length });

    return cleaned;
  } catch (err) {
    debugLogger("htmlParser", { step: "error", error: err });
    return buffer.toString("utf8");
  }
}
