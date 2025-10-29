import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Quiz from "./pages/Quiz";
import Results from "./pages/Results";
import AdminDashboard from "./pages/AdminDashboard";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import Room from "./pages/Room";
import "./index.css";
import "./App.css";

// ✅ Protect role-based routes
const ProtectedRoute = ({
  children,
  role,
}: {
  children: React.ReactElement;
  role: "admin" | "student";
}) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
  if (!user || user.role !== role) return <Navigate to="/auth" replace />;

  return children;
};

// ✅ Public route that redirects if already authenticated
const PublicRoute = ({ children }: { children: React.ReactElement }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/quiz"} replace />;

  return children;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
        {/* ✅ Single Navbar - No duplicates */}
        <Navbar />
        
        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            } />
            <Route path="/room/:code" element={<Room />} />

            {/* Quiz Routes (Public) */}
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/quiz/:id" element={<Quiz />} />
            <Route path="/results" element={<Results />} />
            <Route path="/results/:id" element={<Results />} />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/create-room" element={
              <ProtectedRoute role="admin">
                <CreateRoom />
              </ProtectedRoute>
            } />

            {/* Student Routes */}
            <Route path="/join-room" element={
              <ProtectedRoute role="student">
                <JoinRoom />
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;