import type { Request, Response } from "express";
import { db } from "../config/firebaseAdmin.js";
import type { Room, Participant, Question } from "../utils/types.js";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { parseFile } from "../services/parsers/index.js";
import { generateQuestionsFromText } from "../services/aiService.js";

// Helper: generate random 6-letter code
const generateRoomCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// Helper: check if room code already exists
const checkRoomCodeExists = async (code: string): Promise<boolean> => {
  const roomDoc = await db.collection("rooms").doc(code).get();
  return roomDoc.exists;
};

/**
 * NEW: Get active rooms for admin (for room recovery)
 */
export const getActiveAdminRooms = async (req: Request, res: Response) => {
  try {
    const verifiedUid = (req as any).verifiedUid;
    
    if (!verifiedUid) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get all active rooms created by this admin
    const snapshot = await db
      .collection("rooms")
      .where("createdBy", "==", verifiedUid)
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const activeRooms = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
      const room = doc.data() as Room;
      return {
        code: room.code,
        roomName: room.roomName,
        createdAt: room.createdAt,
        status: room.status,
        participantCount: room.participantCount || 0,
        timeLimit: room.timeLimit,
        questionCount: room.questionCount
      };
    });

    res.json(activeRooms);
  } catch (err) {
    console.error("Error fetching active rooms:", err);
    res.status(500).json({ error: "Failed to fetch active rooms" });
  }
};

/**
 * NEW: Export room results (Admin only)
 */
export const exportRoomResults = async (req: Request, res: Response) => {
  try {
    const verifiedUid = (req as any).verifiedUid;
    const { code } = req.params;
    const { format = 'csv' } = req.query;

    // Get room to verify ownership
    const roomDoc = await db.collection("rooms").doc(code.toUpperCase()).get();
    if (!roomDoc.exists) {
      return res.status(404).json({ error: "Room not found" });
    }

    const room = roomDoc.data() as Room;

    // Verify the user is the room creator
    if (room.createdBy !== verifiedUid) {
      return res.status(403).json({ error: "Only the room creator can export results" });
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
    ) as Participant[];

    // Fetch quiz details for export
    const quizDoc = await db.collection("quizzes").doc(room.quizId).get();
    const quiz = quizDoc.data();
    const quizTitle = quiz?.title || `Quiz ${room.quizId}`;

    if (format === 'csv') {
      // Generate CSV data
      const headers = ['Name', 'Matric Number', 'Score', 'Correct Answers', 'Total Questions', 'Percentage', 'Submitted At'];
      const csvData = participants.map(p => [
        p.name,
        p.matric,
        p.score.toString(),
        p.correctCount.toString(),
        p.totalQuestions.toString(),
        `${p.score}%`,
        new Date(p.submittedAt).toLocaleString()
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${quizTitle}_${code}_results.csv"`);
      return res.send(csvContent);
    } else if (format === 'json') {
      // Generate JSON data
      const exportData = {
        room: {
          code: room.code,
          roomName: room.roomName,
          quizTitle,
          createdAt: room.createdAt,
          totalParticipants: participants.length
        },
        participants: participants.map(p => ({
          name: p.name,
          matric: p.matric,
          score: p.score,
          correctCount: p.correctCount,
          totalQuestions: p.totalQuestions,
          submittedAt: p.submittedAt,
          answers: p.answers
        }))
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${quizTitle}_${code}_results.json"`);
      return res.json(exportData);
    } else {
      return res.status(400).json({ error: "Unsupported format. Use 'csv' or 'json'." });
    }
  } catch (err) {
    console.error("Error exporting room results:", err);
    res.status(500).json({ error: "Failed to export room results" });
  }
};

/**
 * Create a new room (Admin only - requires auth middleware)
 */
export const createRoom = async (req: Request, res: Response) => {
  try {
    const verifiedUid = (req as any).verifiedUid;
    const { quizId, timeLimit, questionCount, roomName, roomCode: customRoomCode } = req.body;
    const file = (req as any).file;

    console.log("📥 Room creation request:", {
      quizId,
      timeLimit,
      questionCount,
      roomName,
      customRoomCode,
      hasFile: !!file
    });

    // Validate required fields
    if (!timeLimit || !questionCount) {
      return res.status(400).json({ error: "Missing required fields: timeLimit and questionCount are required" });
    }

    let finalQuizId = quizId;
    let quizQuestions: Question[] = [];

    // Generate or validate room code
    let code = customRoomCode;
    if (code) {
      if (code.length < 4 || code.length > 10) {
        return res.status(400).json({ error: "Room code must be between 4 and 10 characters" });
      }
      
      if (await checkRoomCodeExists(code.toUpperCase())) {
        return res.status(400).json({ error: "Room code already exists. Please choose a different code." });
      }
    } else {
      let attempts = 0;
      do {
        code = generateRoomCode();
        attempts++;
        if (attempts > 10) {
          return res.status(500).json({ error: "Failed to generate unique room code. Please try again." });
        }
      } while (await checkRoomCodeExists(code));
    }

    code = code.toUpperCase();

    // Case 1: File upload - generate new quiz
    if (file) {
      try {
        console.log(`Processing uploaded file: ${file.originalname}`);
        
        const text = await parseFile(file.buffer, file.originalname);
        
        if (!text || text.trim().length === 0) {
          return res.status(400).json({ 
            error: "Could not extract text from the uploaded document" 
          });
        }

        console.log(`Successfully extracted text (${text.length} chars), generating quiz...`);

        const questions = await generateQuestionsFromText(text, parseInt(questionCount), "medium");
        
        if (!questions || questions.length === 0) {
          return res.status(400).json({ 
            error: "Failed to generate questions from the uploaded document" 
          });
        }

        console.log(`Generated ${questions.length} questions, creating quiz document...`);

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

    const room: Room = {
      code,
      quizId: finalQuizId,
      createdBy: verifiedUid,
      timeLimit: Number(timeLimit),
      questionCount: Number(questionCount),
      roomName: roomName || `Room ${code}`,
      createdAt: Date.now(),
      status: "active",
      participantCount: 0,
    };

    await db.collection("rooms").doc(code).set(room);

    console.log(`✅ Room created successfully: ${code}`);

    res.json({ 
      message: "Room created successfully", 
      room: {
        ...room,
        roomCode: code
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
        createdAt: room.createdAt,
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