import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = user?.role;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shadow-md sticky top-0 z-50">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        {/* Branding */}
        <Link
          to="/"
          className="text-xl sm:text-2xl font-extrabold text-teal-700 tracking-tight"
        >
          Quiz<span className="text-sky-600">System</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-6 text-slate-700 font-medium">
          {user && role === "admin" && (
            <>
              <Link to="/admin-home" className="hover:text-teal-700 transition">
                Admin Home
              </Link>
              <Link to="/admin" className="hover:text-teal-700 transition">
                Dashboard
              </Link>
              <Link to="/create-room" className="hover:text-teal-700 transition">
                Create Room
              </Link>
              <Link to="/results" className="hover:text-teal-700 transition">
                Results
              </Link>
            </>
          )}

          {user && role === "student" && (
            <>
              <Link to="/" className="hover:text-teal-700 transition">
                Home
              </Link>
              <Link to="/join-room" className="hover:text-teal-700 transition">
                Join Room
              </Link>
              <Link to="/results" className="hover:text-teal-700 transition">
                Results
              </Link>
            </>
          )}
        </div>

        {/* Auth buttons */}
        <div className="hidden md:block">
          {user ? (
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/auth"
              className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-slate-700 text-2xl"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden mt-2 space-y-2 px-4 pb-3 text-slate-700">
          {user && role === "admin" && (
            <>
              <Link to="/admin-home" className="block hover:text-teal-700">
                Admin Home
              </Link>
              <Link to="/admin" className="block hover:text-teal-700">
                Dashboard
              </Link>
              <Link to="/create-room" className="block hover:text-teal-700">
                Create Room
              </Link>
              <Link to="/results" className="block hover:text-teal-700">
                Results
              </Link>
            </>
          )}

          {user && role === "student" && (
            <>
              <Link to="/" className="block hover:text-teal-700">
                Home
              </Link>
              <Link to="/join-room" className="block hover:text-teal-700">
                Join Room
              </Link>
              <Link to="/results" className="block hover:text-teal-700">
                Results
              </Link>
            </>
          )}

          {user ? (
            <button
              onClick={handleLogout}
              className="w-full bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/auth"
              className="block text-center bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition"
            >
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
