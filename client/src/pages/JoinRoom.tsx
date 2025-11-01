import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface RoomSession {
  code: string;
  name: string;
  matric: string;
  startedAt: number;
  timeLimit: number;
  answers: Record<string, string>;
}

const JoinRoom = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoveredSession, setRecoveredSession] = useState<RoomSession | null>(null);

  // Check for existing room sessions on component mount
  useEffect(() => {
    const checkExistingSessions = () => {
      const sessions: RoomSession[] = [];
      
      // Check all localStorage keys for room sessions
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('room_session_')) {
          try {
            const session = JSON.parse(localStorage.getItem(key) || '');
            if (session && session.code && session.startedAt) {
              sessions.push(session);
            }
          } catch (err) {
            console.warn('Invalid session data in localStorage:', key);
          }
        }
      }

      // Find the most recent active session
      if (sessions.length > 0) {
        const mostRecent = sessions.reduce((latest, session) => 
          session.startedAt > latest.startedAt ? session : latest
        );
        
        // Check if session is still valid (within time limit)
        const timeElapsed = Date.now() - mostRecent.startedAt;
        const timeLimitMs = mostRecent.timeLimit * 1000;
        
        if (timeElapsed < timeLimitMs) {
          setRecoveredSession(mostRecent);
          setRoomCode(mostRecent.code);
        } else {
          // Clean up expired session
          localStorage.removeItem(`room_session_${mostRecent.code}`);
        }
      }
    };

    checkExistingSessions();
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const code = roomCode.trim().toUpperCase();

    if (!code) {
      setError("Please enter a room code");
      setIsSubmitting(false);
      return;
    }

    if (code.length < 4) {
      setError("Room code should be at least 4 characters");
      setIsSubmitting(false);
      return;
    }

    // Simulate validation and navigation
    setTimeout(() => {
      navigate(`/room/${code}`);
    }, 1000);
  };

  const resumeSession = () => {
    if (recoveredSession) {
      navigate(`/room/${recoveredSession.code}`);
    }
  };

  const discardSession = () => {
    if (recoveredSession) {
      localStorage.removeItem(`room_session_${recoveredSession.code}`);
      setRecoveredSession(null);
      setRoomCode("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Session Recovery Alert */}
        {recoveredSession && (
          <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 animate-fade-in">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white text-lg">
                🔄
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-800 mb-2">
                  Quiz Session Found!
                </h3>
                <p className="text-green-700 mb-3">
                  You have an active quiz session for room <span className="font-mono font-bold">{recoveredSession.code}</span>. 
                  You can resume where you left off.
                </p>
                <div className="bg-white/80 rounded-xl p-4 mb-4 border border-green-200">
                  <div className="text-sm text-green-800 space-y-1">
                    <div className="flex justify-between">
                      <span>Room:</span>
                      <span className="font-mono font-bold">{recoveredSession.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Progress:</span>
                      <span>{Object.keys(recoveredSession.answers).length} questions answered</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time Left:</span>
                      <span>
                        {Math.max(0, Math.floor((recoveredSession.timeLimit * 1000 - (Date.now() - recoveredSession.startedAt)) / 60000))} min
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={resumeSession}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center space-x-2"
                  >
                    <span>Resume Quiz</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                  </button>
                  <button
                    onClick={discardSession}
                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                  >
                    Start New
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg mx-auto mb-4">
            🚪
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Join Quiz Room
          </h1>
          <p className="text-slate-600">
            Enter the room code provided by your instructor
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Room Code
              </label>
              <input
                type="text"
                placeholder="Enter room code (e.g., ABC123)"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  setError("");
                }}
                className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl font-mono font-bold tracking-wider uppercase transition-all duration-200"
                maxLength={10}
                required
                autoFocus={!recoveredSession}
              />
              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !roomCode.trim()}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Joining Room...</span>
                </>
              ) : (
                <>
                  <span>Join Room</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-600 text-center">
              💡 Don't have a code? Ask your instructor for the room code
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What to Expect
          </h3>
          <ul className="text-sm text-blue-700 space-y-2">
            <li className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              Enter your name and matric number
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              Start the timed quiz when ready
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              Answer all questions before time runs out
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              See your score and results immediately
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              Auto-save progress (recover if disconnected)
            </li>
          </ul>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center border border-slate-200">
            <div className="text-2xl mb-2">⏱️</div>
            <div className="text-sm font-medium text-slate-700">Timed</div>
            <div className="text-xs text-slate-500">Complete before time ends</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center border border-slate-200">
            <div className="text-2xl mb-2">📱</div>
            <div className="text-sm font-medium text-slate-700">Live Results</div>
            <div className="text-xs text-slate-500">Instant score feedback</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center border border-slate-200">
            <div className="text-2xl mb-2">💾</div>
            <div className="text-sm font-medium text-slate-700">Auto-Save</div>
            <div className="text-xs text-slate-500">Recover progress</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center border border-slate-200">
            <div className="text-2xl mb-2">🔄</div>
            <div className="text-sm font-medium text-slate-700">Resume</div>
            <div className="text-xs text-slate-500">Continue if interrupted</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;