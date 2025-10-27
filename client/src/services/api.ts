import axios from "axios";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const isDev = import.meta.env.MODE === "development";

const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  (isDev ? "http://localhost:4000" : "https://quiz-app-xgwd.onrender.com");

console.log("🌍 Using API Base URL:", baseURL);

const api = axios.create({
  baseURL: `${baseURL}/api`,
  withCredentials: false,
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

// ✅ File upload for chapter extraction
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

// ✅ Submit a quiz
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

// ✅ Fetch all past results for the current user
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

// ✅ Fetch latest result for current user
export async function fetchLatestResult() {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    const res = await api.get("/quiz/results/latest", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    return res.data || null;
  } catch (err: any) {
    console.error("❌ fetchLatestResult failed:", err);
    throw new Error(err?.response?.data?.error || "Failed to fetch latest result");
  }
}

export default api;
