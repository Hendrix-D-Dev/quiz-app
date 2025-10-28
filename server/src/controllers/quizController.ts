import type { Request, Response } from "express";
import { db } from "../config/firebaseAdmin.js";
import type { SubmitPayload, Quiz, Result } from "../utils/types.js"; // ✅ Import Result type
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

    debugLogger("quizController", { 
      step: "submitting-result", 
      uid,
      score: `${correct}/${total}`,
      quizTitle: score.quizTitle
    });

    const resultRef = await db.collection("results").add(score);
    debugLogger("quizController", { 
      step: "submitQuiz-success", 
      resultId: resultRef.id,
      savedScore: score
    });

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
    debugLogger("quizController", { 
      step: "submitGeneratedQuiz", 
      answeredCount,
      quizTitle 
    });

    
    let correct = 0;
    const total = answeredCount;
    
   
    Object.values(answers).forEach((answer: any) => {
      if (answer.isCorrect) correct++;
    });

    const uid = (req as any).verifiedUid || "anonymous";
    const score = {
      quizId: "generated",
      quizTitle,
      uid,
      score: correct,
      total,
      createdAt: Date.now(),
    };

    // Save generated quiz result
    if (uid !== "anonymous") {
      try {
        const resultRef = await db.collection("results").add(score);
        debugLogger("quizController", { 
          step: "generated-quiz-result-saved", 
          resultId: resultRef.id 
        });
      } catch (saveErr) {
        debugLogger("quizController", { 
          step: "generated-quiz-save-failed", 
          error: saveErr 
        });
      }
    }

    return res.json({
      ok: true,
      message: "Generated quiz submission received successfully.",
      score: { correct, total },
      resultId: "generated-" + Date.now(),
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

    debugLogger("getResults", { 
      step: "fetching-all", 
      uid 
    });

    const snap = await db
      .collection("results")
      .where("uid", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    debugLogger("getResults", { 
      step: "query-completed", 
      count: snap.size,
      empty: snap.empty 
    });

    if (snap.empty) return res.json([]);

    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(data);
  } catch (err: any) {
    debugLogger("getResults", { 
      step: "error", 
      error: err.message,
      code: err.code 
    });
    res.status(500).json({ error: "Failed to fetch results" });
  }
}

/** ✅ GET /api/quiz/results/latest */
export async function getLatestResult(req: Request, res: Response) {
  try {
    const uid = (req as any).verifiedUid;
    
    debugLogger("getLatestResult", { 
      step: "start", 
      uid: uid, 
      hasUid: !!uid,
    });

    if (!uid) {
      debugLogger("getLatestResult", { step: "no-uid" });
      return res.json(null);
    }

    try {
      const snap = await db
        .collection("results")
        .where("uid", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      debugLogger("getLatestResult", { 
        step: "query-executed", 
        resultsCount: snap.size,
        empty: snap.empty 
      });

      if (snap.empty) {
        debugLogger("getLatestResult", { step: "no-results-found" });
        return res.json(null);
      }

      const doc = snap.docs[0];
      const resultData = doc.data() as Result; // ✅ Type assertion
      
      debugLogger("getLatestResult", { 
        step: "result-found", 
        resultId: doc.id,
        score: `${resultData.score}/${resultData.total}`,
        quizTitle: resultData.quizTitle
      });

      res.json({ id: doc.id, ...resultData });
    } catch (firestoreError: any) {
      // Handle Firestore-specific errors
      debugLogger("getLatestResult", { 
        step: "firestore-error", 
        error: firestoreError.message,
        code: firestoreError.code 
      });

      if (firestoreError.code === 5 || firestoreError.code === 'NOT_FOUND') {
        debugLogger("getLatestResult", { step: "collection-not-found-returning-null" });
        return res.json(null);
      }
      throw firestoreError;
    }
  } catch (err: any) {
    debugLogger("getLatestResult", { 
      step: "final-error", 
      error: err.message,
      code: err.code,
      stack: err.stack 
    });
    res.status(500).json({ error: "Failed to fetch latest result" });
  }
}

/** ✅ GET /api/quiz/results/:id */
export async function getResultById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const uid = (req as any).verifiedUid;
    
    debugLogger("getResultById", { 
      step: "start", 
      resultId: id,
      uid 
    });

    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const doc = await db.collection("results").doc(id).get();
    
    if (!doc.exists) {
      debugLogger("getResultById", { step: "result-not-found", resultId: id });
      return res.status(404).json({ error: "Result not found" });
    }

    const result = doc.data() as Result; // ✅ Type assertion
    
    // Ensure user can only access their own results
    if (!result || result.uid !== uid) { // ✅ Check if result exists
      debugLogger("getResultById", { 
        step: "access-denied", 
        resultUid: result?.uid,
        requestUid: uid 
      });
      return res.status(403).json({ error: "Access denied" });
    }

    debugLogger("getResultById", { 
      step: "result-returned", 
      resultId: id,
      score: `${result.score}/${result.total}` 
    });

    res.json({ id: doc.id, ...result });
  } catch (err: any) {
    debugLogger("getResultById", { 
      step: "error", 
      error: err.message,
      resultId: req.params.id 
    });
    res.status(500).json({ error: "Failed to fetch result" });
  }
}