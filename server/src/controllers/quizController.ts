import type { Request, Response } from "express";
import { db } from "../config/firebaseAdmin.js";
import type { SubmitPayload, Quiz, Result } from "../utils/types.js";
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

/** POST /api/quiz/submit (for generated quizzes) - FIXED */
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
    
    // Calculate correct answers from the answers object
    Object.values(answers).forEach((answer: any) => {
      if (answer.isCorrect) correct++;
    });

    // 🚨 CRITICAL FIX: Use verified UID if available, otherwise use "anonymous"
    const uid = (req as any).verifiedUid || "anonymous";
    const generatedResultId = "generated-" + Date.now();
    
    // Create the score object with ALL required fields
    const score = {
      quizId: "generated",
      quizTitle,
      uid, // This now uses the actual user UID if authenticated
      score: correct,
      total,
      createdAt: Date.now(),
      resultId: generatedResultId,
      isGenerated: true
    };

    debugLogger("quizController", { 
      step: "generated-quiz-score-calculated", 
      uid,
      score: `${correct}/${total}`,
      generatedResultId,
      isAuthenticated: uid !== "anonymous"
    });

    // Save generated quiz result to Firestore for ALL users
    let firestoreResultId = generatedResultId;
    try {
      const resultRef = await db.collection("results").add(score);
      firestoreResultId = resultRef.id;
      debugLogger("quizController", { 
        step: "generated-quiz-result-saved", 
        generatedId: generatedResultId,
        firestoreId: firestoreResultId,
        uid,
        isAuthenticated: uid !== "anonymous"
      });
    } catch (saveErr: any) {
      debugLogger("quizController", { 
        step: "generated-quiz-save-failed", 
        error: saveErr.message,
        code: saveErr.code,
        uid 
      });
      // Even if save fails, return the generated result with the generated ID
    }

    return res.json({
      ok: true,
      message: "Generated quiz submission received successfully.",
      score: { correct, total },
      resultId: firestoreResultId,
      generatedId: generatedResultId,
      uid // Return the UID for debugging
    });
  } catch (err: any) {
    debugLogger("quizController", { 
      step: "submitGeneratedQuiz-error", 
      error: err.message,
      stack: err.stack 
    });
    res.status(500).json({ error: "Failed to submit generated quiz" });
  }
}

