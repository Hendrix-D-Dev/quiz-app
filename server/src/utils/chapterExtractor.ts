import { debugLogger } from "../utils/debugLogger.js";

export function extractChaptersFromText(text: string) {
  const cleaned = text
    .replace(/[^\x20-\x7E\n\r]+/g, " ")
    .replace(/\r?\n+/g, "\n")
    .trim();

  const chapters: { title: string; content: string }[] = [];
  const regex =
    /\b(?:Chapter|CHAPTER|Ch\.?|CH\.?)\s*([0-9IVXLC]+|[A-Z]+)?[\.:]?\s*(.*?)(?=(?:Chapter|CHAPTER|Ch\.?|CH\.?)\s+[0-9IVXLC]+|$)/gs;

  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    const title = `Chapter ${match[1] || ""} ${match[2] || ""}`.trim();
    const content = match[0].trim();
    if (content.length > 200) chapters.push({ title, content });
  }

  if (chapters.length === 0) {
    const chunkSize = Math.ceil(cleaned.length / 4);
    const chunks = Array.from({ length: 4 }, (_, i) => ({
      title: `Part ${i + 1}`,
      content: cleaned.slice(i * chunkSize, (i + 1) * chunkSize),
    }));
    debugLogger("chapterExtractor", { step: "fallback", count: chunks.length });
    return chunks;
  }

  debugLogger("chapterExtractor", { step: "found", count: chapters.length });
  return chapters.map((c, i) => ({ ...c, index: i }));
}
