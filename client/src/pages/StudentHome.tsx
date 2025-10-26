import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const StudentHome = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md border text-center">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Welcome Student</h2>
        <button
          onClick={() => navigate("/quiz")}
          className="w-full py-3 mb-4 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition font-medium"
        >
          Take Quiz
        </button>
        <button
          onClick={() => navigate("/join-room")}
          className="w-full py-3 mb-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition font-medium"
        >
          Join Room
        </button>
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition font-medium"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default StudentHome;
