import type { Request, Response } from "express";
import { db } from "../config/firebaseAdmin.js";
import type { Room, Participant, Question } from "../utils/types.js";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { parseFile } from "../services/parsers/index.js"; // Use your existing parseFile function
import { generateQuestionsFromText } from "../services/aiService.js"; // Your existing AI service

// Helper: generate random 6-letter code
const generateRoomCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

/**
 * Create a new room (Admin only - requires auth middleware)
 * Now supports both existing quizId and file upload for new quiz generation
 */
export const createRoom = async (req: Request, res: Response) => {
  try {
    const verifiedUid = (req as any).verifiedUid;
    const { quizId, timeLimit, questionCount, roomName } = req.body;
    const file = (req as any).file;

    // Validate required fields
    if (!timeLimit || !questionCount) {
      return res.status(400).json({ error: "Missing required fields: timeLimit and questionCount are required" });
    }

    let finalQuizId = quizId;
    let quizQuestions: Question[] = [];

    // Case 1: File upload - generate new quiz
    if (file) {
      try {
        console.log(`Processing uploaded file: ${file.originalname}`);
        
        // Extract text from the uploaded file using your existing parser system
        const text = await parseFile(file.buffer, file.originalname);
        
        if (!text || text.trim().length === 0) {
          return res.status(400).json({ 
            error: "Could not extract text from the uploaded document" 
          });
        }

        console.log(`Successfully extracted text (${text.length} chars), generating quiz...`);

        // Generate quiz using your existing AI service
        const questions = await generateQuestionsFromText(text, parseInt(questionCount), "medium");
        
        if (!questions || questions.length === 0) {
          return res.status(400).json({ 
            error: "Failed to generate questions from the uploaded document" 
          });
        }

        console.log(`Generated ${questions.length} questions, creating quiz document...`);

        // Create quiz document in Firestore
        const quizData = {
          title: roomName || `Quiz from ${file.originalname}`,
          description: `Automatically generated from ${file.originalname}`,
          questions: questions,
          createdBy: verifiedUid,
          createdAt: Date.now(),
          sourceFile: file.originalname,
        };

        const docRef = await db.collection("quizzes").add(quizData);
        finalQuizId = docRef.id;

        // Update with ID
        await docRef.update({
          id: finalQuizId,
        });

        quizQuestions = questions;
        console.log(`Quiz created successfully with ID: ${finalQuizId}`);

      } catch (err: any) {
        console.error("Error generating quiz from document:", err);
        return res.status(400).json({ 
          error: `Failed to process uploaded document: ${err.message}` 
        });
      }
    }
    // Case 2: Use existing quizId
    else if (quizId) {
      const quizDoc = await db.collection("quizzes").doc(quizId).get();
      if (!quizDoc.exists) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      const quiz = quizDoc.data();
      quizQuestions = quiz?.questions || [];
      const availableQuestions = quizQuestions.length;

      // Validate question count
      if (parseInt(questionCount) > availableQuestions) {
        return res.status(400).json({
          error: `Quiz only has ${availableQuestions} questions, cannot create room with ${questionCount}`,
        });
      }
    }
    // Case 3: No file and no quizId
    else {
      return res.status(400).json({ 
        error: "Either quizId or file upload is required to create a room" 
      });
    }

    const code = generateRoomCode();
    const room: Room = {
      code,
      quizId: finalQuizId,
      createdBy: verifiedUid,
      timeLimit: Number(timeLimit), // in seconds
      questionCount: Number(questionCount),
      roomName: roomName || `Room ${code}`,
      createdAt: Date.now(),
      status: "active",
      participantCount: 0,
    };

    await db.collection("rooms").doc(code).set(room);

    res.json({ 
      message: "Room created successfully", 
      room: {
        ...room,
        roomCode: code // Add roomCode for client compatibility
      },
      roomCode: code 
    });
  } catch (err) {
    console.error("Error creating room:", err);
    res.status(500).json({ error: "Failed to create room" });
  }
};

/**
 * Get room + quiz details (Public - students need this)
 */
export const getRoom = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const roomDoc = await db.collection("rooms").doc(code.toUpperCase()).get();
    if (!roomDoc.exists) {
      return res.status(404).json({ error: "Room not found" });
    }

    const room = roomDoc.data() as Room;

    // Check if room is closed
    if (room.status === "closed") {
      return res.status(403).json({ error: "This room has been closed" });
    }

    // Fetch the quiz
    const quizDoc = await db.collection("quizzes").doc(room.quizId).get();
    if (!quizDoc.exists) {
      return res.status(404).json({ error: "Quiz not found for this room" });
    }

    const quiz = quizDoc.data();
    
    // Only send the specified number of questions (without correct answers)
    const questions = (quiz?.questions || [])
      .slice(0, room.questionCount)
      .map((q: Question) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        difficulty: q.difficulty,
      }));

    res.json({
      room: {
        code: room.code,
        roomName: room.roomName,
        timeLimit: room.timeLimit,
        questionCount: room.questionCount,
        status: room.status,
      },
      questions,
      timeLimit: room.timeLimit,
    });
  } catch (err) {
    console.error("Error fetching room:", err);
    res.status(500).json({ error: "Failed to fetch room" });
  }
};

