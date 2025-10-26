import fetch from "node-fetch";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { debugLogger } from "../utils/debugLogger.js";
/* -------------------------------------------------- */
/* 🧩 Chunk text using LangChain’s Recursive Splitter */
/* -------------------------------------------------- */
async function chunkText(text, maxChars = 2000) {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: maxChars,
        chunkOverlap: 200,
    });
    const docs = await splitter.createDocuments([text]);
    return docs.map((d) => d.pageContent);
}
/* -------------------------------------------------- */
/* 🧠 Build structured prompt for Mistral             */
/* -------------------------------------------------- */
function buildPrompt(chunk, count, difficulty) {
    const difficultyNote = difficulty === "hard"
        ? "Make questions analytical and complex."
        : difficulty === "medium"
            ? "Make questions moderately challenging."
            : "Keep questions simple and clear.";
    return `
You are a quiz generator AI. Generate ${count} multiple-choice questions strictly based on the following text.

Each question must include:
- "question": The question text
- "options": 4 possible answers (A, B, C, D)
- "correct": The correct answer text

${difficultyNote}

Text:
"""${chunk}"""

Return only a valid JSON array:
[
  { "question": "...", "options": ["A", "B", "C", "D"], "correct": "A" }
]
`;
}
/* -------------------------------------------------- */
/* 🔍 Parse JSON output safely                        */
/* -------------------------------------------------- */
function safeParse(raw) {
    try {
        const cleaned = raw.replace(/```json|```/gi, "").trim();
        const parsed = JSON.parse(cleaned);
        return Array.isArray(parsed)
            ? parsed.map((q, i) => ({
                id: `q-${i}-${Date.now()}`,
                question: q.question || "",
                options: q.options || [],
                correctAnswer: q.correct || "",
            }))
            : [];
    }
    catch (err) {
        debugLogger("aiService", {
            step: "parse-failed",
            preview: raw.slice(0, 200),
            error: err.message,
        });
        return [];
    }
}
/* -------------------------------------------------- */
/* 🚀 Generate Questions using Mistral API            */
/* -------------------------------------------------- */
export async function generateQuestionsFromText(text, numQuestions, difficulty = "normal") {
    if (!process.env.MISTRAL_API_KEY || !process.env.MISTRAL_API_ENDPOINT) {
        throw new Error("Mistral API key or endpoint missing. Set MISTRAL_API_KEY and MISTRAL_API_ENDPOINT in .env");
    }
    const chunks = await chunkText(text);
    const perChunk = Math.max(1, Math.ceil(numQuestions / chunks.length));
    debugLogger("aiService", { step: "chunking", chunks: chunks.length, perChunk });
    const questions = [];
    for (const chunk of chunks) {
        const prompt = buildPrompt(chunk, perChunk, difficulty);
        try {
            const response = await fetch(process.env.MISTRAL_API_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "mistral-large-latest",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3,
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
                throw new Error(`Mistral API error (${response.status}): ${response.statusText}`);
            }
            // ✅ FIXED: cast 'data' instead of assigning directly
            const data = (await response.json());
            debugLogger("aiService", {
                step: "api-success",
                hasChoices: !!data.choices,
                sample: JSON.stringify(data).slice(0, 200),
            });
            const output = data.choices?.[0]?.message?.content ??
                data.choices?.[0]?.content ??
                JSON.stringify(data);
            const parsed = safeParse(output);
            questions.push(...parsed);
            if (questions.length >= numQuestions)
                break;
        }
        catch (err) {
            debugLogger("aiService", {
                step: "chunk-error",
                error: err.message,
            });
        }
    }
    if (questions.length === 0) {
        debugLogger("aiService", { step: "no-questions", textPreview: text.slice(0, 200) });
    }
    return questions.slice(0, numQuestions);
}
