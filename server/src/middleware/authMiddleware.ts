import type { Request, Response, NextFunction } from "express";
import { auth } from "../config/firebaseAdmin.js";
import { debugLogger } from "../utils/debugLogger.js";

export async function verifyFirebaseTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      debugLogger("authMiddleware", { step: "missing-header" });
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const idToken = header.split(" ")[1];
    if (!idToken) {
      debugLogger("authMiddleware", { step: "missing-token" });
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const decodedToken = await auth.verifyIdToken(idToken);

    // ✅ Attach uid as verifiedUid (used in controller)
    (req as any).verifiedUid = decodedToken.uid;
    (req as any).user = decodedToken;

    debugLogger("authMiddleware", { step: "verified", uid: decodedToken.uid });

    return next();
  } catch (err: any) {
    debugLogger("authMiddleware", { step: "verify-failed", error: err?.message || err });
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
}
