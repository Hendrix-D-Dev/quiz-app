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
    if (!doc.exists) return res.status(404).json({ error: "Quiz not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    debugLogger("quizController", { step: "getQuiz-error", err });
    res.status(500).json({ error: "Failed to get quiz" });
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
    if (!doc.exists) return res.status(404).json({ error: "Quiz not found" });

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

/** GET /api/quiz/results/all */
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
    res.status(500).json({ error: "Failed to fetch results" });
  }
}

/** ✅ GET /api/quiz/results/latest */
export async function getLatestResult(req: Request, res: Response) {
  try {
    const uid = (req as any).verifiedUid;
    
    debugLogger("getLatestResult", { 
      uid: uid, 
      hasUid: !!uid,
      collection: "results" 
    });

    if (!uid) return res.json(null);

    const snap = await db
      .collection("results")
      .where("uid", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    debugLogger("getLatestResult", { 
      resultsCount: snap.size,
      empty: snap.empty 
    });

    if (snap.empty) return res.json(null);

    const doc = snap.docs[0];
    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    debugLogger("getLatestResult", { step: "error", error: err.message });
    res.status(500).json({ error: "Failed to fetch latest result" });
  }
}

/** ✅ GET /api/quiz/results/:id */
export async function getResultById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const uid = (req as any).verifiedUid;
    
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const doc = await db.collection("results").doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: "Result not found" });
    }

    const result = doc.data();
    
    // Ensure user can only access their own results
    if (result?.uid !== uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ id: doc.id, ...result });
  } catch (err: any) {
    debugLogger("quizController", { step: "getResultById-error", err });
    res.status(500).json({ error: "Failed to fetch result" });
  }
}