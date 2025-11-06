import express from "express";
import multer from "multer";
import { parseFile } from "../services/parsers/index.js";
import { extractChaptersFromText } from "../utils/chapterExtractor.js";
import { debugLogger } from "../utils/debugLogger.js";

const router = express.Router();

// ✅ USE THE SAME UPLOAD CONFIGURATION AS AI ROUTES
import { upload } from "../middleware/upload.js";

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
    
    // For image files, we might not get meaningful chapters, so handle gracefully
    const isImageFile = /\.(png|jpg|jpeg|gif)$/i.test(req.file.originalname);
    
    if (isImageFile) {
      debugLogger("chapterRoutes", {
        step: "image-file-detected",
        textLength: text.length
      });
      
      // For images, return the full text as a single "chapter"
      if (text && text.length > 100) {
        const imageChapter = {
          title: "Image Content",
          content: text,
          index: 0
        };
        return res.json({ ok: true, chapters: [imageChapter], fallback: false });
      } else {
        // If OCR didn't extract much text, return fallback
        return res.json({ ok: true, chapters: [], fallback: true, text: text || "" });
      }
    }

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
    debugLogger("chapterRoutes", { step: "error", error: err.message });
    
    // Provide user-friendly error messages
    let errorMessage = err.message || "Failed to extract chapters";
    
    if (err.message.includes('Unsupported file type')) {
      errorMessage = "This file type is not supported for chapter extraction. Please use PDF, DOCX, TXT, or image files.";
    } else if (err.message.includes('OCR') || err.message.includes('image')) {
      errorMessage = "Unable to extract text from this image. Please try a clearer image or a different file format.";
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

export default router;