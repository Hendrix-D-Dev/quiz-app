import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

dotenv.config();

// 🧩 Import routes
import aiRoutes from "./routes/aiRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import chapterRoutes from "./routes/chapterRoutes.js";

const app = express();

// ✅ Define allowed frontend origins (local + production)
const allowedOrigins = [
  "http://localhost:5173",
  "https://quiz-app-xi-lemon-15.vercel.app", // your Vercel frontend
  process.env.CLIENT_URL, // optional fallback if you define CLIENT_URL in .env
].filter(Boolean);

console.log("✅ Allowed Origins:", allowedOrigins);

// ✅ Use CORS middleware properly
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
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

// ✅ Parse request bodies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Log requests (useful for debugging)
app.use((req, _res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ API Routes
app.use("/api/ai", aiRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/room", roomRoutes);
app.use("/api/chapter", chapterRoutes);

// ✅ Health check endpoint
app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    now: Date.now(),
    env: process.env.NODE_ENV,
  })
);

// ✅ Serve client build (optional for Render fullstack hosting)
if (process.env.SERVE_CLIENT === "true") {
  const clientBuild = path.join(__dirname, "..", "..", "client", "dist");
  app.use(express.static(clientBuild));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientBuild, "index.html"));
  });
}

// ✅ Start server
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(`✅ Allowed Origins:`, allowedOrigins);
});
