import fetch from "node-fetch";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { debugLogger } from "../utils/debugLogger.js";
import type { Question } from "../utils/types.js";

/* -------------------------------------------------- */
/* 🧩 Enhanced text validation before processing      */
/* -------------------------------------------------- */
async function chunkText(text: string, maxChars = 1500): Promise<string[]> {
  // Enhanced validation for image-based PDFs
  const cleanText = cleanAndValidateText(text);
  
  if (cleanText.length < 100) {
    debugLogger("aiService", {
      step: "text-too-short",
      originalLength: text.length,
      cleanLength: cleanText.length,
      preview: cleanText.slice(0, 200)
    });
    throw new Error("INVALID_CONTENT: Extracted text is too short for quiz generation");
  }

  // Check if text appears to be from image-based PDF
  if (isLikelyImageBasedPdf(cleanText)) {
    debugLogger("aiService", {
      step: "image-based-pdf-detected",
      textLength: cleanText.length,
      preview: cleanText.slice(0, 300)
    });
    throw new Error("INVALID_CONTENT: This appears to be an image-based PDF. Please use a PDF with selectable text.");
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: maxChars,
    chunkOverlap: 200,
  });
  const docs = await splitter.createDocuments([cleanText]);
  return docs.map((d: { pageContent: string }) => d.pageContent);
}

/* -------------------------------------------------- */
/* 🔍 Detect image-based PDF content                  */
/* -------------------------------------------------- */
function isLikelyImageBasedPdf(text: string): boolean {
  if (!text || text.length < 200) return true;
  
  // Check for PDF metadata patterns that indicate image-based content
  const pdfMetadataPatterns = [
    /%PDF-\d\.\d/,
    /\/Producer.*calibre/,
    /\/Creator.*calibre/,
    /\/CreationDate/,
    /obj[\d\s]+obj/,
    /stream[\s\S]*?endstream/,
    /\/Width\s+\d+/,
    /\/Height\s+\d+/,
    /\/Filter\s*\/DCTDecode/,
    /\/ColorSpace\s*\/DeviceRGB/
  ];

  const metadataMatches = pdfMetadataPatterns.filter(pattern => 
    pattern.test(text)
  ).length;

  // Count readable sentences vs gibberish
  const sentences = text.split(/[.!?]+/);
  const readableSentences = sentences.filter(sentence => 
    sentence.trim().length > 20 && 
    !isGibberish(sentence) &&
    !isPdfMetadata(sentence)
  );

  const readableRatio = readableSentences.length / Math.max(sentences.length, 1);
  
  // If high metadata count and low readable content, likely image-based
  return metadataMatches >= 3 && readableRatio < 0.1;
}

function isPdfMetadata(text: string): boolean {
  const metadataPatterns = [
    /^\d+\s+\d+\s+obj$/,
    /^<<.*>>$/,
    /^\/\w+\s+/,
    /^%\w+/,
    /stream|endstream/,
    /\/Width|\/Height|\/Filter|\/ColorSpace/
  ];
  
  return metadataPatterns.some(pattern => pattern.test(text.trim()));
}

/* -------------------------------------------------- */
/* 🧠 Enhanced text cleaning and validation           */
/* -------------------------------------------------- */
function cleanAndValidateText(text: string): string {
  if (!text || text.trim().length === 0) {
    throw new Error("INVALID_CONTENT: No text content extracted");
  }

  // Remove non-printable characters
  let cleanText = text
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Check for metadata-heavy content
  const metadataRatio = calculateMetadataRatio(cleanText);
  if (metadataRatio > 0.3) {
    debugLogger("aiService", {
      step: "metadata-heavy-content",
      metadataRatio: metadataRatio,
      preview: cleanText.slice(0, 300)
    });
    
    // Try aggressive cleaning
    cleanText = aggressiveCleanText(cleanText);
    
    // Re-check after cleaning
    const newMetadataRatio = calculateMetadataRatio(cleanText);
    if (newMetadataRatio > 0.2) {
      throw new Error("INVALID_CONTENT: Text contains mostly PDF metadata instead of educational content");
    }
  }

  // Check for sufficient educational content
  if (!hasSubstantialEducationalContent(cleanText)) {
    debugLogger("aiService", {
      step: "insufficient-educational-content",
      wordCount: cleanText.split(/\s+/).length,
      preview: cleanText.slice(0, 300)
    });
    throw new Error("INVALID_CONTENT: Insufficient educational content for quiz generation");
  }

  return cleanText;
}

