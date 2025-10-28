import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

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
    className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 p-6 border border-slate-100"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
    <div className="relative">
      <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-2xl mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  </Link>
);

// ✅ Stat Card Component
const StatCard = ({ number, label }: { number: string; label: string }) => (
  <div className="text-center">
    <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
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
    <div className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-indigo-200">
      <div className={`w-16 h-16 bg-gradient-to-br ${colorClasses[color]} rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
};

// ✅ Home Component (moved below)
const Home = () => {
  const { user, role } = useAuth();

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '4s' }}></div>
          </div>

          <div className="relative container-custom section-padding">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-100 rounded-full mb-6 animate-fade-in">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
                <span className="text-sm font-semibold text-indigo-700">AI-Powered Learning Platform</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Master Any Subject
                </span>
                <br />
                <span className="text-slate-800">With Smart Quizzes</span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
                Experience the future of learning with AI-generated quizzes, real-time rooms, 
                and instant feedback. Perfect for students and educators.
              </p>

              {/* CTA Buttons */}
              {!user ? (
                <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                  <Link
                    to="/auth"
                    className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-semibold text-lg overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative flex items-center justify-center space-x-2">
                      <span>Get Started Free</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </Link>
                  
                  <a
                    href="#features"
                    className="px-8 py-4 bg-white text-indigo-600 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 font-semibold text-lg border-2 border-indigo-100 hover:border-indigo-200"
                  >
                    Learn More
                  </a>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-3xl animate-fade-in" style={{ animationDelay: '0.3s' }}>
                  <ActionCard to="/quiz" icon="📝" title="Take Quiz" description="Practice and improve" gradient="from-blue-500 to-cyan-500" />

                  {role === "student" && (
                    <ActionCard to="/join-room" icon="🚪" title="Join Room" description="Enter live quiz" gradient="from-indigo-500 to-purple-500" />
                  )}

                  {role === "admin" && (
                    <ActionCard to="/create-room" icon="➕" title="Create Room" description="Host a quiz session" gradient="from-purple-500 to-pink-500" />
                  )}

                  <ActionCard to="/results" icon="📊" title="View Results" description="Track your progress" gradient="from-emerald-500 to-teal-500" />
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 mt-16 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <StatCard number="10K+" label="Active Users" />
                <StatCard number="50K+" label="Quizzes Created" />
                <StatCard number="99%" label="Success Rate" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="section bg-white/50 backdrop-blur-sm">
          <div className="container-custom">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-800">
                Why Choose <span className="gradient-text">QuizMaster</span>?
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Everything you need to create, share, and ace quizzes
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard icon="🤖" title="AI-Powered Generation" description="Upload documents and let AI create intelligent quizzes automatically" color="indigo" />
              <FeatureCard icon="⚡" title="Real-Time Rooms" description="Create live quiz sessions with instant grading and leaderboards" color="purple" />
              <FeatureCard icon="📊" title="Detailed Analytics" description="Track performance with comprehensive results and insights" color="emerald" />
              <FeatureCard icon="🎯" title="Instant Feedback" description="Get immediate scores and see correct answers after submission" color="blue" />
              <FeatureCard icon="📱" title="Mobile Friendly" description="Take quizzes anywhere on any device with responsive design" color="pink" />
              <FeatureCard icon="🔐" title="Secure & Private" description="Your data is protected with enterprise-grade security" color="amber" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Home;
