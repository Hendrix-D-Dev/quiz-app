import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

// ✅ Action Card Component
const ActionCard = ({ 
  to, 
  icon, 
  title, 
  description, 
  gradient 
}: { 
  to: string; 
  icon: string; 
  title: string; 
  description: string; 
  gradient: string;
}) => (
  <Link
    to={to}
    className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 p-6 border border-white/20"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
    <div className="relative">
      <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-2xl mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  </Link>
);

// ✅ Stat Card Component
const StatCard = ({ number, label }: { number: string; label: string }) => (
  <div className="text-center group">
    <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
      {number}
    </div>
    <div className="text-sm md:text-base text-slate-600 font-medium">{label}</div>
  </div>
);

// ✅ Feature Card Component
const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  color 
}: { 
  icon: string; 
  title: string; 
  description: string; 
  color: string;
}) => {
  const colorClasses: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-600',
    purple: 'from-purple-500 to-purple-600',
    emerald: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    pink: 'from-pink-500 to-pink-600',
    amber: 'from-amber-500 to-amber-600',
  };

  return (
    <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 hover:border-indigo-200">
      <div className={`w-16 h-16 bg-gradient-to-br ${colorClasses[color]} rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
};

const Home = () => {
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full mb-8 border border-white/20 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-sm font-semibold text-indigo-700">AI-Powered Learning Platform</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Master Any
              </span>
              <br />
              <span className="text-slate-800">Subject</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-slate-600 mb-12 max-w-3xl leading-relaxed">
              Transform your learning experience with AI-generated quizzes, real-time collaboration, 
              and instant feedback. Built for modern educators and students.
            </p>

            {/* Action Cards */}
            {user ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-4xl">
                <ActionCard 
                  to="/quiz" 
                  icon="📝" 
                  title="Take Quiz" 
                  description="Practice with AI-generated questions" 
                  gradient="from-blue-500 to-cyan-500" 
                />
                
                {role === "student" && (
                  <ActionCard 
                    to="/join-room" 
                    icon="🚪" 
                    title="Join Room" 
                    description="Enter live quiz sessions" 
                    gradient="from-indigo-500 to-purple-500" 
                  />
                )}

                {role === "admin" && (
                  <ActionCard 
                    to="/create-room" 
                    icon="➕" 
                    title="Create Room" 
                    description="Host interactive sessions" 
                    gradient="from-purple-500 to-pink-500" 
                  />
                )}

                <ActionCard 
                  to="/results" 
                  icon="📊" 
                  title="View Results" 
                  description="Track your progress" 
                  gradient="from-emerald-500 to-teal-500" 
                />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-6 mb-16">
                <Link
                  to="/auth"
                  className="group relative px-12 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 font-semibold text-lg overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative flex items-center justify-center space-x-3">
                    <span>Start Learning Free</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>
                
                <a
                  href="#features"
                  className="px-12 py-4 bg-white/80 backdrop-blur-sm text-indigo-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-semibold text-lg border-2 border-indigo-100 hover:border-indigo-200"
                >
                  Explore Features
                </a>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-12 mt-20">
              <StatCard number="10+" label="Active Learners" />
              <StatCard number="50++" label="Quizzes Created" />
              <StatCard number="99%" label="Satisfaction Rate" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-800">
              Why <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">QuizMaster</span>?
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Everything you need for effective learning and teaching in one platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon="🤖" 
              title="AI-Powered Generation" 
              description="Upload any document and instantly generate intelligent, context-aware quiz questions" 
              color="indigo" 
            />
            <FeatureCard 
              icon="⚡" 
              title="Real-Time Collaboration" 
              description="Create live quiz rooms with instant grading and interactive leaderboards" 
              color="purple" 
            />
            <FeatureCard 
              icon="📊" 
              title="Smart Analytics" 
              description="Track performance with detailed insights and progress visualization" 
              color="emerald" 
            />
            <FeatureCard 
              icon="🎯" 
              title="Instant Feedback" 
              description="Get immediate scoring with detailed explanations for every answer" 
              color="blue" 
            />
            <FeatureCard 
              icon="🔐" 
              title="Secure & Private" 
              description="Enterprise-grade security protecting your data and privacy" 
              color="amber" 
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;