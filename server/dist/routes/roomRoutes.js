import { Router } from "express";
import { createRoom, getRoom, submitAnswers, getParticipants, } from "../controllers/roomController.js";
const router = Router();
// POST /api/room/create
router.post("/create", createRoom);
// GET /api/room/:code
router.get("/:code", getRoom);
// POST /api/room/:code/submit
router.post("/:code/submit", submitAnswers);
// GET /api/room/:code/participants
router.get("/:code/participants", getParticipants);
export default router;
