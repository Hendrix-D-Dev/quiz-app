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

// ✅ Define allowed origins clearly
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4000",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200); // ✅ Handle preflight requests immediately
  }
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Log incoming requests for debugging
app.use((req, _res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ API Routes
app.use("/api/ai", aiRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/room", roomRoutes);
app.use("/api/chapter", chapterRoutes);

// ✅ Health check
app.get("/health", (_req, res) =>
  res.json({ ok: true, now: Date.now(), env: process.env.NODE_ENV })
);

// ✅ Serve client build if enabled
if (process.env.SERVE_CLIENT === "true") {
  const clientBuild = path.join(__dirname, "..", "..", "client", "dist");
  app.use(express.static(clientBuild));
  app.get("*", (_req, res) =>
    res.sendFile(path.join(clientBuild, "index.html"))
  );
}

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(`✅ Allowed Origins:`, allowedOrigins);
});
