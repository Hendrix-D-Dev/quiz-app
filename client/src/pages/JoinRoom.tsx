import { useState } from "react";
import { useNavigate } from "react-router-dom";

const JoinRoom = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const code = roomCode.trim().toUpperCase();

    if (!code) {
      setError("Please enter a room code");
      return;
    }

    if (code.length < 4) {
      setError("Invalid room code");
      return;
    }

    // Navigate to room - student will enter name/matric there
    navigate(`/room/${code}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎯 Join Quiz Room
          </h1>
          <p className="text-gray-600">
            Enter the room code provided by your instructor
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Code
              </label>
              <input
                type="text"
                placeholder="e.g., ABC123"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  setError("");
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl font-mono font-bold tracking-wider uppercase"
                maxLength={10}
                required
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition shadow-md"
            >
              Join Room →
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              💡 Don't have a code? Ask your instructor
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">
            What happens next?
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>✓ Enter your name and matric number</li>
            <li>✓ Start the timed quiz</li>
            <li>✓ Submit before time runs out</li>
            <li>✓ See your score instantly</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;
