export type Question = {
  id: string; // generated UUID
  question: string;
  options: string[];
  correctAnswer: string;
  source?: string;
  difficulty?: "easy" | "medium" | "hard"; // 🆕 Difficulty level for the question
};

export type Quiz = {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  createdBy?: string;
  createdAt: number;
  sourceFile?: string;
  difficulty?: "easy" | "medium" | "hard"; // 🆕 Overall difficulty for the quiz
};

export type SubmitPayload = {
  uid?: string;
  answers: Record<string, string>; // questionId -> selected option
};

// =========================
// 🆕 Room + Participant types
// =========================
export type Room = {
  code: string; // unique room code
  quizId: string; // reference to Quiz.id
  createdBy: string; // uid/admin
  timeLimit: number; // in minutes
  questionCount: number; // e.g. 5, 10, 15...
  createdAt: number;
};

export type Participant = {
  id?: string;
  name: string;
  matric: string;
  answers: Record<string, string>;
  submittedAt: number;
};
