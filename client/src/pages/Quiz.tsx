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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch quiz if it's from a shared/room link
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
  const progressPercent = total > 0 ? Math.round((Object.keys(answers).length / total) * 100) : 0;
  const currentQuestion = questions[currentIndex];

  const handleAnswer = (qId: string, choice: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: choice }));
  };

  const goNext = () => setCurrentIndex((i) => Math.min(i + 1, total - 1));
  const goPrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));
  const jumpTo = (index: number) =>
    setCurrentIndex(Math.min(Math.max(0, index), Math.max(0, total - 1)));

  const handleSubmit = async () => {
    if (!anyAnswered) {
      alert("Please answer at least one question before submitting.");
      return;
    }

    if (!confirm(`Submit quiz with ${Object.keys(answers).length} of ${total} questions answered?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      let resultId: string | null = null;
      const res = await api.post(id ? `/quiz/${id}/submit` : "/quiz/submit", {
        answers,
        roomMode,
      });
      resultId = res.data?.resultId || null;

      setSubmitted(true);

      // Navigate to results page after submission
      setTimeout(() => {
        if (resultId) navigate(`/results/${resultId}`);
        else navigate("/results");
      }, 2000);
    } catch (err) {
      console.error("❌ Submit failed:", err);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show submitted state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30 flex items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-12 text-center max-w-md animate-fade-in border border-white/20">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            Quiz Submitted! 🎉
          </h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            {roomMode 
              ? "Waiting for other participants... Results will appear once the room closes."
              : "Great job! Redirecting you to your results..."
            }
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Form (when no quiz loaded) */}
        {!id && questions.length === 0 && (
          <div className="animate-fade-in">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-800">
                Generate Your <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">AI Quiz</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Upload a document or paste text to create intelligent quiz questions instantly
              </p>
            </div>
            <UploadForm
              onUploadComplete={(qs) => {
                setQuestions(qs || []);
                setCurrentIndex(0);
                setAnswers({});
              }}
            />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-flex items-center space-x-4 px-8 py-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="text-slate-700 font-medium text-lg">Loading quiz...</span>
            </div>
          </div>
        )}

        {/* Quiz Interface */}
        {!loading && questions.length > 0 && (
          <div className="animate-fade-in space-y-6">
            {/* Header Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">Quiz Challenge 📝</h2>
                  <p className="text-slate-600">Answer all questions to complete the quiz</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center px-5 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl min-w-[100px]">
                    <div className="text-2xl font-bold text-indigo-600">{total}</div>
                    <div className="text-sm text-slate-600 font-medium">Questions</div>
                  </div>
                  <div className="text-center px-5 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl min-w-[100px]">
                    <div className="text-2xl font-bold text-emerald-600">{progressPercent}%</div>
                    <div className="text-sm text-slate-600 font-medium">Complete</div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Question {currentIndex + 1} of {total}</span>
                  <span>{Object.keys(answers).length} answered</span>
                </div>
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                  <div
                    className="h-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${(100 * (currentIndex + 1)) / Math.max(1, total)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Question Navigation Dots */}
            {total > 1 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => jumpTo(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentIndex
                        ? 'bg-indigo-600 scale-125'
                        : answers[questions[index].id]
                        ? 'bg-emerald-500'
                        : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                    title={`Question ${index + 1}${answers[questions[index].id] ? ' (answered)' : ''}`}
                  />
                ))}
              </div>
            )}

            {/* Question Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
              <div className="flex items-start space-x-4 mb-8">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {currentIndex + 1}
                </div>
                <div className="flex-1">
                  <p className="text-xl md:text-2xl font-semibold text-slate-800 leading-relaxed">
                    {currentQuestion?.question}
                  </p>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                {currentQuestion?.options.map((opt, idx) => {
                  const qId = currentQuestion.id;
                  const isSelected = answers[qId] === opt;
                  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                  
                  return (
                    <label
                      key={opt}
                      className={`group flex items-center space-x-4 p-5 rounded-xl cursor-pointer border-2 transition-all duration-200 ${
                        isSelected
                          ? "border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-lg scale-105"
                          : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 hover:shadow-md"
                      }`}
                    >
                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-all ${
                        isSelected
                          ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg"
                          : "bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                      }`}>
                        {letters[idx]}
                      </div>
                      <input
                        type="radio"
                        name={qId}
                        value={opt}
                        checked={isSelected}
                        onChange={() => handleAnswer(qId, opt)}
                        className="sr-only"
                      />
                      <span className={`flex-1 font-medium text-lg ${isSelected ? "text-indigo-900" : "text-slate-700"}`}>
                        {opt}
                      </span>
                      {isSelected && (
                        <svg className="w-6 h-6 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                {/* Previous/Next */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-slate-700 shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={goNext}
                    disabled={currentIndex === total - 1}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-slate-700 shadow-sm"
                  >
                    <span>Next</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Jump To */}
                {total > 5 && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-slate-600">Jump to:</span>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, total)}
                      value={currentIndex + 1}
                      onChange={(e) => jumpTo(Number(e.target.value) - 1)}
                      className="w-20 px-3 py-2 border-2 border-slate-200 rounded-xl text-center font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to start over? All progress will be lost.")) {
                        setQuestions([]);
                        setAnswers({});
                        setCurrentIndex(0);
                      }
                    }}
                    className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all font-medium text-slate-700 shadow-sm"
                  >
                    Start Over
                  </button>

                  <button
                    onClick={handleSubmit}
                    disabled={!anyAnswered || isSubmitting}
                    className={`flex items-center space-x-2 px-8 py-3 rounded-xl font-semibold transition-all shadow-lg min-w-[140px] justify-center ${
                      anyAnswered && !isSubmitting
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-xl hover:scale-105"
                        : "bg-slate-300 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Quiz</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loading && id && questions.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-block p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Quiz Data Available</h3>
              <p className="text-slate-600 mb-6">This quiz could not be loaded.</p>
              <button
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Go Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;