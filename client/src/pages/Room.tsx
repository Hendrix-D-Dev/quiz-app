import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import type { Question } from "../utils/types";
import { useAuth } from "../context/AuthContext";

type Participant = {
  name: string;
  matric: string;
  answers: Record<string, string>;
};

const Room = () => {
  const { code } = useParams<{ code: string }>();
  const { role } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [name, setName] = useState("");
  const [matric, setMatric] = useState("");
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!code) return;
    axios.get(`/api/room/${code}`).then((res) => {
      setQuestions(res.data.questions || []);
      setTimeLeft(res.data.timeLimit * 60);
    });

    if (role === "admin") {
      axios.get(`/api/room/${code}/participants`).then((res) => {
        setParticipants(res.data.participants || []);
      });
    }
  }, [code, role]);

  useEffect(() => {
    if (timeLeft === null || !started) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setTimeout(
      () => setTimeLeft((prev) => (prev ? prev - 1 : 0)),
      1000
    );
    return () => clearTimeout(t);
  }, [timeLeft, started]);

  const handleAnswer = (qId: string, choice: string) => {
    setAnswers({ ...answers, [qId]: choice });
  };

  const handleSubmit = async () => {
    if (!name || !matric) return alert("Please enter name and matric number");

    try {
      await axios.post(`/api/room/${code}/submit`, {
        name,
        matric,
        answers,
      });
      alert("Quiz submitted!");
    } catch (err) {
      console.error("Submit error:", err);
      alert("Failed to submit quiz.");
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <Navbar />
      <div className="p-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">
          Room: {code}
        </h2>

        {/* Student Section */}
        {!started && role !== "admin" && (
          <div className="space-y-4 bg-white p-6 rounded-xl shadow">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Matric Number"
              value={matric}
              onChange={(e) => setMatric(e.target.value)}
              className="w-full border px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setStarted(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Start Quiz
            </button>
          </div>
        )}

        {started && role !== "admin" && (
          <div className="space-y-6">
            <p className="text-right text-red-600 font-semibold">
              Time left: {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
            </p>
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white p-6 rounded-xl shadow space-y-2"
              >
                <p className="font-bold text-gray-800">
                  {idx + 1}. {q.question}
                </p>
                {q.options.map((opt) => (
                  <label
                    key={opt}
                    className="block border p-2 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => handleAnswer(q.id, opt)}
                      className="mr-2"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ))}
            <button
              onClick={handleSubmit}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition"
            >
              Submit
            </button>
          </div>
        )}

        {/* Admin Section */}
        {role === "admin" && (
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              Participants
            </h3>
            {participants.length === 0 ? (
              <p className="text-gray-600">No participants yet.</p>
            ) : (
              <ul className="space-y-3">
                {participants.map((p, i) => (
                  <li
                    key={i}
                    className="bg-white border p-4 rounded-lg shadow-sm flex justify-between"
                  >
                    <span className="font-medium text-gray-700">{p.name}</span>
                    <span className="text-sm text-gray-500">{p.matric}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Room;
