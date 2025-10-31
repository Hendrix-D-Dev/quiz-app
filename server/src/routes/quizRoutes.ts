import { Router } from "express";
import {
  listQuizzes,
  getQuiz,
  submitQuiz,
  submitGeneratedQuiz,
  getResults,
  getLatestResult,
  getResultById,
} from "../controllers/quizController.js";
import { verifyFirebaseTokenMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

// Public: list quizzes
router.get("/", listQuizzes);

// Public: submit generated quiz (no auth required)
router.post("/submit", submitGeneratedQuiz);

// ⚠️ CRITICAL: These routes must come BEFORE /:id to avoid conflicts
// Protected: get user's results
router.get("/results/all", verifyFirebaseTokenMiddleware, getResults);

// Protected: get latest result
router.get("/results/latest", verifyFirebaseTokenMiddleware, getLatestResult);

// Protected: get specific result by ID
router.get("/results/:id", verifyFirebaseTokenMiddleware, getResultById);

// Public: get a single quiz (MUST come after /results/* routes)
router.get("/:id", getQuiz);

// Protected: submit saved quiz and return resultId
router.post("/:id/submit", verifyFirebaseTokenMiddleware, submitQuiz);

export default router;