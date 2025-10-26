import { db } from "../config/firebaseAdmin.js";
// Helper: generate random 6-letter code
const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
/**
 * Create a new room
 */
export const createRoom = async (req, res) => {
    try {
        const { quizId, createdBy, timeLimit, questionCount } = req.body;
        if (!quizId || !createdBy || !timeLimit || !questionCount) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const code = generateRoomCode();
        const room = {
            code,
            quizId,
            createdBy,
            timeLimit,
            questionCount,
            createdAt: Date.now(),
        };
        await db.collection("rooms").doc(code).set(room);
        res.json({ message: "Room created", room });
    }
    catch (err) {
        console.error("Error creating room:", err);
        res.status(500).json({ error: "Failed to create room" });
    }
};
/**
 * Get room + quiz details
 */
export const getRoom = async (req, res) => {
    try {
        const { code } = req.params;
        const roomDoc = await db.collection("rooms").doc(code).get();
        if (!roomDoc.exists) {
            return res.status(404).json({ error: "Room not found" });
        }
        const room = roomDoc.data();
        const quizDoc = await db.collection("quizzes").doc(room.quizId).get();
        if (!quizDoc.exists) {
            return res.status(404).json({ error: "Quiz not found" });
        }
        const quiz = quizDoc.data();
        const questions = (quiz?.questions || []).slice(0, room.questionCount);
        res.json({ room, questions, timeLimit: room.timeLimit });
    }
    catch (err) {
        console.error("Error fetching room:", err);
        res.status(500).json({ error: "Failed to fetch room" });
    }
};
/**
 * Submit answers
 */
export const submitAnswers = async (req, res) => {
    try {
        const { code } = req.params;
        const { name, matric, answers } = req.body;
        if (!name || !matric || !answers) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const participant = {
            name,
            matric,
            answers,
            submittedAt: Date.now(),
        };
        await db
            .collection("rooms")
            .doc(code)
            .collection("participants")
            .add(participant);
        res.json({ message: "Submission saved", participant });
    }
    catch (err) {
        console.error("Error submitting answers:", err);
        res.status(500).json({ error: "Failed to submit answers" });
    }
};
/**
 * Get participants (admin only)
 */
export const getParticipants = async (req, res) => {
    try {
        const { code } = req.params;
        const snapshot = await db
            .collection("rooms")
            .doc(code)
            .collection("participants")
            .get();
        const participants = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.json({ participants });
    }
    catch (err) {
        console.error("Error fetching participants:", err);
        res.status(500).json({ error: "Failed to fetch participants" });
    }
};
