import { useNavigate } from "react-router-dom";

const AdminHome = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-sm border text-center">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Admin Home</h2>
        <button
          onClick={() => navigate("/quiz")}
          className="w-full py-3 mb-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Take Quiz
        </button>
        <button
          onClick={() => navigate("/create-room")}
          className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
        >
          Create Room
        </button>
      </div>
    </div>
  );
};

export default AdminHome;
