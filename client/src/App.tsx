import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Quiz from "./pages/Quiz";
import Results from "./pages/Results";
import AdminDashboard from "./pages/AdminDashboard";
import { useAuth } from "./context/AuthContext"; // removed unused AuthProvider import
import AuthPage from "./pages/AuthPage";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import Room from "./pages/Room";
import AdminHome from "./pages/AdminHome";
import StudentHome from "./pages/StudentHome";
import "./index.css";
import "./App.css";

// ✅ Optional wrapper to protect role-based routes
const ProtectedRoute = ({
  children,
  role,
}: {
  children: React.ReactElement; // changed from JSX.Element to React.ReactElement
  role: "admin" | "student";
}) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="text-center mt-20">Loading...</div>;
  if (!user || user.role !== role) return <Navigate to="/auth" replace />;

  return children;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-6">
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Role-based homes */}
            <Route
              path="/admin-home"
              element={
                <ProtectedRoute role="admin">
                  <AdminHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student-home"
              element={
                <ProtectedRoute role="student">
                  <StudentHome />
                </ProtectedRoute>
              }
            />

            {/* Quiz-related */}
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/quiz/:id" element={<Quiz />} />
            <Route path="/results" element={<Results />} />
            <Route path="/results/:id" element={<Results />} />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results-admin/:roomCode"
              element={
                <div className="text-center text-slate-600">
                  Admin Results Page Coming Soon
                </div>
              }
            />

            {/* Rooms */}
            <Route
              path="/create-room"
              element={
                <ProtectedRoute role="admin">
                  <CreateRoom />
                </ProtectedRoute>
              }
            />
            <Route
              path="/join-room"
              element={
                <ProtectedRoute role="student">
                  <JoinRoom />
                </ProtectedRoute>
              }
            />
            <Route path="/room/:code" element={<Room />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
