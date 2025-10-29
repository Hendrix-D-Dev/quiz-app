import axios from "axios";
import { getAuth, onAuthStateChanged } from "firebase/auth";

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
  timeout: 30000,
});

// 🔑 Firebase token handling
let currentToken: string | null = null;
const auth = getAuth();

onAuthStateChanged(auth, async (user) => {
  currentToken = user ? await user.getIdToken() : null;
});

// ✅ Attach token automatically to all requests
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = currentToken || (await user.getIdToken());
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Enhanced error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("🚨 API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      code: error.code
    });
    
    if (error.code === 'ERR_NETWORK') {
      console.error("🌐 Network Error - Check:");
      console.error("1. Server URL:", baseURL);
      console.error("2. CORS configuration");
      console.error("3. Server status");
    }
    
    return Promise.reject(error);
  }
);

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
    
    const res = await api.get(`/quiz/results/${resultId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.data;
  } catch (err: any) {
    console.error("❌ fetchResultById failed:", err);
    throw new Error(err?.response?.data?.error || "Failed to fetch result");
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

    console.log("📤 Creating room with data:", 
      isFormData ? "FormData" : JSON.stringify(data, null, 2)
    );

    const res = await api.post("/room/create", data, config);
    return res.data;
  } catch (err: any) {
    console.error("❌ createRoom failed:", {
      error: err.message,
      code: err.code,
      response: err.response?.data
    });
    throw new Error(err?.response?.data?.error || "Failed to create room");
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

export default api;