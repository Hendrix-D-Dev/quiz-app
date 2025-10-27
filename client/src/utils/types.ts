// client/src/utils/types.ts

// ========================================
// 🧩 QUESTION AND QUIZ TYPES
// ========================================
export type Question = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  source?: string;
  difficulty?: "easy" | "medium" | "hard";
};

export type Quiz = {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  createdBy?: string;
  createdAt?: number;
  sourceFile?: string;
  difficulty?: "easy" | "medium" | "hard";
};

export type SubmitPayload = {
  uid?: string;
  answers: Record<string, string>; // questionId -> selected option
};

// ========================================
// 📄 CHAPTER TYPE
// ========================================
export interface Chapter {
  index: number;      // Chapter index in document
  title: string;      // Chapter title (e.g. "Chapter 1: Introduction")
  content?: string;   // Extracted text for that chapter (optional)
}

// ========================================
// 🏠 ROOM AND PARTICIPANT TYPES
// ========================================
export type Room = {
  code: string; // unique room code (uppercase)
  quizId: string; // reference to Quiz.id
  createdBy: string; // uid/admin
  timeLimit: number; // in seconds
  questionCount: number; // e.g. 5, 10, 15...
  roomName?: string; // optional display name
  createdAt: number;
  status?: "active" | "closed"; // room state
  participantCount?: number; // tracked count of submissions
  closedAt?: number; // timestamp when room was closed
};

export type Participant = {
  id?: string; // Firestore doc id
  name: string;
  matric: string;
  answers: Array<{
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>; // graded answers with details
  score: number; // percentage score (0-100)
  correctCount: number; // number of correct answers
  totalQuestions: number; // total questions in quiz
  submittedAt: number;
};

// ========================================
// 📊 QUIZ RESULT TYPE (for regular quizzes)
// ========================================
export type QuizResult = {
  id?: string;
  userId: string;
  quizId: string;
  score: number;
  answers: Array<{
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
  totalQuestions: number;
  correctCount: number;
  submittedAt: number;
};