/**
 * Submit answers (Public - students don't need auth)
 * Grades the answers and stores the result with score
 */
export const submitAnswers = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { name, matric, answers } = req.body;

    // Validate input - answers should be Record<questionId, answer>
    if (!name || !matric || !answers || typeof answers !== "object") {
      return res.status(400).json({ error: "Missing required fields (name, matric, answers)" });
    }

    // Get room details
    const roomDoc = await db.collection("rooms").doc(code.toUpperCase()).get();
    if (!roomDoc.exists) {
      return res.status(404).json({ error: "Room not found" });
    }

    const room = roomDoc.data() as Room;

    // Check if room is closed
    if (room.status === "closed") {
      return res.status(403).json({ error: "Room is closed, cannot submit" });
    }

    // Fetch the quiz to grade answers
    const quizDoc = await db.collection("quizzes").doc(room.quizId).get();
    if (!quizDoc.exists) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const quiz = quizDoc.data();
    const questions: Question[] = (quiz?.questions || []).slice(0, room.questionCount);

    // Grade the submission
    let correctCount = 0;
    const gradedAnswers = questions.map((question: Question) => {
      const userAnswer = answers[question.id] || "";
      const isCorrect = question.correctAnswer === userAnswer;
      if (isCorrect) correctCount++;

      return {
        question: question.question,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
      };
    });

    const score = questions.length > 0 
      ? Math.round((correctCount / questions.length) * 100) 
      : 0;

    const participant: Participant = {
      name,
      matric,
      answers: gradedAnswers,
      score,
      correctCount,
      totalQuestions: questions.length,
      submittedAt: Date.now(),
    };

    // Store participant submission
    const docRef = await db
      .collection("rooms")
      .doc(code.toUpperCase())
      .collection("participants")
      .add(participant);

    // Update participant count in room
    await db.collection("rooms").doc(code.toUpperCase()).update({
      participantCount: (room.participantCount || 0) + 1,
    });

    res.json({
      message: "Submission saved successfully",
      submissionId: docRef.id,
      score,
      correctCount,
      totalQuestions: questions.length,
    });
  } catch (err) {
    console.error("Error submitting answers:", err);
    res.status(500).json({ error: "Failed to submit answers" });
  }
};

/**
 * Get participants (Admin only - requires auth)
 * Verifies the requesting user is the room creator
 */
export const getParticipants = async (req: Request, res: Response) => {
  try {
    const verifiedUid = (req as any).verifiedUid;
    const { code } = req.params;

    // Get room to verify ownership
    const roomDoc = await db.collection("rooms").doc(code.toUpperCase()).get();
    if (!roomDoc.exists) {
      return res.status(404).json({ error: "Room not found" });
    }

    const room = roomDoc.data() as Room;

    // Verify the user is the room creator
    if (room.createdBy !== verifiedUid) {
      return res.status(403).json({ error: "Only the room creator can view participants" });
    }

    // Fetch all participants
    const snapshot = await db
      .collection("rooms")
      .doc(code.toUpperCase())
      .collection("participants")
      .orderBy("submittedAt", "desc")
      .get();

    const participants = snapshot.docs.map(
      (doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
      })
    );

    res.json({
      room: {
        code: room.code,
        roomName: room.roomName,
        status: room.status,
        participantCount: room.participantCount || participants.length,
        createdAt: room.createdAt,
      },
      participants,
    });
  } catch (err) {
    console.error("Error fetching participants:", err);
    res.status(500).json({ error: "Failed to fetch participants" });
  }
};

/**
 * Close room (Admin only - requires auth)
 * Prevents new submissions
 */
export const closeRoom = async (req: Request, res: Response) => {
  try {
    const verifiedUid = (req as any).verifiedUid;
    const { code } = req.params;

    // Get room to verify ownership
    const roomDoc = await db.collection("rooms").doc(code.toUpperCase()).get();
    if (!roomDoc.exists) {
      return res.status(404).json({ error: "Room not found" });
    }

    const room = roomDoc.data() as Room;

    // Verify the user is the room creator
    if (room.createdBy !== verifiedUid) {
      return res.status(403).json({ error: "Only the room creator can close this room" });
    }

    // Update room status
    await db.collection("rooms").doc(code.toUpperCase()).update({
      status: "closed",
      closedAt: Date.now(),
    });

    res.json({ message: "Room closed successfully", code: room.code });
  } catch (err) {
    console.error("Error closing room:", err);
    res.status(500).json({ error: "Failed to close room" });
  }
};