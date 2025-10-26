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
// ✅ Allow localhost:5173 (Vite) and production origins
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:4000",
    process.env.CLIENT_URL,
].filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin))
            return callback(null, true);
        console.warn("🚫 Blocked CORS origin:", origin);
        return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// ✅ Log every incoming request
app.use((req, _res, next) => {
    console.log(`➡️ ${req.method} ${req.originalUrl}`);
    next();
});
// ✅ API Routes
app.use("/api/ai", aiRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/room", roomRoutes);
app.use("/api/chapter", chapterRoutes); // ✅ Correct mount path
// ✅ Health check
app.get("/health", (_req, res) => res.json({ ok: true, now: Date.now() }));
// ✅ Serve client build if configured
if (process.env.SERVE_CLIENT === "true") {
    const clientBuild = path.join(__dirname, "..", "..", "client", "dist");
    app.use(express.static(clientBuild));
    app.get("*", (_req, res) => {
        res.sendFile(path.join(clientBuild, "index.html"));
    });
}
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`✅ Allowed Origins:`, allowedOrigins);
});
