import { Router, type Request, type Response } from "express";
import { upload } from "../middleware/upload.js";
import { generateQuiz } from "../controllers/aiController.js";
import { verifyFirebaseTokenMiddleware } from "../middleware/authMiddleware.js";
import { debugLogger } from "../utils/debugLogger.js";

const router = Router();

const generateQuizHandler = async (req: Request, res: Response) => {
  try {
    debugLogger("aiRoutes", {
      step: "request-received",
      hasFile: !!req.file,
      fileInfo: req.file
        ? {
            name: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : "no-file",
      bodyKeys: Object.keys(req.body || {}),
    });

    const numQuestions = Number(req.body?.numQuestions || req.query?.numQuestions || 10);
    const difficulty = String(req.body?.difficulty || req.query?.difficulty || "normal").toLowerCase();

    req.body.numQuestions = numQuestions;
    req.body.difficulty = difficulty;

    if (typeof req.body.selectedChapterIndexes === "string") {
      try {
        req.body.selectedChapterIndexes = JSON.parse(req.body.selectedChapterIndexes);
      } catch {
        req.body.selectedChapterIndexes = [];
      }
    }

    debugLogger("aiRoutes", {
      step: "normalized",
      numQuestions,
      difficulty,
    });

    return await generateQuiz(req, res);
  } catch (err: any) {
    debugLogger("aiRoutes", {
      step: "handler-error",
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({ error: "Quiz generation failed" });
  }
};

router.post(
  "/generate-quiz",
  verifyFirebaseTokenMiddleware,
  upload.single("file"),
  generateQuizHandler
);

export default router;