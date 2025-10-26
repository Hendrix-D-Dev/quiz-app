import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const Home = () => {
  const { user, role } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 px-6 text-center">
      <h1 className="text-4xl font-extrabold text-teal-700 mb-4">
        Smart Quiz App
      </h1>
      <p className="text-slate-600 mb-10 max-w-md">
        An AI-powered platform for students to practice quizzes and for teachers
        to create and manage quiz rooms easily.
      </p>

      {!user ? (
        <Link
          to="/auth"
          className="px-8 py-3 bg-teal-600 text-white rounded-lg shadow hover:bg-teal-700 transition text-lg"
        >
          Login / Sign Up
        </Link>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 w-full max-w-md">
          <Link
            to="/quiz"
            className="px-6 py-4 bg-sky-600 text-white rounded-lg shadow hover:bg-sky-700 text-center font-medium"
          >
            Take Quiz
          </Link>

          {role === "student" && (
            <Link
              to="/join-room"
              className="px-6 py-4 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 text-center font-medium"
            >
              Join Room
            </Link>
          )}

          {role === "admin" && (
            <Link
              to="/create-room"
              className="px-6 py-4 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 text-center font-medium"
            >
              Create Room
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
