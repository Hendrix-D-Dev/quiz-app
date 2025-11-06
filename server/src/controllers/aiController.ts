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
      debugLogger("aiController", {
        step: "processing-file",
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        selectedChapterIndexes: indexes
      });

      const fullText = await parseFile(req.file.buffer, req.file.originalname);
      const allChapters = extractChaptersFromText(fullText);

      debugLogger("aiController", {
        step: "chapters-extracted", 
        totalChapters: allChapters.length,
        chapterTitles: allChapters.map(c => c.title)
      });

      if (indexes.length > 0) {
        // Use selected chapters
        const selected = indexes
          .map((i) => allChapters[i]?.content || "")
          .filter(Boolean)
          .join("\n\n");
        text = selected.trim().length > 50 ? selected : fullText; // Reduced threshold
      } else {
        // Use all content if no chapters selected
        text = fullText;
      }

      debugLogger("aiController", {
        step: "text-prepared",
        usingChapters: indexes.length > 0,
        finalTextLength: text.length,
        preview: text.substring(0, 200)
      });
    }

    if (!text || text.trim().length < 50) { // Reduced from 100
      debugLogger("aiController", {
        step: "insufficient-text",
        textLength: text?.length || 0
      });
      return res.status(400).json({ 
        error: "Not enough text content to generate quiz. Please try a different document with more readable text." 
      });
    }

    const questions = await generateQuestionsFromText(text, numQuestions, difficulty);

    if (!questions?.length) {
      debugLogger("aiController", {
        step: "empty-result",
        textLength: text.length,
        message: "No questions generated from text",
      });
      return res.status(500).json({
        error: "No questions could be generated. The document may contain insufficient educational content or the AI service is unavailable.",
      });
    }

    res.json({ ok: true, count: questions.length, questions });
  } catch (err: any) {
    debugLogger("aiController", {
      step: "unhandled-error",
      error: err.message,
      stack: err.stack,
    });
    
    // Provide more user-friendly error messages
    let userMessage = err.message || "Internal server error";
    if (err.message.includes('INVALID_CONTENT') || err.message.includes('image-based')) {
      userMessage = "This document appears to be image-based or contains insufficient text. Please use a document with selectable text.";
    } else if (err.message.includes('Mistral API')) {
      userMessage = "AI service temporarily unavailable. Please try again in a few moments.";
    } else if (err.message.includes('OCR') || err.message.includes('image')) {
      userMessage = "Unable to extract readable text from this image. Please try a clearer image with visible text.";
    }
    
    res.status(500).json({
      error: userMessage,
    });
  }
}