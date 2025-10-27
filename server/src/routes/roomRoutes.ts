import { Router } from "express";
import {
  createRoom,
  getRoom,
  submitAnswers,
  getParticipants,
  closeRoom,
} from "../controllers/roomController.js";
import { verifyFirebaseTokenMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

// Admin-only: Create room (requires auth)
router.post("/create", verifyFirebaseTokenMiddleware, createRoom);

// Public: Get room details (students need this to join)
router.get("/:code", getRoom);

// Public: Submit answers (students don't need auth, just name/matric)
router.post("/:code/submit", submitAnswers);

// Admin-only: Get participants (requires auth)
router.get("/:code/participants", verifyFirebaseTokenMiddleware, getParticipants);

// Admin-only: Close room (requires auth)
router.post("/:code/close", verifyFirebaseTokenMiddleware, closeRoom);

export default router;