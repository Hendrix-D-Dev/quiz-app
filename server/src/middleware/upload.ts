import multer from "multer";
import type { FileFilterCallback } from "multer";
import type { Request } from "express";

const storage = multer.memoryStorage();

/**
 * ✅ Allowed MIME types for all supported document formats
 * Covers PDF, Word, Excel, PowerPoint, EPUB, text, CSV, HTML, and images
 */
const allowedMime = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/html",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // legacy Excel
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.ms-powerpoint", // legacy PowerPoint
  "application/epub+zip", // EPUB
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "application/json", // optional, sometimes uploaded for structured text
];

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) => {
  console.log("📥 Incoming file:", file.originalname, file.mimetype);

  // ✅ Allow via MIME or extension pattern
  const allowed =
    allowedMime.includes(file.mimetype) ||
    /\.(pdf|docx?|txt|csv|md|png|jpe?g|gif|html?|epub|pptx?|xlsx?)$/i.test(file.originalname);

  if (allowed) {
    console.log("✅ File accepted:", file.mimetype);
    return callback(null, true);
  }

  console.warn("⚠️ Rejected file type:", file.mimetype);
  callback(new Error(`Unsupported file type: ${file.mimetype}. Supported types: PDF, DOCX, TXT, Images, etc.`));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // ⬆️ Allow up to 25MB for large EPUB/PPTX
  },
});