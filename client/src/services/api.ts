import axios from "axios";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

const isDev = import.meta.env.MODE === "development";

// Enhanced URL detection with fallbacks
const baseURL = (() => {
  const envUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;
  
  if (isDev) {
    return "http://localhost:4000";
  } else {
    return "https://quiz-app-xgwd.onrender.com";
  }
})();

console.log("🌍 Using API Base URL:", baseURL);

const api = axios.create({
  baseURL: `${baseURL}/api`,
  withCredentials: false,
  timeout: 60000, // Increased timeout for file processing
});

// Enhanced Firebase token management
let tokenRefreshPromise: Promise<string> | null = null;
const auth = getAuth();

// Function to refresh token with retry logic
const refreshToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No authenticated user");
  }

  try {
    console.log("🔄 Refreshing Firebase token...");
    const token = await user.getIdToken(true); // Force refresh
    console.log("✅ Token refreshed successfully");
    return token;
  } catch (error) {
    console.error("❌ Failed to refresh token:", error);
    // If token refresh fails, sign out the user
    await signOut(auth);
    throw new Error("Authentication failed. Please sign in again.");
  }
};

// Get current token with automatic refresh
const getCurrentToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    // If we're already refreshing, wait for that promise
    if (tokenRefreshPromise) {
      return await tokenRefreshPromise;
    }

    // Get fresh token
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error("❌ Error getting token:", error);
    return null;
  }
};

// Listen for auth state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      console.log("👤 User signed in, getting fresh token...");
      await user.getIdToken();
      console.log("✅ Token updated on auth state change");
    } catch (error) {
      console.error("❌ Failed to get token on auth change:", error);
    }
  } else {
    console.log("👤 User signed out, clearing token");
    tokenRefreshPromise = null;
  }
});

// Enhanced request interceptor with token refresh
api.interceptors.request.use(async (config) => {
  // Skip auth for public endpoints
  const publicEndpoints = [
    '/room/', // Room endpoints don't need auth (except create)
    '/quiz/submit' // Generated quiz submission
  ];
  
  const isPublicEndpoint = publicEndpoints.some(endpoint => 
    config.url?.startsWith(endpoint) && 
    !config.url?.includes('/create') && 
    !config.url?.includes('/participants') && 
    !config.url?.includes('/close') &&
    !config.url?.includes('/export') &&
    !config.url?.includes('/active')
  );

  if (isPublicEndpoint) {
    console.log("🌐 Public endpoint, skipping auth");
    return config;
  }

  try {
    const token = await getCurrentToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("🔑 Added auth token to request");
    } else {
      console.warn("⚠️ No auth token available");
    }
  } catch (error) {
    console.error("❌ Token error in interceptor:", error);
    // Don't block the request, just continue without token
  }

  console.log("📤 Outgoing request:", {
    url: config.url,
    method: config.method,
    hasData: !!config.data,
    dataType: config.data instanceof FormData ? 'FormData' : 'JSON'
  });

  return config;
});

// Enhanced response interceptor with token refresh on 401
api.interceptors.response.use(
  (response) => {
    console.log("✅ Request successful:", {
      url: response.config.url,
      status: response.status
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.error("🚨 API Error:", {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      message: error.message,
      code: error.code
    });

    // Handle token expiration (401)
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log("🔄 Token expired, attempting refresh...");
      originalRequest._retry = true;

      try {
        // Refresh the token
        const newToken = await refreshToken();
        
        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        console.log("🔄 Retrying request with fresh token...");
        return api(originalRequest);
      } catch (refreshError) {
        console.error("❌ Token refresh failed:", refreshError);
        // Sign out user if refresh fails
        await signOut(auth);
        return Promise.reject(new Error("Authentication failed. Please sign in again."));
      }
    }

    // Handle timeouts
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error("⏰ Request timeout");
    }

    return Promise.reject(error);
  }
);

// ========================================
// 📄 DOCUMENT PROCESSING WITH ENHANCED ERROR HANDLING
// ========================================
export async function processDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    console.log("📤 Processing document:", file.name, file.type);
    const res = await api.post("/ai/process", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  } catch (err: any) {
    console.error("❌ processDocument failed:", err);
    
    // Enhanced error handling for PDF and content issues
    const errorMessage = err.response?.data?.error || err.message;
    
    if (errorMessage.includes('PDF_CONTENT_ERROR') || 
        errorMessage.includes('INVALID_CONTENT') ||
        errorMessage.includes('image-based') ||
        errorMessage.includes('scanned')) {
      throw new Error(
        "Unable to extract educational content from this PDF. " +
        "This may be a scanned PDF or contain limited text. " +
        "Please try a PDF with selectable text, or use DOCX/TXT format for best results."
      );
    } else if (errorMessage.includes('POOR_QUALITY_QUESTIONS') ||
               errorMessage.includes('mostly metadata')) {
      throw new Error(
        "The content extracted was not suitable for quiz generation. " +
        "The document appears to contain mostly technical metadata instead of educational content. " +
        "Please try a different document with substantial educational text."
      );
    } else if (errorMessage.includes('too short') || 
               errorMessage.includes('insufficient content')) {
      throw new Error(
        "The document doesn't contain enough text for quiz generation. " +
        "Please use a document with more substantial educational content."
      );
    } else {
      throw new Error(err.response?.data?.error || "Failed to process document");
    }
  }
}

