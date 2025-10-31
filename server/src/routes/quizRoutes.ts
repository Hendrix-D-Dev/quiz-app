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
import { verifyFirebaseTokenMiddleware } from "./_helpers.js";

const router = Router();

// Public: list quizzes
router.get("/", listQuizzes);

// Public: get a single quiz
router.get("/:id", getQuiz);

// Protected: get user's results
router.get("/results/all", verifyFirebaseTokenMiddleware, getResults);

// Protected: get latest result
router.get("/results/latest", verifyFirebaseTokenMiddleware, getLatestResult);

// Protected: get specific result by ID
router.get("/results/:id", verifyFirebaseTokenMiddleware, getResultById);

// Protected: submit saved quiz and return resultId
router.post("/:id/submit", verifyFirebaseTokenMiddleware, submitQuiz);

// Public: submit generated quiz (no auth required)
router.post("/submit", submitGeneratedQuiz);

export default router;