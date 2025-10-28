import type { Quiz } from "../utils/types";
import { useNavigate } from "react-router-dom";

interface QuizCardProps {
  quiz: Quiz;
  onStart?: (id: string) => void;
}

const QuizCard = ({ quiz, onStart }: QuizCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onStart) onStart(quiz.id);
    else navigate(`/quiz/${quiz.id}`);
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "easy":
        return "from-emerald-500 to-teal-500";
      case "medium":
        return "from-amber-500 to-orange-500";
      case "hard":
        return "from-rose-500 to-pink-500";
      default:
        return "from-indigo-500 to-purple-500";
    }
  };

  const getDifficultyBadge = (difficulty?: string) => {
    switch (difficulty) {
      case "easy":
        return { text: "Easy", icon: "😊", bg: "bg-emerald-100", textColor: "text-emerald-700" };
      case "medium":
        return { text: "Medium", icon: "🤔", bg: "bg-amber-100", textColor: "text-amber-700" };
      case "hard":
        return { text: "Hard", icon: "🔥", bg: "bg-rose-100", textColor: "text-rose-700" };
      default:
        return { text: "Normal", icon: "📝", bg: "bg-indigo-100", textColor: "text-indigo-700" };
    }
  };

  const badge = getDifficultyBadge(quiz.difficulty);
  const gradient = getDifficultyColor(quiz.difficulty);

  return (
    <div className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 hover:border-indigo-200">
      {/* Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
      
      {/* Content */}
      <div className="relative p-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110`}>
            <span className="text-2xl">📝</span>
          </div>
          
          <span className={`inline-flex items-center space-x-1 px-3 py-1 ${badge.bg} ${badge.textColor} rounded-full text-xs font-semibold`}>
            <span>{badge.icon}</span>
            <span>{badge.text}</span>
          </span>
        </div>

        {/* Title & Description */}
        <div className="flex-1 mb-4">
          <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
            {quiz.title}
          </h3>
          <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {quiz.description || "Test your knowledge with this quiz"}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-4 mb-4 text-sm">
          <div className="flex items-center space-x-1 text-slate-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{quiz.questions?.length || 0} questions</span>
          </div>
          {quiz.createdAt && (
            <div className="flex items-center space-x-1 text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs">{new Date(quiz.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Button */}
        <button
          onClick={handleClick}
          className={`w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r ${gradient} text-white rounded-xl font-semibold hover:shadow-lg transition-all group-hover:scale-105`}
        >
          <span>Start Quiz</span>
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default QuizCard;