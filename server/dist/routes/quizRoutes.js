import { Router } from "express";
import { listQuizzes, getQuiz, submitQuiz, submitGeneratedQuiz, getResults, } from "../controllers/quizController.js";
import { verifyFirebaseTokenMiddleware } from "./_helpers.js";
const router = Router();
// Public: list quizzes
router.get("/", listQuizzes);
// Public: get a single quiz
router.get("/:id", getQuiz);
// Protected: get user's results
router.get("/results/all", verifyFirebaseTokenMiddleware, getResults);
// Protected: submit saved quiz and return resultId
router.post("/:id/submit", verifyFirebaseTokenMiddleware, submitQuiz);
// Public: submit generated quiz
router.post("/submit", submitGeneratedQuiz);
export default router;
