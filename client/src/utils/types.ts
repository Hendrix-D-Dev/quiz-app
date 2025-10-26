// client/src/utils/types.ts

// 🧩 Question and Quiz types
export type Question = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
};

export type Quiz = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
};

// 🧠 Shared Chapter type (used by UploadForm & ChapterSelector)
export interface Chapter {
  index: number;      // Chapter index in document
  title: string;      // Chapter title (e.g. "Chapter 1: Introduction")
  content?: string;   // Extracted text for that chapter (optional for lightweight use)
}
