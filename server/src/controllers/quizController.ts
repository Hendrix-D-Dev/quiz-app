import type { Request, Response } from "express";
import { db } from "../config/firebaseAdmin.js";
import type { SubmitPayload, Quiz } from "../utils/types.js";
import { generateQuestionsFromText } from "../services/aiService.js";
import { debugLogger } from "../utils/debugLogger.js";

/** GET /api/quiz */
export async function listQuizzes(req: Request, res: Response) {
  try {
    const snap = await db.collection("quizzes").orderBy("createdAt", "desc").limit(50).get();
    const data = snap.docs.map((d) => {
      const item = d.data();
      return {
        id: d.id,
        title: item.title,
        description: item.description,
        questionsCount: (item.questions || []).length,
      };
    });
    res.json(data);
  } catch (err) {
    debugLogger("quizController", { step: "list-error", err });
    res.status(500).json({ error: "Failed to list quizzes" });
  }
}

/** GET /api/quiz/:id */
export async function getQuiz(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const doc = await db.collection("quizzes").doc(id).get();
    if (!doc.exists) {
      debugLogger("quizController", { step: "getQuiz", id, error: "not-found" });
      return res.status(404).json({ error: "Quiz not found" });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    debugLogger("quizController", { step: "getQuiz-error", err });
    res.status(500).json({ error: "Failed to get quiz" });
  }
}

/** POST /api/quiz/create */
export async function createQuiz(req: Request, res: Response) {
  try {
    const { title, description, text, numQuestions = 10, difficulty = "normal" } = req.body;

    if (!title || !text) return res.status(400).json({ error: "Missing quiz title or text" });

    if (text.trim().length < 1200) {
      return res.status(400).json({
        error: "Text too short. Please provide a longer document for quiz generation.",
      });
    }

    const questions = await generateQuestionsFromText(text, Number(numQuestions), difficulty);

    if (!questions.length) {
      return res.status(500).json({
        error: "No valid questions generated. Try with a longer or more factual text.",
      });
    }

    const quiz: Quiz = {
      id: "",
      title,
      description,
      questions,
      createdBy: (req as any).verifiedUid || "anonymous",
      createdAt: Date.now(),
    };

    const docRef = await db.collection("quizzes").add(quiz);
    quiz.id = docRef.id;
    await docRef.update({ id: docRef.id });

    debugLogger("quizController", { step: "createQuiz", id: quiz.id });
    res.json({ ok: true, quiz });
  } catch (err) {
    debugLogger("quizController", { step: "createQuiz-error", err });
    res.status(500).json({ error: "Failed to create quiz" });
  }
}

/** POST /api/quiz/:id/submit */
export async function submitQuiz(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const payload = req.body as SubmitPayload;

    if (!id) return res.status(400).json({ error: "Missing quiz ID" });

    const docRef = db.collection("quizzes").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      debugLogger("quizController", { step: "submitQuiz", id, error: "quiz-not-found" });
      return res.status(404).json({ error: "Quiz not found" });
    }

    const quiz = doc.data() as Quiz;
    const questions = quiz?.questions || [];

    let correct = 0;
    const total = questions.length;
    const answerMap = payload.answers || {};

    for (const q of questions) {
      const selected = answerMap[q.id];
      if (selected && selected === q.correctAnswer) correct++;
    }

    const uid = (req as any).verifiedUid || payload.uid || "anonymous";
    const score = {
      quizId: id,
      quizTitle: quiz?.title || "Untitled Quiz",
      uid,
      score: correct,
      total,
      createdAt: Date.now(),
    };

    const resultRef = await db.collection("results").add(score);
    debugLogger("quizController", { step: "submitQuiz-success", resultId: resultRef.id });

    // Return resultId for frontend redirect
    res.json({ ok: true, score, resultId: resultRef.id });
  } catch (err) {
    debugLogger("quizController", { step: "submitQuiz-error", err });
    res.status(500).json({ error: "Failed to submit quiz" });
  }
}

/** POST /api/quiz/submit (for generated quizzes) */
export async function submitGeneratedQuiz(req: Request, res: Response) {
  try {
    const { answers, quizTitle = "Generated Quiz" } = req.body || {};
    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ error: "No answers provided" });
    }

    const answeredCount = Object.keys(answers).length;
    debugLogger("quizController", { step: "submitGeneratedQuiz", answeredCount });

    return res.json({
      ok: true,
      message: "Generated quiz submission received successfully.",
      answeredCount,
    });
  } catch (err) {
    debugLogger("quizController", { step: "submitGeneratedQuiz-error", err });
    res.status(500).json({ error: "Failed to submit generated quiz" });
  }
}

/** GET /api/quiz/results */
export async function getResults(req: Request, res: Response) {
  try {
    const uid = (req as any).verifiedUid;
    if (!uid) return res.json([]);

    const snap = await db
      .collection("results")
      .where("uid", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    if (snap.empty) return res.json([]);

    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(data);
  } catch (err: any) {
    if (err.code === 5) return res.json([]);
    res.status(500).json({ error: "Failed to fetch results" });
  }
}

/** POST /api/room/create */
export async function createRoomQuiz(req: Request, res: Response) {
  try {
    const { host, roomName, timeLimit, maxQuestions, roomCode, docText, difficulty = "normal" } =
      req.body;

    if (!roomName || !timeLimit || !maxQuestions || !roomCode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let questions: any[] = [];
    if (docText) {
      if (docText.trim().length < 1200) {
        return res.status(400).json({
          error: "Text too short for quiz generation. Please upload a longer file.",
        });
      }
      questions = await generateQuestionsFromText(docText, Number(maxQuestions), difficulty);
    }

    const roomData = {
      host,
      roomName,
      timeLimit,
      maxQuestions,
      roomCode,
      questions,
      createdAt: Date.now(),
    };

    await db.collection("rooms").doc(roomCode).set(roomData);
    debugLogger("quizController", { step: "createRoomQuiz", roomCode });

    res.json({ ok: true, roomId: roomCode, roomData });
  } catch (err) {
    debugLogger("quizController", { step: "createRoomQuiz-error", err });
    res.status(500).json({ error: "Failed to create room quiz" });
  }
}