export async function generateQuiz(
  text: string,
  chapter: string,
  difficulty: string,
  questionCount: number
) {
  try {
    const res = await api.post("/ai/generate-quiz", {
      text,
      chapter,
      difficulty,
      questionCount,
    });
    return res.data;
  } catch (err: any) {
    console.error("❌ generateQuiz failed:", err);
    throw new Error(err?.response?.data?.error || "Failed to generate quiz");
  }
}

// ========================================
// 📄 CHAPTER EXTRACTION
// ========================================
export async function extractChapters(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await api.post("/chapter/extract-chapters", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (res.data?.fallback) {
      console.warn("⚠️ No chapters found — fallback mode activated");
      return { chapters: [], fallback: true, text: res.data.text };
    }

    return { chapters: res.data?.chapters || [], fallback: false };
  } catch (err: any) {
    console.error("❌ extractChapters failed:", err);
    throw new Error(err?.response?.data?.error || "Failed to extract chapters");
  }
}

// ========================================
// 📝 QUIZ SUBMISSIONS & RESULTS
// ========================================
export async function submitQuiz(
  quizId: string,
  answers: Record<string, string>
) {
  try {
    const res = await api.post(`/quiz/${quizId}/submit`, { answers });
    return res.data;
  } catch (err: any) {
    console.error("❌ submitQuiz failed:", err);
    throw new Error(err?.response?.data?.error || "Failed to submit quiz");
  }
}

export async function fetchResultById(resultId: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const token = await user.getIdToken();
    
    console.log("🔍 Fetching result with ID:", resultId);
    
    const res = await api.get(`/quiz/results/${resultId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.data;
  } catch (err: any) {
    console.error("❌ fetchResultById failed:", {
      resultId,
      error: err.message,
      status: err.response?.status
    });
    
    // Provide better error messages
    if (err.response?.status === 404) {
      throw new Error("Result not found. It may have expired or been deleted.");
    } else if (err.response?.status === 403) {
      throw new Error("You don't have permission to view this result.");
    } else if (err.response?.status === 401) {
      throw new Error("Please sign in to view results.");
    } else {
      throw new Error(err?.response?.data?.error || "Failed to fetch result");
    }
  }
}

export async function fetchPastResults() {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    const res = await api.get("/quiz/results/all", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    return res.data || [];
  } catch (err: any) {
    console.error("❌ fetchPastResults failed:", err);
    throw new Error(err?.response?.data?.error || "Failed to fetch past results");
  }
}

export async function fetchLatestResult() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn("⚠️ No user authenticated for fetchLatestResult");
      return null;
    }

    const token = await user.getIdToken();
    
    const res = await api.get("/quiz/results/latest", {
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.data || null;
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.message?.includes("No results")) {
      console.log("ℹ️ No latest result found");
      return null;
    }
    console.error("❌ fetchLatestResult failed:", err);
    throw new Error(err?.response?.data?.error || "Failed to fetch latest result");
  }
}

// ========================================
// 🏠 ROOM API METHODS
// ========================================

/**
 * Create a new room (Admin only - requires auth)
 * Now supports FormData for file upload and custom room codes
 */
export async function createRoom(data: FormData | {
  quizId: string;
  timeLimit: number; // in seconds
  questionCount: number;
  roomName?: string;
  roomCode?: string;
}) {
  try {
    const isFormData = data instanceof FormData;
    const config = isFormData 
      ? { 
          headers: { 
            "Content-Type": "multipart/form-data",
          } 
        }
      : {};

    console.log("📤 Creating room...");
    const res = await api.post("/room/create", data, config);
    return res.data;
  } catch (err: any) {
    console.error("❌ createRoom failed:", err.message);
    
    // Provide user-friendly error messages
    if (err.response?.status === 401) {
      throw new Error("Your session has expired. Please sign in again.");
    } else if (err.code === 'ECONNABORTED') {
      throw new Error("Request timed out. The server might be processing a large file. Please try again.");
    } else {
      throw new Error(err.response?.data?.error || "Failed to create room");
    }
  }
}

/**
 * Get room details and questions (Public - no auth needed)
 */
export async function getRoom(code: string) {
  try {
    const res = await api.get(`/room/${code.toUpperCase()}`);
    return res.data;
  } catch (err: any) {
    console.error("❌ getRoom failed:", err);
    throw new Error(err?.response?.data?.error || "Room not found");
  }
}

/**
 * Submit room quiz answers (Public - no auth needed)
 */
export async function submitRoomAnswers(
  code: string,
  data: {
    name: string;
    matric: string;
    answers: Record<string, string>;
  }
) {
  try {
    const res = await api.post(`/room/${code.toUpperCase()}/submit`, data);
    return res.data;
  } catch (err: any) {
    console.error("❌ submitRoomAnswers failed:", err);
    throw new Error(err?.response?.data?.error || "Failed to submit answers");
  }
}

/**
 * Get room participants (Admin only - requires auth)
 */
export async function getRoomParticipants(code: string) {
  try {
    const res = await api.get(`/room/${code.toUpperCase()}/participants`);
    return res.data;
  } catch (err: any) {
    console.error("❌ getRoomParticipants failed:", err);
    throw new Error(err?.response?.data?.error || "Failed to fetch participants");
  }
}

/**
 * Close a room (Admin only - requires auth)
 */
export async function closeRoom(code: string) {
  try {
    const res = await api.post(`/room/${code.toUpperCase()}/close`);
    return res.data;
  } catch (err: any) {
    console.error("❌ closeRoom failed:", err);
    throw new Error(err?.response?.data?.error || "Failed to close room");
  }
}

/**
 * NEW: Get active rooms for admin (for room recovery)
 */
export async function getActiveAdminRooms() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const token = await user.getIdToken();
    
    const res = await api.get("/room/active/admin", {
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.data || [];
  } catch (err: any) {
    console.error("❌ getActiveAdminRooms failed:", err);
    // Return empty array instead of throwing for better UX
    return [];
  }
}

/**
 * NEW: Export room results (Admin only)
 */
export async function exportRoomResults(code: string, format: 'csv' | 'json' = 'csv') {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const token = await user.getIdToken();
    
    const res = await api.get(`/room/${code.toUpperCase()}/export?format=${format}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json'
      },
      responseType: 'blob' // Important for file downloads
    });

    return res.data;
  } catch (err: any) {
    console.error("❌ exportRoomResults failed:", err);
    throw new Error(err?.response?.data?.error || "Failed to export room results");
  }
}

