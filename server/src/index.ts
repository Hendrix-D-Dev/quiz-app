import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

dotenv.config();

// Routes
import aiRoutes from "./routes/aiRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import chapterRoutes from "./routes/chapterRoutes.js";

const app = express();

/* --------------------------------------------- */
/* 🌐 CORS CONFIGURATION                         */
/* --------------------------------------------- */
const allowedOrigins = [
  "http://localhost:5173", // Local frontend
  "http://localhost:4000", // Local server (for tools or postman)
  "https://quiz-app-xi-lemon-15.vercel.app", // ✅ Deployed frontend
  process.env.CLIENT_URL, // Optional fallback from .env
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Allow server-to-server or curl requests
      const isAllowed = allowedOrigins.some((allowed) =>
        origin.startsWith(allowed)
      );
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn("🚫 Blocked CORS origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

/* --------------------------------------------- */
/* 🧠 EXPRESS MIDDLEWARE                         */
/* --------------------------------------------- */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Log incoming requests (for debugging)
app.use((req, _res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

/* --------------------------------------------- */
/* 🚀 ROUTES                                     */
/* --------------------------------------------- */
app.use("/api/ai", aiRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/room", roomRoutes);
app.use("/api/chapter", chapterRoutes);

// Health check route
app.get("/health", (_req, res) => res.json({ ok: true, now: Date.now() }));

/* --------------------------------------------- */
/* 🏗️ SERVE CLIENT BUILD (Optional)              */
/* --------------------------------------------- */
if (process.env.SERVE_CLIENT === "true") {
  const clientBuild = path.join(__dirname, "..", "..", "client", "dist");
  app.use(express.static(clientBuild));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientBuild, "index.html"));
  });
}

/* --------------------------------------------- */
/* 🟢 START SERVER                               */
/* --------------------------------------------- */
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(`✅ Allowed Origins:`, allowedOrigins);
});
