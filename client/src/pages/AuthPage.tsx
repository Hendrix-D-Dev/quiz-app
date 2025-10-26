import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const AuthPage = () => {
  const { user, login, signup, loading } = useAuth();
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialKey, setSpecialKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      const role = user.role || "student";
      navigate(role === "admin" ? "/admin-home" : "/student-home");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const role = isSignup
        ? await signup(email, password, specialKey)
        : await login(email, password, specialKey);

      navigate(role === "admin" ? "/admin-home" : "/student-home");
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err?.message || "Authentication failed. Please try again.");
    }
  };

  if (loading) return <div className="text-center mt-20">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-lg shadow-sm border">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          {isSignup ? "Sign Up" : "Login"}
        </h2>

        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-md text-sm"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-md text-sm"
            required
          />
          <input
            type="password"
            placeholder="Special Admin Key (optional)"
            value={specialKey}
            onChange={(e) => setSpecialKey(e.target.value)}
            className="w-full px-4 py-2 border rounded-md text-sm"
          />
          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium"
          >
            {isSignup ? "Sign Up" : "Login"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsSignup(!isSignup)}
            className="text-blue-600 hover:underline"
          >
            {isSignup ? "Login" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
