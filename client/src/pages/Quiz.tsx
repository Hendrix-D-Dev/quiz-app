import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";
import UploadForm from "../components/UploadForm";
import type { Question } from "../utils/types";

const Quiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [roomMode, setRoomMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch quiz if it’s from a shared/room link
  useEffect(() => {
    if (id) {
      setLoading(true);
      api
        .get(`/quiz/${id}`)
        .then((res) => {
          setQuestions(res.data.questions || []);
          setRoomMode(res.data.roomMode || false);
        })
        .catch((err) => console.error("❌ Failed to fetch quiz:", err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const total = questions.length;
  const anyAnswered = Object.keys(answers).length > 0;

  const handleAnswer = (qId: string, choice: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: choice }));
  };

  const goNext = () => setCurrentIndex((i) => Math.min(i + 1, total - 1));
  const goPrev = () => setCurrentIndex((i) => Math.max(i, 0));
  const jumpTo = (index: number) =>
    setCurrentIndex(Math.min(Math.max(0, index), Math.max(0, total - 1)));

  const handleSubmit = async () => {
    try {
      let resultId: string | null = null;
      if (id) {
        const res = await api.post(`/quiz/${id}/submit`, { answers, roomMode });
        resultId = res.data.resultId; // backend should return this
      } else {
        const res = await api.post("/quiz/submit", { answers });
        resultId = res.data.resultId;
      }

      setSubmitted(true);

      // ✅ Navigate to results page after submission
      if (resultId) {
        navigate(`/results/${resultId}`);
      }
    } catch (err) {
      console.error("❌ Submit failed:", err);
      alert("Failed to submit quiz. Please try again.");
    }
  };

  // ✅ Show submitted state
  if (submitted) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center">
        <h2 className="text-3xl font-bold text-emerald-700 mb-2">
          Quiz Submitted!
        </h2>
        {roomMode ? (
          <p className="text-gray-700">
            Waiting for other participants... Results will appear once the room closes.
          </p>
        ) : (
          <p className="text-gray-700">
            Redirecting you to your results...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-5xl mx-auto">
        {!id && questions.length === 0 && (
          <div className="mt-6">
            <UploadForm
              onUploadComplete={(qs) => {
                setQuestions(qs || []);
                setCurrentIndex(0);
                setAnswers({});
              }}
            />
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-600 py-10">Loading quiz...</div>
        ) : questions.length > 0 ? (
          <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-teal-800">
                Quiz — {total} Questions
              </h3>
              <div className="text-sm text-gray-600">
                Question {currentIndex + 1} / {total}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 h-2 rounded-full mb-5 overflow-hidden">
              <div
                className="h-2 bg-teal-600 rounded-full transition-all duration-300"
                style={{
                  width: `${(100 * (currentIndex + 1)) / Math.max(1, total)}%`,
                }}
              />
            </div>

            {/* Question display */}
            <div className="p-4 border rounded-lg mb-6">
              <p className="font-semibold mb-4 text-gray-800">
                {currentIndex + 1}. {questions[currentIndex]?.question}
              </p>
              <div className="grid gap-3">
                {questions[currentIndex]?.options.map((opt) => {
                  const qId = questions[currentIndex].id;
                  return (
                    <label
                      key={opt}
                      className={`block p-3 rounded-lg cursor-pointer border transition ${
                        answers[qId] === opt
                          ? "border-teal-600 bg-teal-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={qId}
                        value={opt}
                        checked={answers[qId] === opt}
                        onChange={() => handleAnswer(qId, opt)}
                        className="mr-2 accent-teal-600"
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex gap-2">
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={goNext}
                  disabled={currentIndex === total - 1}
                  className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Jump to</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, total)}
                  value={currentIndex + 1}
                  onChange={(e) => jumpTo(Number(e.target.value) - 1)}
                  className="w-20 border px-2 py-1 rounded-md text-sm"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Answered: {Object.keys(answers).length} / {total}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setQuestions([]);
                    setAnswers({});
                    setCurrentIndex(0);
                  }}
                  className="px-4 py-2 rounded-md bg-stone-100 hover:bg-stone-200"
                >
                  Start Over
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={!anyAnswered}
                  className={`px-5 py-2 rounded-md text-white font-medium transition ${
                    anyAnswered
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-emerald-300 cursor-not-allowed"
                  }`}
                >
                  Submit Quiz
                </button>
              </div>
            </div>
          </div>
        ) : (
          id && (
            <div className="text-center text-gray-600 mt-10">
              No quiz data available.
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Quiz;
