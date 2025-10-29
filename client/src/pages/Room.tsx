import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRoom, submitRoomAnswers, getRoomParticipants, closeRoom } from "../services/api";
import type { Question, Participant } from "../utils/types";
import { useAuth } from "../context/AuthContext";

interface RoomData {
  room: {
    code: string;
    roomName?: string;
    timeLimit: number;
    questionCount: number;
    status: string;
  };
  questions: Question[];
}

const Room = () => {
  const { code } = useParams<{ code: string }>();
  const { role } = useAuth();
  const navigate = useNavigate();

  // Room data
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Student state
  const [name, setName] = useState("");
  const [matric, setMatric] = useState("");
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    correctCount: number;
    totalQuestions: number;
  } | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load room data
  useEffect(() => {
    if (!code) return;

    getRoom(code)
      .then((data: any) => {
        setRoomData(data);
        setTimeLeft(data.room?.timeLimit || 1800);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message || "Failed to load room");
        setLoading(false);
      });
  }, [code]);

  // Load participants (admin only)
  useEffect(() => {
    if (!code || role !== "admin") return;

    const loadParticipants = () => {
      getRoomParticipants(code)
        .then((data: any) => setParticipants(data.participants || []))
        .catch((err: Error) => console.error("Failed to load participants:", err));
    };

    loadParticipants();
    const interval = setInterval(loadParticipants, 5000);

    return () => clearInterval(interval);
  }, [code, role]);

  // Countdown timer
  useEffect(() => {
    if (!started || timeLeft === null || timeLeft <= 0 || submitted) return;

    const timer = setTimeout(() => {
      setTimeLeft((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, started, submitted]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (started && timeLeft === 0 && !submitted) {
      handleSubmit();
    }
  }, [timeLeft, started, submitted]);

  const handleAnswer = (questionId: string, choice: string) => {
    setAnswers({ ...answers, [questionId]: choice });
  };

  const handleSubmit = async () => {
    if (!name.trim() || !matric.trim()) {
      alert("Please enter your name and matric number");
      return;
    }

    setSubmitting(true);
    try {
      const response = await submitRoomAnswers(code!, {
        name: name.trim(),
        matric: matric.trim(),
        answers,
      });

      setResult(response);
      setSubmitted(true);
    } catch (err) {
      const error = err as Error;
      alert(error.message || "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseRoom = async () => {
    if (!confirm("Are you sure you want to close this room? No more submissions will be accepted.")) {
      return;
    }

    try {
      await closeRoom(code!);
      alert("Room closed successfully");
      if (roomData) {
        setRoomData({
          ...roomData,
          room: { ...roomData.room, status: "closed" },
        });
      }
    } catch (err) {
      const error = err as Error;
      alert(error.message || "Failed to close room");
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getAnsweredCount = () => Object.keys(answers).length;
  const totalQuestions = roomData?.questions.length || 0;
  const progressPercent = totalQuestions > 0 ? (getAnsweredCount() / totalQuestions) * 100 : 0;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center max-w-md border border-white/20">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-red-500 rounded-full flex items-center justify-center text-white mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Room Not Found</h3>
          <p className="text-slate-600 mb-6">{error || "The room code appears to be invalid"}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Room Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6 border border-white/20">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-800 mb-1">
                {roomData.room.roomName || `Room ${code}`}
              </h1>
              <div className="flex items-center space-x-4 text-slate-600">
                <span className="font-mono font-bold text-lg bg-slate-100 px-3 py-1 rounded-lg">
                  {code}
                </span>
                {roomData.room.status === "closed" && (
                  <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Room Closed
                  </span>
                )}
              </div>
            </div>
            {role === "admin" && roomData.room.status === "active" && (
              <button
                onClick={handleCloseRoom}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Close Room</span>
              </button>
            )}
          </div>
        </div>

        {/* ADMIN VIEW */}
        {role === "admin" && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                📊 Participants ({participants.length})
              </h2>
              <div className="text-sm text-slate-600">
                Auto-refreshing every 5 seconds
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-lg">No submissions yet</p>
                <p className="text-slate-400 text-sm mt-2">
                  Waiting for students to join and submit...
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Matric</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Score</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Correct</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {participants.map((p, i) => (
                        <tr key={p.id || i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-sm">{p.matric}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                              p.score >= 70 ? "bg-green-100 text-green-800" :
                              p.score >= 50 ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {p.score}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-700 font-medium">
                            {p.correctCount}/{p.totalQuestions}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-sm">
                            {new Date(p.submittedAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Statistics */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-slate-600">Participants</p>
                      <p className="text-2xl font-bold text-blue-600">{participants.length}</p>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-slate-600">Average Score</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {participants.length > 0
                          ? Math.round(participants.reduce((sum, p) => sum + p.score, 0) / participants.length)
                          : 0}%
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-slate-600">Pass Rate</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {participants.length > 0
                          ? Math.round((participants.filter((p) => p.score >= 50).length / participants.length) * 100)
                          : 0}%
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-slate-600">High Scores</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {participants.filter((p) => p.score >= 80).length}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* STUDENT VIEW */}
        {role !== "admin" && (
          <>
            {/* Result View */}
            {submitted && result && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center border border-white/20 animate-fade-in">
                <div className="mb-6">
                  <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center ${
                    result.score >= 70 ? "bg-gradient-to-br from-emerald-400 to-green-500" :
                    result.score >= 50 ? "bg-gradient-to-br from-amber-400 to-yellow-500" :
                    "bg-gradient-to-br from-rose-400 to-red-500"
                  } shadow-lg`}>
                    <span className="text-3xl font-bold text-white">
                      {result.score}%
                    </span>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  Quiz Completed! {result.score >= 70 ? "🎉" : result.score >= 50 ? "👍" : "📚"}
                </h3>
                <p className="text-slate-600 mb-2">
                  You answered {result.correctCount} out of {result.totalQuestions} questions correctly
                </p>
                <p className={`text-lg font-semibold mb-6 ${
                  result.score >= 70 ? "text-emerald-600" :
                  result.score >= 50 ? "text-amber-600" :
                  "text-rose-600"
                }`}>
                  {result.score >= 70 ? "Excellent work!" : 
                   result.score >= 50 ? "Good job!" : 
                   "Keep practicing!"}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => navigate("/quiz")}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    Take Another Quiz
                  </button>
                  <button
                    onClick={() => navigate("/results")}
                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                  >
                    View All Results
                  </button>
                </div>
              </div>
            )}

            {/* Pre-Start View */}
            {!started && !submitted && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">
                    Enter Your Details
                  </h3>
                  <p className="text-slate-600">Get ready to start the quiz</p>
                </div>
                
                <div className="space-y-6 max-w-md mx-auto">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Matric Number
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your matric number"
                      value={matric}
                      onChange={(e) => setMatric(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  {/* Quiz Info Card */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Quiz Information
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm text-blue-700">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        {roomData.room.questionCount} questions
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        {Math.floor(roomData.room.timeLimit / 60)} minutes
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        Auto-submit enabled
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        Instant results
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setStarted(true)}
                    disabled={!name.trim() || !matric.trim()}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    Start Quiz
                  </button>
                </div>
              </div>
            )}

            {/* Quiz View */}
            {started && !submitted && (
              <div className="space-y-6">
                {/* Timer & Progress Header */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                        <span>Progress</span>
                        <span>{getAnsweredCount()}/{totalQuestions} answered</span>
                      </div>
                      <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                        <div
                          className="h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="text-center sm:text-right">
                      <div className="text-sm text-slate-600 mb-1">Time Remaining</div>
                      <div className={`text-2xl font-bold font-mono ${
                        timeLeft && timeLeft < 60 ? "text-rose-600 animate-pulse" : "text-slate-800"
                      }`}>
                        {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Questions */}
                {roomData.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20"
                  >
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {idx + 1}
                      </div>
                      <p className="text-lg font-semibold text-slate-800 leading-relaxed">
                        {q.question}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = answers[q.id] === opt;
                        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                        
                        return (
                          <label
                            key={opt}
                            className={`flex items-center space-x-4 p-4 rounded-xl cursor-pointer border-2 transition-all duration-200 ${
                              isSelected
                                ? "border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg scale-105"
                                : "border-slate-200 hover:border-blue-300 hover:bg-slate-50 hover:shadow-md"
                            }`}
                          >
                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-all ${
                              isSelected
                                ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {letters[optIdx]}
                            </div>
                            <input
                              type="radio"
                              name={q.id}
                              value={opt}
                              checked={isSelected}
                              onChange={() => handleAnswer(q.id, opt)}
                              className="sr-only"
                            />
                            <span className={`flex-1 font-medium ${isSelected ? "text-blue-900" : "text-slate-700"}`}>
                              {opt}
                            </span>
                            {isSelected && (
                              <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Submit Button */}
                <div className="sticky bottom-6">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center space-x-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Quiz</span>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Room;