/** GET /api/quiz/results/all */
export async function getResults(req: Request, res: Response) {
  try {
    const uid = (req as any).verifiedUid;
    
    debugLogger("getResults", { 
      step: "fetching-all", 
      uid,
      hasUid: !!uid
    });

    if (!uid) {
      debugLogger("getResults", { step: "no-uid-returning-empty" });
      return res.json([]);
    }

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

    const data = snap.docs.map((d) => ({ 
      id: d.id, 
      ...d.data(),
      // For generated quizzes, use the stored resultId if available
      displayId: d.data().resultId || d.id
    }));
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

/** GET /api/quiz/results/latest */
export async function getLatestResult(req: Request, res: Response) {
  try {
    const uid = (req as any).verifiedUid;
    
    debugLogger("getLatestResult", { 
      step: "start", 
      uid: uid, 
      hasUid: !!uid,
    });

    if (!uid) {
      debugLogger("getLatestResult", { step: "no-uid-returning-401" });
      return res.status(401).json({ error: "Authentication required" });
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
        debugLogger("getLatestResult", { step: "no-results-found-returning-404" });
        return res.status(404).json({ error: "No results found" });
      }

      const doc = snap.docs[0];
      const resultData = doc.data() as Result;
      
      debugLogger("getLatestResult", { 
        step: "result-found", 
        resultId: doc.id,
        score: `${resultData.score}/${resultData.total}`,
        quizTitle: resultData.quizTitle
      });

      res.json({ 
        id: doc.id, 
        ...resultData,
        displayId: (resultData as any).resultId || doc.id
      });
    } catch (firestoreError: any) {
      debugLogger("getLatestResult", { 
        step: "firestore-error", 
        error: firestoreError.message,
        code: firestoreError.code 
      });

      // Handle Firestore index errors gracefully
      if (firestoreError.code === 9 || firestoreError.message.includes('index')) {
        debugLogger("getLatestResult", { 
          step: "index-required", 
          suggestion: "Create Firestore index for results/uid/createdAt" 
        });
        return res.status(500).json({ 
          error: "Database configuration required. Please try again later." 
        });
      }
      
      if (firestoreError.code === 5 || firestoreError.code === 'NOT_FOUND') {
        debugLogger("getLatestResult", { step: "collection-not-found-returning-404" });
        return res.status(404).json({ error: "No results found" });
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

/** GET /api/quiz/results/:id - FIXED UID HANDLING */
export async function getResultById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const uid = (req as any).verifiedUid;
    
    debugLogger("getResultById", { 
      step: "start", 
      resultId: id,
      uid,
      isGenerated: id.startsWith("generated-")
    });

    if (!uid) {
      debugLogger("getResultById", { step: "no-uid-returning-401" });
      return res.status(401).json({ error: "Authentication required" });
    }

    // 🚨 CRITICAL FIX: Handle both authenticated and anonymous results
    let resultDoc: any = null;
    let resultData: Result | null = null;

    // Handle generated result IDs (they start with "generated-")
    if (id.startsWith("generated-")) {
      debugLogger("getResultById", { 
        step: "generated-result-requested", 
        resultId: id 
      });
      
      try {
        // First try: Find by resultId field for authenticated users
        const snap = await db
          .collection("results")
          .where("resultId", "==", id)
          .limit(1)
          .get();

        debugLogger("getResultById", { 
          step: "generated-query-executed", 
          resultId: id,
          resultsCount: snap.size,
          empty: snap.empty
        });

        if (!snap.empty) {
          resultDoc = snap.docs[0];
          resultData = resultDoc.data() as Result;
          
          // 🚨 FIX: Allow access if either:
          // 1. UID matches exactly, OR
          // 2. Result was created by "anonymous" but user is now authenticated
          if (resultData.uid === uid || resultData.uid === "anonymous") {
            debugLogger("getResultById", { 
              step: "generated-result-found", 
              resultId: id,
              firestoreId: resultDoc.id,
              storedUid: resultData.uid,
              requestUid: uid,
              score: `${resultData.score}/${resultData.total}`
            });

            return res.json({ 
              id: resultDoc.id, 
              ...resultData,
              displayId: id
            });
          }
        }

        // Second try: Direct document access
        const directDoc = await db.collection("results").doc(id).get();
        if (directDoc.exists) {
          resultData = directDoc.data() as Result;
          if (resultData.uid === uid || resultData.uid === "anonymous") {
            debugLogger("getResultById", { 
              step: "generated-result-found-via-direct-access", 
              resultId: id 
            });
            return res.json({ 
              id: directDoc.id, 
              ...resultData,
              displayId: id
            });
          }
        }
        
        debugLogger("getResultById", { 
          step: "generated-result-not-found-final", 
          resultId: id 
        });
        return res.status(404).json({ 
          error: "Result not found. It may have expired or been cleaned up.",
          resultId: id
        });
      } catch (queryError: any) {
        debugLogger("getResultById", { 
          step: "generated-query-error", 
          error: queryError.message,
          code: queryError.code
        });
        
        // Handle Firestore index errors
        if (queryError.code === 9 || queryError.message.includes('index')) {
          debugLogger("getResultById", { 
            step: "index-error", 
            suggestion: "Create Firestore index for results/resultId" 
          });
          return res.status(500).json({ 
            error: "Database configuration required. Please try again later." 
          });
        }
        throw queryError;
      }
    }

    // Handle regular Firestore document IDs
    debugLogger("getResultById", { 
      step: "regular-result-requested", 
      resultId: id 
    });
    
    const doc = await db.collection("results").doc(id).get();
    
    if (!doc.exists) {
      debugLogger("getResultById", { step: "result-not-found", resultId: id });
      return res.status(404).json({ error: "Result not found" });
    }

    resultData = doc.data() as Result;
    
    debugLogger("getResultById", { 
      step: "result-found", 
      resultId: id,
      resultUid: resultData?.uid,
      requestUid: uid
    });
    
    // 🚨 FIX: Allow access if either:
    // 1. UID matches exactly, OR  
    // 2. Result was created by "anonymous" but user is now authenticated
    if (!resultData || (resultData.uid !== uid && resultData.uid !== "anonymous")) {
      debugLogger("getResultById", { 
        step: "access-denied", 
        resultUid: resultData?.uid,
        requestUid: uid 
      });
      return res.status(403).json({ error: "Access denied - you can only view your own results" });
    }

    debugLogger("getResultById", { 
      step: "result-returned", 
      resultId: id,
      score: `${resultData.score}/${resultData.total}` 
    });

    res.json({ 
      id: doc.id, 
      ...resultData,
      displayId: (resultData as any).resultId || doc.id
    });
  } catch (err: any) {
    debugLogger("getResultById", { 
      step: "error", 
      error: err.message,
      resultId: req.params.id,
      stack: err.stack
    });
    res.status(500).json({ error: "Failed to fetch result" });
  }
}