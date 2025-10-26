import type { Quiz } from "../utils/types";
import { useNavigate } from "react-router-dom";

interface QuizCardProps {
  quiz: Quiz;
  onStart?: (id: string) => void; // optional callback
}

const QuizCard = ({ quiz, onStart }: QuizCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onStart) onStart(quiz.id!);
    else navigate(`/quiz/${quiz.id}`);
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{quiz.title}</h3>
        <p className="text-gray-600 text-sm mt-1">{quiz.description}</p>
      </div>

      <button
        onClick={handleClick}
        className="mt-4 bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition font-medium"
      >
        Start Quiz
      </button>
    </div>
  );
};

export default QuizCard;