/* -------------------------------------------------- */
/* 🔍 Aggressive text cleaning for problematic PDFs   */
/* -------------------------------------------------- */
function aggressiveCleanText(text: string): string {
  return text
    // Remove lines with common metadata patterns
    .split('\n')
    .filter(line => !isMetadataLine(line))
    .join('\n')
    // Remove specific PDF artifacts
    .replace(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/g, '')
    .replace(/(\+00'00'|Z)/g, '')
    .replace(/(www\.|http[s]?:\/\/).*?(?=\s|$)/g, '')
    .replace(/\b(Adobe|Identity|PDF|CRH|G|cJ|rJ9|USER)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* -------------------------------------------------- */
/* 🔍 Enhanced content validation functions           */
/* -------------------------------------------------- */
function calculateMetadataRatio(text: string): number {
  const metadataKeywords = [
    'producer', 'creator', 'creationdate', 'moddate', 
    'pdf', 'adobe', 'version', 'trapped', 'keywords',
    'subject', 'title', 'author', 'page', 'pages',
    'identity', 'crh', 'g', 'cj', 'rj9', 'user', 'ilovepdf'
  ];
  
  const words = text.toLowerCase().split(/\s+/);
  if (words.length === 0) return 0;
  
  const metadataWords = words.filter(word => 
    metadataKeywords.some(keyword => word.includes(keyword))
  );
  
  return metadataWords.length / words.length;
}

function hasSubstantialEducationalContent(text: string): boolean {
  if (!text || text.length < 100) return false;
  
  // Count substantial words (longer than 3 characters)
  const words = text.split(/\s+/).filter(word => word.length > 3);
  const uniqueWords = new Set(words);
  
  // Count sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  // More lenient criteria
  return words.length >= 50 || // At least 50 substantial words
         uniqueWords.size >= 20 || // Or 20 unique words  
         sentences.length >= 2; // Or 2 sentences
}

function isMetadataLine(line: string): boolean {
  const metadataPatterns = [
    /^(Producer|Creator|CreationDate|ModDate|Keywords|Subject|Title|Author):/i,
    /^Page \d+ of \d+$/i,
    /^\d+\s+\d+\s+\w+$/, // PDF object references
    /^<<.*>>$/, // PDF dictionaries
    /^.*Adobe.*$/i,
    /^.*Identity.*$/i,
    /^.*www\.ilovepdf\.com.*$/i,
    /^\d{4}-\d{2}-\d{2}.*$/i, // Dates
  ];
  
  return metadataPatterns.some(pattern => pattern.test(line.trim()));
}

function isGibberish(text: string): boolean {
  const specialCharRatio = (text.replace(/[a-zA-Z0-9\s]/g, '').length) / text.length;
  if (specialCharRatio > 0.4) return true;
  
  const unusualPatterns = [
    /[{}<>\[\]\\\/]{3,}/g,
    /[^\x20-\x7E]{3,}/g,
    /(\S)\1{4,}/g,
  ];
  
  return unusualPatterns.some(pattern => pattern.test(text));
}

/* -------------------------------------------------- */
/* 🧠 Build enhanced structured prompt for Mistral    */
/* -------------------------------------------------- */
function buildPrompt(chunk: string, count: number, difficulty: string) {
  const difficultyNote =
    difficulty === "hard"
      ? "Make questions analytical and complex, testing deep understanding."
      : difficulty === "medium"
      ? "Make questions moderately challenging, testing comprehension."
      : "Keep questions simple and clear, testing basic recall.";

  // Extract a clean sample for the prompt
  const cleanSample = extractContentSample(chunk);

  return `
You are an expert educational quiz generator. Create ${count} high-quality multiple-choice questions based EXCLUSIVELY on the provided educational content.

CRITICAL REQUIREMENTS:
1. Questions MUST be directly based on the educational content in the text
2. IGNORE completely any metadata about PDF creation, software, dates, or technical details
3. Each question must have exactly 4 plausible options (A, B, C, D)
4. Only ONE correct answer per question
5. Options should be clear, distinct, and plausible
6. Questions should test conceptual understanding, not just memorization
7. Focus on key concepts, main ideas, and important details from the content

${difficultyNote}

EDUCATIONAL CONTENT TO USE:
"""
${cleanSample}
"""

IMPORTANT: If the content appears to be mostly metadata, corrupted, or non-educational, respond with exactly: "INVALID_CONTENT"

OTHERWISE, return ONLY a valid JSON array with this exact structure:
[
  {
    "question": "Clear question based on the educational content",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": "Option A"
  }
]

Do not include any explanations or additional text outside the JSON array.
`;
}

/* -------------------------------------------------- */
/* 🔍 Extract clean content sample for prompt         */
/* -------------------------------------------------- */
function extractContentSample(text: string, maxLength: number = 2500): string {
  // Split into paragraphs and filter out metadata-like paragraphs
  const paragraphs = text.split('\n\n')
    .filter(para => {
      const words = para.split(/\s+/);
      const uniqueWords = new Set(words);
      return words.length >= 5 && // Reduced from 10
             uniqueWords.size > 3 && // Reduced from 5
             !isMetadataParagraph(para);
    })
    .slice(0, 10); // Take first 10 substantial paragraphs
  
  const sample = paragraphs.join('\n\n').substring(0, maxLength);
  
  // If we have very little content after filtering, use the original text
  return sample.length > 100 ? sample : text.substring(0, maxLength);
}

function isMetadataParagraph(paragraph: string): boolean {
  const metadataTerms = ['producer', 'creator', 'creationdate', 'pdf', 'version', 'adobe', 'identity'];
  const lowerPara = paragraph.toLowerCase();
  const metadataCount = metadataTerms.filter(term => lowerPara.includes(term)).length;
  return metadataCount >= 2; // Only filter if multiple metadata terms
}

/* -------------------------------------------------- */
/* 🔍 Parse JSON output safely                        */
/* -------------------------------------------------- */
function safeParse(raw: string): Question[] {
  try {
    // Check for invalid content response
    if (raw.trim() === 'INVALID_CONTENT') {
      throw new Error('AI detected invalid content for question generation');
    }

    // More robust cleaning
    const cleaned = raw
      .replace(/```json|```/gi, "")
      .replace(/^[^{[]*/, '') // Remove anything before first [ or {
      .replace(/[^}\]]*$/, '') // Remove anything after last } or ]
      .trim();

    if (!cleaned) {
      throw new Error("Empty response after cleaning");
    }

    const parsed = JSON.parse(cleaned);
    
    if (!Array.isArray(parsed)) {
      throw new Error("Response is not an array");
    }

    const questions = parsed.map((q: any, i: number) => {
      // Validate question structure
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || !q.correct) {
        debugLogger("aiService", {
          step: "invalid-question-structure",
          index: i,
          question: q.question,
          optionsCount: q.options?.length,
          hasCorrect: !!q.correct
        });
        return null;
      }

      return {
        id: `q-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correct,
      };
    }).filter(Boolean) as Question[]; // Remove null entries

    // Validate question quality (more lenient)
    if (!validateQuestionQuality(questions)) {
      throw new Error('POOR_QUALITY_QUESTIONS: Questions appear to be based on metadata or poor content');
    }

    return questions;
  } catch (err) {
    debugLogger("aiService", {
      step: "parse-failed",
      rawPreview: raw.slice(0, 300),
      error: (err as Error).message,
    });
    
    if ((err as Error).message.includes('INVALID_CONTENT') || 
        (err as Error).message.includes('POOR_QUALITY_QUESTIONS')) {
      throw err; // Re-throw these specific errors
    }
    
    return [];
  }
}

/* -------------------------------------------------- */
/* 🔍 Validate question quality (more lenient)        */
/* -------------------------------------------------- */
function validateQuestionQuality(questions: Question[]): boolean {
  if (!questions || questions.length === 0) return false;

  const metadataKeywords = [
    'pdf', 'creator', 'producer', 'adobe', 'creation date', 
    'software', 'version', 'metadata', 'document properties'
  ];

  let qualityQuestions = 0;

  for (const question of questions) {
    const questionText = `${question.question} ${question.options?.join(' ') || ''}`.toLowerCase();
    
    // Check for metadata focus
    const hasMetadataFocus = metadataKeywords.some(keyword => 
      questionText.includes(keyword)
    );

    // Check question structure quality
    const hasGoodStructure = question.question.length > 15 && // Reduced from 20
                            question.question.length < 250;

    if (!hasMetadataFocus && hasGoodStructure) {
      qualityQuestions++;
    }
  }

  // More lenient: At least 40% of questions should be quality questions (reduced from 60%)
  return qualityQuestions / questions.length >= 0.4;
}

/* -------------------------------------------------- */
/* 🚀 Generate Questions with better error handling   */
/* -------------------------------------------------- */
export async function generateQuestionsFromText(
  text: string,
  numQuestions: number,
  difficulty: string = "normal"
): Promise<Question[]> {
  if (!process.env.MISTRAL_API_KEY || !process.env.MISTRAL_API_ENDPOINT) {
    throw new Error(
      "Mistral API key or endpoint missing. Set MISTRAL_API_KEY and MISTRAL_API_ENDPOINT in .env"
    );
  }

  debugLogger("aiService", {
    step: "generate-questions-start",
    textLength: text.length,
    numQuestions,
    difficulty,
    textPreview: text.slice(0, 200) + "..."
  });

  const chunks = await chunkText(text);
  const perChunk = Math.max(1, Math.ceil(numQuestions / chunks.length));
  
  debugLogger("aiService", { 
    step: "chunking-complete", 
    chunks: chunks.length, 
    perChunk,
    firstChunkPreview: chunks[0]?.slice(0, 100) 
  });

  const questions: Question[] = [];
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 5;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Skip if too many consecutive failures
    if (consecutiveFailures >= maxConsecutiveFailures) {
      debugLogger("aiService", {
        step: "too-many-failures",
        consecutiveFailures,
        stopping: true
      });
      break;
    }

    const prompt = buildPrompt(chunk, perChunk, difficulty);

    try {
      debugLogger("aiService", {
        step: "api-request",
        chunkIndex: i,
        promptLength: prompt.length
      });

      const response = await fetch(process.env.MISTRAL_API_ENDPOINT!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: "mistral-large-latest",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        debugLogger("aiService", {
          step: "api-failed",
          status: response.status,
          statusText: response.statusText,
          errorBody: errText.slice(0, 500),
        });
        
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        throw new Error(
          `Mistral API error (${response.status}): ${response.statusText}`
        );
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string }; content?: string }[];
      };

      const output =
        data.choices?.[0]?.message?.content ??
        data.choices?.[0]?.content ??
        JSON.stringify(data);

      debugLogger("aiService", {
        step: "api-response",
        chunkIndex: i,
        outputLength: output.length,
        outputPreview: output.slice(0, 200)
      });

      const parsed = safeParse(output);
      debugLogger("aiService", {
        step: "parsed-questions",
        chunkIndex: i,
        parsedCount: parsed.length
      });

      if (parsed.length > 0) {
        questions.push(...parsed);
        consecutiveFailures = 0; // Reset counter on success
      } else {
        consecutiveFailures++;
      }

      if (questions.length >= numQuestions) {
        debugLogger("aiService", {
          step: "enough-questions",
          totalQuestions: questions.length,
          target: numQuestions
        });
        break;
      }
    } catch (err: any) {
      debugLogger("aiService", {
        step: "chunk-error",
        chunkIndex: i,
        error: err.message,
      });
      
      consecutiveFailures++;
      
      // Re-throw specific content validation errors
      if (err.message.includes('INVALID_CONTENT') || 
          err.message.includes('POOR_QUALITY_QUESTIONS')) {
        throw err;
      }
      
      // Continue with next chunk for other errors
    }
  }

  debugLogger("aiService", {
    step: "generation-complete",
    totalQuestionsGenerated: questions.length,
    targetQuestions: numQuestions
  });

  if (questions.length === 0) {
    throw new Error("No questions could be generated. The document may be image-based, contain insufficient content, or the AI service is unavailable.");
  }

  return questions.slice(0, numQuestions);
}