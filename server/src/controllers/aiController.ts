import type { Request, Response } from "express";
import { parseFile } from "../services/parsers/index.js";
import { generateQuestionsFromText } from "../services/aiService.js";
import { extractChaptersFromText } from "../utils/chapterExtractor.js";
import { debugLogger } from "../utils/debugLogger.js";

export async function generateQuiz(req: Request, res: Response) {
  try {
    const numQuestions = Math.max(1, Number(req.body?.numQuestions || 10));
    const difficulty = String(req.body?.difficulty || "normal").toLowerCase();

    let indexes: number[] = [];
    if (typeof req.body.selectedChapterIndexes === "string") {
      try {
        indexes = JSON.parse(req.body.selectedChapterIndexes);
      } catch {
        indexes = [];
      }
    } else if (Array.isArray(req.body.selectedChapterIndexes)) {
      indexes = req.body.selectedChapterIndexes;
    }

    let text: string | undefined = req.body?.text?.trim();

    if (req.file) {
      const fullText = await parseFile(req.file.buffer, req.file.originalname);
      const allChapters = extractChaptersFromText(fullText);

      if (indexes.length > 0) {
        const selected = indexes
          .map((i) => allChapters[i]?.content || "")
          .filter(Boolean)
          .join("\n\n");
        text = selected.trim().length > 100 ? selected : fullText;
      } else text = fullText;
    }

    if (!text || text.trim().length < 10) {
      return res
        .status(400)
        .json({ error: "No valid text to generate quiz from" });
    }

    const questions = await generateQuestionsFromText(text, numQuestions, difficulty);

    if (!questions?.length) {
      debugLogger("aiController", {
        step: "empty-result",
        message: "No questions generated from text",
      });
      return res.status(500).json({
        error:
          "No questions generated from text. Please check your Mistral API key or text content.",
      });
    }

    res.json({ ok: true, count: questions.length, questions });
  } catch (err: any) {
    debugLogger("aiController", {
      step: "unhandled-error",
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({
      error: err.message || "Internal server error",
    });
  }
}
