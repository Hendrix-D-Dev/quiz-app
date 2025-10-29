import { Router } from "express";
import {
  createRoom,
  getRoom,
  submitAnswers,
  getParticipants,
  closeRoom,
} from "../controllers/roomController.js";
import { verifyFirebaseTokenMiddleware } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js"; // ✅ Add upload middleware import

const router = Router();

// Admin-only: Create room (requires auth) - now with file upload support
router.post("/create", verifyFirebaseTokenMiddleware, upload.single("file"), createRoom); // ✅ Add upload middleware

// Public: Get room details (students need this to join)
router.get("/:code", getRoom);

// Public: Submit answers (students don't need auth, just name/matric)
router.post("/:code/submit", submitAnswers);

// Admin-only: Get participants (requires auth)
router.get("/:code/participants", verifyFirebaseTokenMiddleware, getParticipants);

// Admin-only: Close room (requires auth)
router.post("/:code/close", verifyFirebaseTokenMiddleware, closeRoom);

export default router;