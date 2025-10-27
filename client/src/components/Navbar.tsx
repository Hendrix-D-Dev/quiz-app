import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

const Navbar = () => {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setMenuOpen(false);
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-indigo-100 px-4 sm:px-6 py-4 shadow-sm sticky top-0 z-50">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        {/* Logo with Icon */}
        <Link
          to="/"
          className="flex items-center space-x-2 group"
          onClick={() => setMenuOpen(false)}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              QuizMaster
            </span>
            <span className="text-xs text-slate-500 -mt-1">Smart Learning</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-1">
          {user && role === "admin" && (
            <>
              <NavLink to="/admin-home" icon="🏠">Admin Home</NavLink>
              <NavLink to="/admin" icon="📊">Dashboard</NavLink>
              <NavLink to="/create-room" icon="➕">Create Room</NavLink>
              <NavLink to="/results" icon="📈">Results</NavLink>
            </>
          )}

          {user && role === "student" && (
            <>
              <NavLink to="/" icon="🏠">Home</NavLink>
              <NavLink to="/join-room" icon="🚪">Join Room</NavLink>
              <NavLink to="/results" icon="📈">Results</NavLink>
            </>
          )}
        </div>

        {/* Desktop Auth Button */}
        <div className="hidden lg:flex items-center space-x-3">
          {user && (
            <div className="flex items-center space-x-3 mr-2">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-full">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user.email?.[0].toUpperCase() || "U"}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-700">
                    {role === "admin" ? "Admin" : "Student"}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {user ? (
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2"
            >
              <span>Logout</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          ) : (
            <Link
              to="/auth"
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2"
            >
              <span>Get Started</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 rounded-xl hover:bg-indigo-50 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6 text-slate-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden mt-4 pb-4 space-y-2 animate-in slide-in-from-top duration-200">
          {user && (
            <div className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                {user.email?.[0].toUpperCase() || "U"}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800">{user.email}</span>
                <span className="text-xs text-slate-600">{role === "admin" ? "Admin Account" : "Student Account"}</span>
              </div>
            </div>
          )}

          {user && role === "admin" && (
            <>
              <MobileNavLink to="/admin-home" icon="🏠" onClick={() => setMenuOpen(false)}>
                Admin Home
              </MobileNavLink>
              <MobileNavLink to="/admin" icon="📊" onClick={() => setMenuOpen(false)}>
                Dashboard
              </MobileNavLink>
              <MobileNavLink to="/create-room" icon="➕" onClick={() => setMenuOpen(false)}>
                Create Room
              </MobileNavLink>
              <MobileNavLink to="/results" icon="📈" onClick={() => setMenuOpen(false)}>
                Results
              </MobileNavLink>
            </>
          )}

          {user && role === "student" && (
            <>
              <MobileNavLink to="/" icon="🏠" onClick={() => setMenuOpen(false)}>
                Home
              </MobileNavLink>
              <MobileNavLink to="/join-room" icon="🚪" onClick={() => setMenuOpen(false)}>
                Join Room
              </MobileNavLink>
              <MobileNavLink to="/results" icon="📈" onClick={() => setMenuOpen(false)}>
                Results
              </MobileNavLink>
            </>
          )}

          {user ? (
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 mt-3"
            >
              <span>Logout</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={() => setMenuOpen(false)}
              className="block w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 text-center mt-3"
            >
              Get Started →
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

// Desktop Nav Link Component
const NavLink = ({ to, icon, children }: { to: string; icon: string; children: React.ReactNode }) => (
  <Link
    to={to}
    className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200 font-medium"
  >
    <span>{icon}</span>
    <span>{children}</span>
  </Link>
);

// Mobile Nav Link Component
const MobileNavLink = ({ 
  to, 
  icon, 
  children, 
  onClick 
}: { 
  to: string; 
  icon: string; 
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center space-x-3 px-4 py-3 text-slate-700 hover:bg-indigo-50 rounded-xl transition-all duration-200 font-medium"
  >
    <span className="text-xl">{icon}</span>
    <span>{children}</span>
  </Link>
);

export default Navbar;