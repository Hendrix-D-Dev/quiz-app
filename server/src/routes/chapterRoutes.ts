import express from "express";
import multer from "multer";
import { parseFile } from "../services/parsers/index.js";
import { extractChaptersFromText } from "../utils/chapterExtractor.js";
import { debugLogger } from "../utils/debugLogger.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/epub+zip",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/html",
      "text/csv",
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

// ✅ Apply lightweight CORS headers on this route
router.options("/extract-chapters", (req, res) => {
  const origin = req.headers.origin;
  const allowed = [
    "http://localhost:5173",
    "http://localhost:4000",
    process.env.CLIENT_URL,
  ].filter(Boolean);
  if (origin && allowed.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});

router.post("/extract-chapters", upload.single("file"), async (req, res) => {
  try {
    const origin = req.headers.origin;
    const allowed = [
      "http://localhost:5173",
      "http://localhost:4000",
      process.env.CLIENT_URL,
    ].filter(Boolean);
    if (origin && allowed.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Credentials", "true");

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    debugLogger("chapterRoutes", {
      step: "file-received",
      name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    const text = await parseFile(req.file.buffer, req.file.originalname);
    const chapters = extractChaptersFromText(text);

    debugLogger("chapterRoutes", {
      step: "chapters-returned",
      count: chapters.length,
      samples: chapters.slice(0, 3).map((c) => c.title),
    });

    if (chapters.length === 0) {
      debugLogger("chapterRoutes", { step: "no-chapters-fallback" });
      return res.json({ ok: true, chapters: [], fallback: true, text });
    }

    res.json({ ok: true, chapters });
  } catch (err: any) {
    debugLogger("chapterRoutes", { step: "error", error: err });
    res
      .status(500)
      .json({ error: err.message || "Failed to extract chapters" });
  }
});

export default router;
