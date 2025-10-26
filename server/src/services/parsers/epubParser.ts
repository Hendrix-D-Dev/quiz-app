// server/src/services/parsers/epubParser.ts
import { EPub } from "epub2";
import { debugLogger } from "../../utils/debugLogger.js";

/**
 * Parses .epub ebooks into plain text.
 */
export async function parseEpub(buffer: Buffer): Promise<string> {
  try {
    const epub = new EPub(buffer.toString("base64"));
    await epub.parse();

    let content = "";
    epub.flow.forEach((c: any) => {
      if (c?.text) content += c.text + "\n";
    });

    const cleaned = content.replace(/\s+/g, " ").trim();

    debugLogger("epubParser", {
      step: "success",
      length: cleaned.length,
      preview: cleaned.slice(0, 120),
    });

    return cleaned;
  } catch (err) {
    debugLogger("epubParser", { step: "error", error: err });
    return buffer.toString("utf8").replace(/\s+/g, " ").trim();
  }
}
