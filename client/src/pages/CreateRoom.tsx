import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createRoom } from "../services/api";
import { useNavigate } from "react-router-dom";

const CreateRoom = () => {
  const { role } = useAuth(); // ✅ Removed unused 'user' variable
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const [timeLimit, setTimeLimit] = useState(30);
  const [questionCount, setQuestionCount] = useState(10);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center max-w-md border border-white/20">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-red-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
            ⚠️
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h3>
          <p className="text-slate-600 mb-6">Only administrators can create quiz rooms.</p>
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await createRoom({
        quizId: "generated", // You might want to select from existing quizzes
        timeLimit: timeLimit * 60, // Convert to seconds
        questionCount,
        roomName: roomName || undefined,
      });

      if (response?.roomCode) {
        setRoomCode(response.roomCode);
      } else {
        setError("Failed to create room. Please try again.");
      }
    } catch (err: any) {
      console.error("Error creating room:", err);
      setError(err.message || "Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const questionOptions = [5, 10, 15, 20, 25, 30];
  const timeOptions = [5, 10, 15, 20, 30, 45, 60];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg mx-auto mb-4">
            🎯
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Create Quiz Room</h1>
          <p className="text-slate-600">Set up a live quiz session for your students</p>
        </div>

        {!roomCode ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Room Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Room Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Midterm Review Session"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Time Limit */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Time Limit
                </label>
                <select
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                >
                  {timeOptions.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minutes
                    </option>
                  ))}
                </select>
              </div>

              {/* Question Count */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Number of Questions
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                >
                  {questionOptions.map((count) => (
                    <option key={count} value={count}>
                      {count} questions
                    </option>
                  ))}
                </select>
              </div>

              {/* Info Card */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2">Room Setup Info</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• {questionCount} questions total</li>
                  <li>• {timeLimit} minute time limit</li>
                  <li>• Students join with room code</li>
                  <li>• Real-time progress tracking</li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating Room...</span>
                  </>
                ) : (
                  <>
                    <span>Create Room</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}
            </form>
          </div>
        ) : (
          /* Success State */
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center border border-white/20 animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-2xl text-white shadow-lg mx-auto mb-6">
              ✅
            </div>
            
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Room Created!</h3>
            <p className="text-slate-600 mb-6">Share this code with your students to join</p>
            
            {/* Room Code Display */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 mb-6 shadow-lg">
              <div className="text-4xl font-bold text-white font-mono tracking-wider">
                {roomCode}
              </div>
              <p className="text-emerald-100 text-sm mt-2">Room Code</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/room/${roomCode}`)}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <span>Go to Room Dashboard</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              
              <button
                onClick={() => {
                  setRoomCode(null);
                  setRoomName("");
                  setTimeLimit(30);
                  setQuestionCount(10);
                }}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
              >
                Create Another Room
              </button>
            </div>

            {/* Quick Tips */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h4 className="font-semibold text-slate-700 mb-3">Quick Tips</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-blue-600 font-semibold">Share Code</div>
                  <div className="text-blue-500">Display for students</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-green-600 font-semibold">Monitor</div>
                  <div className="text-green-500">Track submissions</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateRoom;