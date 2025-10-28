import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";
import UploadForm from "../components/UploadForm";
import Navbar from "../components/Navbar";
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

  const handleAnswer = (qId: string, choice: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: choice }));
  };

  const goNext = () => setCurrentIndex((i) => Math.min(i + 1, total - 1));
  const goPrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));
  const jumpTo = (index: number) =>
    setCurrentIndex(Math.min(Math.max(0, index), Math.max(0, total - 1)));

  const handleSubmit = async () => {
    if (!confirm(`Submit quiz with ${Object.keys(answers).length} of ${total} questions answered?`)) {
      return;
    }

    try {
      let resultId: string | null = null;
      const res = await api.post(id ? `/quiz/${id}/submit` : "/quiz/submit", {
        answers,
        roomMode,
      });
      resultId = res.data?.resultId || null;

      setSubmitted(true);

      // Navigate to results page after submission
      if (resultId) navigate(`/results/${resultId}`);
      else navigate("/results");
    } catch (err) {
      console.error("❌ Submit failed:", err);
      alert("Failed to submit quiz. Please try again.");
    }
  };

  // Show submitted state
  if (submitted) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-md animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-3">
              Quiz Submitted! 🎉
            </h2>
            {roomMode ? (
              <p className="text-slate-600 leading-relaxed">
                Waiting for other participants... Results will appear once the room closes.
              </p>
            ) : (
              <p className="text-slate-600 leading-relaxed">
                Redirecting you to your results...
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30">
        <div className="section-padding">
          <div className="max-w-5xl mx-auto">
            {/* Upload Form (when no quiz loaded) */}
            {!id && questions.length === 0 && (
              <div className="animate-fade-in">
                <div className="text-center mb-8">
                  <h1 className="text-4xl md:text-5xl font-bold mb-3 text-slate-800">
                    Generate Your <span className="gradient-text">AI Quiz</span>
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
                <div className="inline-flex items-center space-x-3 px-6 py-4 bg-white rounded-2xl shadow-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <span className="text-slate-700 font-medium">Loading quiz...</span>
                </div>
              </div>
            )}

            {/* Quiz Interface */}
            {!loading && questions.length > 0 && (
              <div className="animate-fade-in">
                {/* Header Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-slate-100">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-1">Quiz Challenge 📝</h2>
                      <p className="text-slate-600 text-sm">Answer all questions to complete the quiz</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                        <div className="text-2xl font-bold text-indigo-600">{total}</div>
                        <div className="text-xs text-slate-600 font-medium">Questions</div>
                      </div>
                      <div className="text-center px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
                        <div className="text-2xl font-bold text-emerald-600">{progressPercent}%</div>
                        <div className="text-xs text-slate-600 font-medium">Complete</div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
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

                {/* Question Card */}
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-slate-100">
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {currentIndex + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-xl font-semibold text-slate-800 leading-relaxed">
                        {questions[currentIndex]?.question}
                      </p>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    {questions[currentIndex]?.options.map((opt, idx) => {
                      const qId = questions[currentIndex].id;
                      const isSelected = answers[qId] === opt;
                      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                      
                      return (
                        <label
                          key={opt}
                          className={`group flex items-center space-x-4 p-4 rounded-xl cursor-pointer border-2 transition-all duration-200 ${
                            isSelected
                              ? "border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md"
                              : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all ${
                            isSelected
                              ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg"
                              : "bg-slate-100 text-slate-600 group-hover:bg-indigo-100"
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
                          <span className={`flex-1 font-medium ${isSelected ? "text-indigo-900" : "text-slate-700"}`}>
                            {opt}
                          </span>
                          {isSelected && (
                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation Controls */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                    {/* Previous/Next */}
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={goPrev}
                        disabled={currentIndex === 0}
                        className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-slate-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Previous</span>
                      </button>
                      <button
                        onClick={goNext}
                        disabled={currentIndex === total - 1}
                        className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-slate-700"
                      >
                        <span>Next</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Jump To */}
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
                        className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all font-medium text-slate-700"
                      >
                        Start Over
                      </button>

                      <button
                        onClick={handleSubmit}
                        disabled={!anyAnswered}
                        className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg ${
                          anyAnswered
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-xl hover:scale-105"
                            : "bg-slate-300 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        <span>Submit Quiz</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* No Data State */}
            {!loading && id && questions.length === 0 && (
              <div className="text-center py-20 animate-fade-in">
                <div className="inline-block p-8 bg-white rounded-2xl shadow-lg">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">No Quiz Data Available</h3>
                  <p className="text-slate-600 mb-6">This quiz could not be loaded.</p>
                  <button
                    onClick={() => navigate("/")}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all"
                  >
                    Go Home
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Quiz;