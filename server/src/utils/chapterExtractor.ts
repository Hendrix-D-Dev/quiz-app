import { debugLogger } from "../utils/debugLogger.js";

export function extractChaptersFromText(text: string) {
  // Early detection of image-based PDF
  if (isLikelyImageBasedPdf(text)) {
    debugLogger("chapterExtractor", { 
      step: "image-based-pdf-detected",
      textLength: text.length 
    });
    return createFallbackChunks(text);
  }

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
    debugLogger("chapterExtractor", { step: "fallback", count: 4 });
    return createFallbackChunks(cleaned);
  }

  debugLogger("chapterExtractor", { step: "found", count: chapters.length });
  return chapters.map((c, i) => ({ ...c, index: i }));
}

/** Create fallback chunks for image-based or chapterless PDFs */
function createFallbackChunks(text: string) {
  const chunkSize = Math.ceil(text.length / 4);
  return Array.from({ length: 4 }, (_, i) => ({
    title: `Part ${i + 1}`,
    content: text.slice(i * chunkSize, (i + 1) * chunkSize),
    index: i
  }));
}

/** Detect image-based PDF content */
function isLikelyImageBasedPdf(text: string): boolean {
  if (!text || text.length < 200) return true;
  
  const pdfMetadataPatterns = [
    /%PDF-\d\.\d/,
    /\/Producer/,
    /\/Creator/,
    /\/CreationDate/,
    /obj[\d\s]+obj/,
    /stream[\s\S]*?endstream/
  ];

  const metadataMatches = pdfMetadataPatterns.filter(pattern => 
    pattern.test(text)
  ).length;

  // Count readable content
  const sentences = text.split(/[.!?]+/);
  const readableSentences = sentences.filter(sentence => 
    sentence.trim().length > 20 && 
    !isGibberish(sentence)
  );

  return metadataMatches >= 3 && readableSentences.length < 5;
}

function isGibberish(text: string): boolean {
  const specialCharRatio = (text.replace(/[a-zA-Z0-9\s]/g, '').length) / text.length;
  return specialCharRatio > 0.4;
}