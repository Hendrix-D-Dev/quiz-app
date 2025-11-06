import { debugLogger } from "../utils/debugLogger.js";

export function extractChaptersFromText(text: string) {
  // Early detection of image-based PDF - MORE LENIENT
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

  // More comprehensive chapter patterns
  const chapterPatterns = [
    /\b(?:Chapter|CHAPTER|Ch\.?|CH\.?)\s*([0-9IVXLC]+|[A-Z]+)?[\.:]?\s*(.*?)(?=(?:Chapter|CHAPTER|Ch\.?|CH\.?)\s+[0-9IVXLC]+|$)/gis,
    /\b(?:Unit|UNIT|Part|PART)\s*([0-9IVXLC]+|[A-Z])[\.:]?\s*(.*?)(?=(?:Unit|UNIT|Part|PART)\s+[0-9IVXLC]+|$)/gis,
    /\b(?:Section|SECTION|Sec\.?|SEC\.?)\s*([0-9IVXLC]+|[A-Z])[\.:]?\s*(.*?)(?=(?:Section|SECTION|Sec\.?|SEC\.?)\s+[0-9IVXLC]+|$)/gis,
    /^(\d+\.\d*)\s+(.*)$/gm, // Numbered sections like "1.1 Introduction"
  ];

  let chapters: { title: string; content: string }[] = [];

  for (const regex of chapterPatterns) {
    regex.lastIndex = 0; // Reset regex
    let match;
    while ((match = regex.exec(cleaned)) !== null) {
      let title = "";
      if (match[1] && match[2]) {
        title = `${match[1]}. ${match[2]}`.trim();
      } else if (match[0]) {
        title = match[0].trim();
      }
      
      const content = match[0].trim();
      if (content.length > 100 && !chapters.some(ch => ch.content === content)) {
        chapters.push({ title, content });
      }
    }
    
    if (chapters.length > 0) break; // Use first pattern that finds chapters
  }

  // Always return at least one "chapter" with the full content
  if (chapters.length === 0) {
    debugLogger("chapterExtractor", { 
      step: "no-chapters-found-using-full-content",
      textLength: cleaned.length 
    });
    
    // Split into reasonable chunks if text is long
    if (cleaned.length > 5000) {
      return createFallbackChunks(cleaned);
    } else {
      return [{ 
        title: "Document Content", 
        content: cleaned,
        index: 0 
      }];
    }
  }

  debugLogger("chapterExtractor", { 
    step: "chapters-found", 
    count: chapters.length,
    titles: chapters.map(c => c.title) 
  });
  
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

/** Detect image-based PDF content - MORE LENIENT */
function isLikelyImageBasedPdf(text: string): boolean {
  if (!text || text.length < 100) return false; // Don't auto-reject short texts
  
  const pdfMetadataPatterns = [
    /%PDF-\d\.\d/,
    /\/Producer/,
    /\/Creator/,
    /\/CreationDate/,
  ];

  const metadataMatches = pdfMetadataPatterns.filter(pattern => 
    pattern.test(text)
  ).length;

  // Count readable sentences more leniently
  const sentences = text.split(/[.!?]+/);
  const readableSentences = sentences.filter(sentence => 
    sentence.trim().length > 15 && 
    !isGibberish(sentence)
  );

  // Only classify as image-based if we have high metadata AND very low readable content
  return metadataMatches >= 3 && readableSentences.length < 3;
}

function isGibberish(text: string): boolean {
  const specialCharRatio = (text.replace(/[a-zA-Z0-9\s]/g, '').length) / text.length;
  return specialCharRatio > 0.4;
}