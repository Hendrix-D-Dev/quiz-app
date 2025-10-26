import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const CreateRoom = () => {
  const { user, role } = useAuth();
  const [roomName, setRoomName] = useState("");
  const [timeLimit, setTimeLimit] = useState(30);
  const [questionRange, setQuestionRange] = useState("1-10");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-red-600 font-medium">
          Only admins can create quiz rooms.
        </p>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const maxQuestions = parseInt(questionRange.split("-")[1], 10);

    try {
      const resp = await axios.post("/api/room/create", {
        host: user?.uid || "unknown",
        roomName,
        timeLimit,
        maxQuestions,
        roomCode: code,
      });

      if (resp.data?.ok) {
        setRoomCode(code);
      } else {
        setError("Failed to create room. Please try again.");
      }
    } catch (err) {
      console.error("Error creating room:", err);
      setError("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const questionOptions = Array.from({ length: 10 }, (_, i) => {
    const end = (i + 1) * 5;
    return `1-${end}`;
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Create Quiz Room
        </h2>

        {!roomCode ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <input
              type="text"
              placeholder="Room Name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200"
              required
            />

            <input
              type="number"
              placeholder="Time Limit (minutes)"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200"
              min={1}
            />

            <select
              value={questionRange}
              onChange={(e) => setQuestionRange(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200"
            >
              {questionOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} Questions
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Room"}
            </button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </form>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-lg font-semibold text-green-600">
              Room created successfully!
            </p>
            <p className="text-gray-700">Share this code with students:</p>
            <div className="text-2xl font-bold text-purple-600">{roomCode}</div>
            <a
              href={`/room/${roomCode}`}
              className="block mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Go to Room
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateRoom;
