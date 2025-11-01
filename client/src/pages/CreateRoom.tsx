import { useState, useCallback, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { createRoom, fetchAllQuizzes, getActiveAdminRooms } from "../services/api";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";

interface ActiveRoom {
  code: string;
  roomName?: string;
  createdAt: number;
  status: string;
  participantCount: number;
}

const CreateRoom = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [useCustomCode, setUseCustomCode] = useState(false);
  const [timeLimit, setTimeLimit] = useState(30);
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [showRoomRecovery, setShowRoomRecovery] = useState(false);

  // Load quizzes and active rooms on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingQuizzes(true);
      try {
        const [quizzesData, activeRoomsData] = await Promise.all([
          fetchAllQuizzes(),
          getActiveAdminRooms()
        ]);
        setQuizzes(quizzesData);
        setActiveRooms(activeRoomsData || []);
        
        // Show recovery alert if there are active rooms
        if (activeRoomsData && activeRoomsData.length > 0) {
          setShowRoomRecovery(true);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setIsLoadingQuizzes(false);
      }
    };
    loadData();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      if (file.size > 25 * 1024 * 1024) {
        setError("File size must be less than 25MB");
        return;
      }
      
      setUploadedFile(file);
      setSelectedQuizId("");
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'text/html': ['.html', '.htm'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/epub+zip': ['.epub'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'application/json': ['.json']
    },
    maxFiles: 1,
    multiple: false
  });

  const removeFile = () => {
    setUploadedFile(null);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc': case 'docx': return '📝';
      case 'txt': return '📃';
      case 'csv': return '📊';
      case 'html': case 'htm': return '🌐';
      case 'ppt': case 'pptx': return '📊';
      case 'xls': case 'xlsx': return '📈';
      case 'epub': return '📚';
      case 'png': case 'jpg': case 'jpeg': case 'gif': return '🖼️';
      case 'json': return '⚙️';
      default: return '📎';
    }
  };

  const getFileTypeDescription = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf': return 'PDF Document';
      case 'doc': case 'docx': return 'Word Document';
      case 'txt': return 'Text File';
      case 'csv': return 'CSV Spreadsheet';
      case 'html': case 'htm': return 'HTML File';
      case 'ppt': case 'pptx': return 'PowerPoint Presentation';
      case 'xls': case 'xlsx': return 'Excel Spreadsheet';
      case 'epub': return 'EPUB eBook';
      case 'png': case 'jpg': case 'jpeg': return 'Image File';
      case 'gif': return 'GIF Image';
      case 'json': return 'JSON Data';
      default: return 'Document';
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!uploadedFile && !selectedQuizId) {
      setError("Please either upload a document or select an existing quiz");
      setLoading(false);
      return;
    }

    if (useCustomCode && roomCode) {
      if (roomCode.length < 4 || roomCode.length > 10) {
        setError("Room code must be between 4 and 10 characters");
        setLoading(false);
        return;
      }
      if (!/^[A-Za-z0-9]+$/.test(roomCode)) {
        setError("Room code can only contain letters and numbers");
        setLoading(false);
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append("timeLimit", (timeLimit * 60).toString());
      formData.append("questionCount", questionCount.toString());
      
      if (roomName) {
        formData.append("roomName", roomName);
      }
      
      if (useCustomCode && roomCode) {
        formData.append("roomCode", roomCode.toUpperCase());
      }
      
      if (uploadedFile) {
        formData.append("file", uploadedFile);
      } else if (selectedQuizId) {
        formData.append("quizId", selectedQuizId);
      }

      const response = await createRoom(formData);

      if (response?.roomCode || response?.room?.roomCode) {
        const newRoomCode = response.roomCode || response.room.roomCode;
        setCreatedRoomCode(newRoomCode);
        
        // Store room creation in localStorage for recovery
        const roomSession = {
          code: newRoomCode,
          roomName: roomName || `Room ${newRoomCode}`,
          createdAt: Date.now(),
          createdBy: user?.uid
        };
        localStorage.setItem(`room_${newRoomCode}`, JSON.stringify(roomSession));
      } else {
        setError("Failed to create room. Please try again.");
      }
    } catch (err: any) {
      console.error("Error creating room:", err);
      setError(err.message || "Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const joinExistingRoom = (roomCode: string) => {
    navigate(`/room/${roomCode}`);
  };

  const createNewRoom = () => {
    setShowRoomRecovery(false);
    // Reset form for new room
    setRoomName("");
    setRoomCode("");
    setUseCustomCode(false);
    setTimeLimit(30);
    setQuestionCount(10);
    setUploadedFile(null);
    setSelectedQuizId("");
  };

  if (role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center max-w-md border border-white/20">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-red-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
            ⚠️
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h3>
          <p className="text-slate-600 mb-6">Only administrators can create quiz rooms.</p>
          <button 
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const questionOptions = [5, 10, 15, 20, 25, 30];
  const timeOptions = [5, 10, 15, 20, 30, 45, 60];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Room Recovery Alert */}
        {showRoomRecovery && activeRooms.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 animate-fade-in">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white text-lg">
                🔄
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-800 mb-2">
                  Active Room Detected
                </h3>
                <p className="text-amber-700 mb-4">
                  You have {activeRooms.length} active room{activeRooms.length > 1 ? 's' : ''}. 
                  Would you like to rejoin or create a new room?
                </p>
                <div className="space-y-3">
                  {activeRooms.map((room) => (
                    <div key={room.code} className="flex items-center justify-between bg-white/80 rounded-xl p-4 border border-amber-200">
                      <div>
                        <div className="font-semibold text-amber-900">
                          {room.roomName || `Room ${room.code}`}
                        </div>
                        <div className="text-sm text-amber-700">
                          Code: <span className="font-mono font-bold">{room.code}</span> • 
                          Participants: {room.participantCount} • 
                          Created: {new Date(room.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <button
                        onClick={() => joinExistingRoom(room.code)}
                        className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center space-x-2"
                      >
                        <span>Rejoin</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={createNewRoom}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    Create New Room
                  </button>
                  <button
                    onClick={() => setShowRoomRecovery(false)}
                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg mx-auto mb-4">
            🎯
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Create Quiz Room</h1>
          <p className="text-slate-600">Set up a live quiz session for your students</p>
        </div>

        {!createdRoomCode ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Room Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Room Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Midterm Review Session"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Custom Room Code Section */}
              <div>
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="useCustomCode"
                    checked={useCustomCode}
                    onChange={(e) => setUseCustomCode(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                  />
                  <label htmlFor="useCustomCode" className="ml-2 text-sm font-medium text-slate-700">
                    Set custom room code
                  </label>
                </div>
                
                {useCustomCode && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Custom Room Code
                    </label>
                    <input
                      type="text"
                      placeholder="Enter 4-10 character code (e.g., MATH101)"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 font-mono uppercase"
                      maxLength={10}
                      minLength={4}
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Letters and numbers only. 4-10 characters.
                    </p>
                  </div>
                )}
              </div>

              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload Document (Optional)
                </label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                    isDragActive
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-300 hover:border-purple-400 hover:bg-slate-50"
                  } ${uploadedFile ? "border-green-500 bg-green-50" : ""}`}
                >
                  <input {...getInputProps()} />
                  {uploadedFile ? (
                    <div className="text-green-600">
                      <div className="text-4xl mb-2">{getFileIcon(uploadedFile.name)}</div>
                      <p className="font-semibold">{uploadedFile.name}</p>
                      <p className="text-sm text-green-700 mt-1">
                        {getFileTypeDescription(uploadedFile.name)} • {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(); }}
                        className="mt-2 text-sm text-red-600 hover:text-red-700"
                      >
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="text-slate-600">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="font-semibold">Drop any document here, or click to browse</p>
                      <p className="text-sm mt-1">
                        Supports: PDF, Word, Excel, PowerPoint, EPUB, Text, CSV, HTML, Images, JSON
                      </p>
                      <p className="text-xs text-slate-500 mt-2">Max 25MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">OR</span>
                </div>
              </div>

              {/* Existing Quiz Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Existing Quiz (Optional)
                </label>
                <select
                  value={selectedQuizId}
                  onChange={(e) => {
                    setSelectedQuizId(e.target.value);
                    setUploadedFile(null);
                  }}
                  disabled={isLoadingQuizzes}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                >
                  <option value="">Choose an existing quiz...</option>
                  {quizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.title} ({quiz.questions?.length || 0} questions)
                    </option>
                  ))}
                </select>
                {isLoadingQuizzes && (
                  <p className="text-sm text-slate-500 mt-1">Loading quizzes...</p>
                )}
              </div>

              {/* Time Limit */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Time Limit
                </label>
                <select
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                >
                  {timeOptions.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minutes
                    </option>
                  ))}
                </select>
              </div>

              {/* Question Count */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Number of Questions
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                >
                  {questionOptions.map((count) => (
                    <option key={count} value={count}>
                      {count} questions
                    </option>
                  ))}
                </select>
              </div>

              {/* Info Card */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2">Room Setup Info</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• {questionCount} questions total</li>
                  <li>• {timeLimit} minute time limit</li>
                  <li>• {useCustomCode && roomCode ? `Custom code: ${roomCode}` : "Auto-generated room code"}</li>
                  <li>• {uploadedFile ? `Quiz from: ${getFileTypeDescription(uploadedFile.name)}` : selectedQuizId ? "Using existing quiz" : "Upload document or select quiz"}</li>
                  <li>• Students join with room code</li>
                  <li>• Real-time progress tracking</li>
                  <li>• Session recovery enabled</li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (!uploadedFile && !selectedQuizId)}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating Room...</span>
                  </>
                ) : (
                  <>
                    <span>Create Room</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}
            </form>
          </div>
        ) : (
          /* Success State */
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center border border-white/20 animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-2xl text-white shadow-lg mx-auto mb-6">
              ✅
            </div>
            
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Room Created!</h3>
            <p className="text-slate-600 mb-6">Share this code with your students to join</p>
            
            {/* Room Code Display */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 mb-6 shadow-lg">
              <div className="text-4xl font-bold text-white font-mono tracking-wider">
                {createdRoomCode}
              </div>
              <p className="text-emerald-100 text-sm mt-2">Room Code</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/room/${createdRoomCode}`)}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <span>Go to Room Dashboard</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              
              <button
                onClick={() => {
                  setCreatedRoomCode(null);
                  setRoomName("");
                  setRoomCode("");
                  setUseCustomCode(false);
                  setTimeLimit(30);
                  setQuestionCount(10);
                  setUploadedFile(null);
                  setSelectedQuizId("");
                }}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
              >
                Create Another Room
              </button>
            </div>

            {/* Quick Tips */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h4 className="font-semibold text-slate-700 mb-3">Quick Tips</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-blue-600 font-semibold">Share Code</div>
                  <div className="text-blue-500">Display for students</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-green-600 font-semibold">Monitor</div>
                  <div className="text-green-500">Track submissions</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-amber-600 font-semibold">Recovery</div>
                  <div className="text-amber-500">Auto-save progress</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-purple-600 font-semibold">Export</div>
                  <div className="text-purple-500">Download results</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateRoom;