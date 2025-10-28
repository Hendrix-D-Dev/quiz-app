import fetch from "node-fetch";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { debugLogger } from "../utils/debugLogger.js";
import type { Question } from "../utils/types.js";

/* -------------------------------------------------- */
/* 🧩 Chunk text using LangChain’s Recursive Splitter */
/* -------------------------------------------------- */
async function chunkText(text: string, maxChars = 1500): Promise<string[]> {
  // Clean text first to remove garbage characters
  const cleanText = text
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Remove non-printable chars
    .replace(/\s+/g, ' ')
    .trim();
  
  if (cleanText.length < 100) {
    debugLogger("aiService", {
      step: "text-too-short",
      originalLength: text.length,
      cleanLength: cleanText.length,
      preview: cleanText.slice(0, 200)
    });
    throw new Error("Extracted text is too short for quiz generation");
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: maxChars,
    chunkOverlap: 200,
  });
  const docs = await splitter.createDocuments([cleanText]);
  return docs.map((d: { pageContent: string }) => d.pageContent);
}

/* -------------------------------------------------- */
/* 🧠 Build structured prompt for Mistral             */
/* -------------------------------------------------- */
function buildPrompt(chunk: string, count: number, difficulty: string) {
  const difficultyNote =
    difficulty === "hard"
      ? "Make questions analytical and complex, testing deep understanding."
      : difficulty === "medium"
      ? "Make questions moderately challenging, testing comprehension."
      : "Keep questions simple and clear, testing basic recall.";

  return `
You are an expert quiz generator. Create ${count} high-quality multiple-choice questions based EXCLUSIVELY on the provided text.

CRITICAL REQUIREMENTS:
1. Questions MUST be directly based on information in the text
2. Each question must have exactly 4 plausible options (A, B, C, D)
3. Only ONE correct answer per question
4. Options should be clear and distinct
5. Questions should test understanding, not just memorization

${difficultyNote}

TEXT TO USE:
"""
${chunk}
"""

IMPORTANT: Return ONLY a valid JSON array with this exact structure:
[
  {
    "question": "Clear question based on the text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": "Option A"
  }
]

Do not include any explanations or additional text outside the JSON array.
`;
}

/* -------------------------------------------------- */
/* 🔍 Parse JSON output safely                        */
/* -------------------------------------------------- */
function safeParse(raw: string): Question[] {
  try {
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

    return parsed.map((q: any, i: number) => {
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
  } catch (err) {
    debugLogger("aiService", {
      step: "parse-failed",
      rawPreview: raw.slice(0, 300),
      error: (err as Error).message,
    });
    return [];
  }
}

/* -------------------------------------------------- */
/* 🚀 Generate Questions using Mistral API            */
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

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
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

      questions.push(...parsed);

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
      // Continue with next chunk instead of failing completely
    }
  }

  debugLogger("aiService", {
    step: "generation-complete",
    totalQuestionsGenerated: questions.length,
    targetQuestions: numQuestions
  });

  if (questions.length === 0) {
    throw new Error("No questions could be generated from the provided text. The text may be too short, low quality, or the AI service may be unavailable.");
  }

  return questions.slice(0, numQuestions);
}