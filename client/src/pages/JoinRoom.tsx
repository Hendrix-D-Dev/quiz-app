import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const JoinRoom = () => {
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [matricNumber, setMatricNumber] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode || !name || !matricNumber) return;

    console.log({ user, name, matricNumber, roomCode });
    window.location.href = `/room/${roomCode}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Join Quiz Room
        </h2>

        <form onSubmit={handleJoin} className="space-y-4">
          <input
            type="text"
            placeholder="Room Code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-indigo-200"
            required
          />
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-indigo-200"
            required
          />
          <input
            type="text"
            placeholder="Matric Number / Student ID"
            value={matricNumber}
            onChange={(e) => setMatricNumber(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-indigo-200"
            required
          />

          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinRoom;