/**
 * Fetch all quizzes (for room creation dropdown)
 */
export async function fetchAllQuizzes() {
  try {
    const res = await api.get("/quiz");
    return res.data || [];
  } catch (err: any) {
    console.error("❌ fetchAllQuizzes failed:", err);
    throw new Error(err?.response?.data?.error || "Failed to fetch quizzes");
  }
}

// ========================================
// 🆕 SESSION MANAGEMENT HELPERS
// ========================================

/**
 * Save room session to localStorage for recovery
 */
export function saveRoomSession(code: string, sessionData: any) {
  try {
    localStorage.setItem(`room_session_${code}`, JSON.stringify(sessionData));
    console.log("💾 Room session saved:", code);
  } catch (err) {
    console.error("❌ Failed to save room session:", err);
  }
}

/**
 * Load room session from localStorage
 */
export function loadRoomSession(code: string) {
  try {
    const session = localStorage.getItem(`room_session_${code}`);
    return session ? JSON.parse(session) : null;
  } catch (err) {
    console.error("❌ Failed to load room session:", err);
    return null;
  }
}

/**
 * Remove room session from localStorage
 */
export function removeRoomSession(code: string) {
  try {
    localStorage.removeItem(`room_session_${code}`);
    console.log("🗑️ Room session removed:", code);
  } catch (err) {
    console.error("❌ Failed to remove room session:", err);
  }
}

/**
 * Save quiz session to localStorage for recovery
 */
export function saveQuizSession(sessionData: any) {
  try {
    localStorage.setItem('quiz_session', JSON.stringify(sessionData));
    console.log("💾 Quiz session saved");
  } catch (err) {
    console.error("❌ Failed to save quiz session:", err);
  }
}

/**
 * Load quiz session from localStorage
 */
export function loadQuizSession() {
  try {
    const session = localStorage.getItem('quiz_session');
    return session ? JSON.parse(session) : null;
  } catch (err) {
    console.error("❌ Failed to load quiz session:", err);
    return null;
  }
}

/**
 * Remove quiz session from localStorage
 */
export function removeQuizSession() {
  try {
    localStorage.removeItem('quiz_session');
    console.log("🗑️ Quiz session removed");
  } catch (err) {
    console.error("❌ Failed to remove quiz session:", err);
  }
}

export default api;