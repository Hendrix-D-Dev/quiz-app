import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRoom, submitRoomAnswers, getRoomParticipants, closeRoom } from "../services/api";
import Navbar from "../components/Navbar";
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
        setTimeLeft(data.timeLimit);
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
    const interval = setInterval(loadParticipants, 5000); // Refresh every 5s

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

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading room...</p>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error || !roomData) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md">
            <p className="text-red-600 font-medium text-lg mb-4">
              {error || "Room not found"}
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Home
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Room Header */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-blue-700">
                  {roomData.room.roomName || `Room ${code}`}
                </h2>
                <p className="text-gray-600 mt-1">
                  Code: <span className="font-mono font-bold text-lg">{code}</span>
                </p>
                {roomData.room.status === "closed" && (
                  <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    🔒 Room Closed
                  </span>
                )}
              </div>
              {role === "admin" && roomData.room.status === "active" && (
                <button
                  onClick={handleCloseRoom}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Close Room
                </button>
              )}
            </div>
          </div>

          {/* ADMIN VIEW */}
          {role === "admin" && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">
                📊 Participants ({participants.length})
              </h3>

              {participants.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No submissions yet</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Waiting for students to join and submit...
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Matric</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Score</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Correct</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {participants.map((p, i) => (
                        <tr key={p.id || i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-800">{p.name}</td>
                          <td className="px-4 py-3 text-gray-600 font-mono">{p.matric}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${
                              p.score >= 70 ? "text-green-600" :
                              p.score >= 50 ? "text-yellow-600" :
                              "text-red-600"
                            }`}>
                              {p.score}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">
                            {p.correctCount}/{p.totalQuestions}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-sm">
                            {new Date(p.submittedAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Average Score</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {participants.length > 0
                        ? Math.round(
                            participants.reduce((sum, p) => sum + p.score, 0) / participants.length
                          )
                        : 0}%
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Pass Rate</p>
                    <p className="text-2xl font-bold text-green-600">
                      {participants.length > 0
                        ? Math.round(
                            (participants.filter((p) => p.score >= 50).length / participants.length) * 100
                          )
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STUDENT VIEW */}
          {role !== "admin" && (
            <>
              {/* Result View */}
              {submitted && result && (
                <div className="bg-white rounded-xl shadow-md p-8 text-center">
                  <div className="mb-6">
                    <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center ${
                      result.score >= 70 ? "bg-green-100" :
                      result.score >= 50 ? "bg-yellow-100" :
                      "bg-red-100"
                    }`}>
                      <span className={`text-4xl font-bold ${
                        result.score >= 70 ? "text-green-600" :
                        result.score >= 50 ? "text-yellow-600" :
                        "text-red-600"
                      }`}>
                        {result.score}%
                      </span>
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Quiz Submitted!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    You got {result.correctCount} out of {result.totalQuestions} correct
                  </p>

                  <button
                    onClick={() => navigate("/")}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Go Home
                  </button>
                </div>
              )}

              {/* Pre-Start View */}
              {!started && !submitted && (
                <div className="bg-white rounded-xl shadow-md p-8">
                  <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">
                    Enter Your Details to Start
                  </h3>
                  <div className="space-y-4 max-w-md mx-auto">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Matric Number"
                      value={matric}
                      onChange={(e) => setMatric(e.target.value)}
                      className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                      <p className="font-semibold">Quiz Information:</p>
                      <ul className="mt-2 space-y-1">
                        <li>• {roomData.room.questionCount} questions</li>
                        <li>• {Math.floor(roomData.room.timeLimit / 60)} minutes time limit</li>
                        <li>• Auto-submit when time runs out</li>
                      </ul>
                    </div>
                    <button
                      onClick={() => setStarted(true)}
                      disabled={!name.trim() || !matric.trim()}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Start Quiz
                    </button>
                  </div>
                </div>
              )}

              {/* Quiz View */}
              {started && !submitted && (
                <div className="space-y-6">
                  {/* Timer & Progress */}
                  <div className="bg-white rounded-xl shadow-md p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Progress</p>
                        <p className="text-lg font-bold text-gray-800">
                          {getAnsweredCount()} / {roomData.questions.length} answered
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Time Remaining</p>
                        <p className={`text-2xl font-bold ${
                          timeLeft && timeLeft < 60 ? "text-red-600" : "text-blue-600"
                        }`}>
                          {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Questions */}
                  {roomData.questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="bg-white rounded-xl shadow-md p-6 space-y-3"
                    >
                      <p className="font-bold text-gray-800 text-lg">
                        {idx + 1}. {q.question}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((opt) => (
                          <label
                            key={opt}
                            className={`block border-2 p-3 rounded-lg cursor-pointer transition ${
                              answers[q.id] === opt
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={opt}
                              checked={answers[q.id] === opt}
                              onChange={() => handleAnswer(q.id, opt)}
                              className="mr-3"
                            />
                            <span className="text-gray-800">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Submit Button */}
                  <div className="sticky bottom-4">
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition font-bold text-lg shadow-lg disabled:opacity-50"
                    >
                      {submitting ? "Submitting..." : "Submit Quiz"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Room;