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
      debugLogger("authMiddleware", { 
        step: "missing-header",
        path: req.path,
        method: req.method
      });
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const idToken = header.split(" ")[1];
    if (!idToken) {
      debugLogger("authMiddleware", { 
        step: "missing-token",
        path: req.path,
        method: req.method
      });
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const decodedToken = await auth.verifyIdToken(idToken);

    // ✅ Attach uid as verifiedUid (used in controller)
    (req as any).verifiedUid = decodedToken.uid;
    (req as any).user = decodedToken;

    debugLogger("authMiddleware", { 
      step: "verified", 
      uid: decodedToken.uid,
      email: decodedToken.email,
      path: req.path
    });

    return next();
  } catch (err: any) {
    debugLogger("authMiddleware", { 
      step: "verify-failed", 
      error: err?.message || err,
      code: err?.code,
      path: req.path
    });

    // Provide specific error messages for different token issues
    if (err.code === "auth/id-token-expired") {
      return res.status(401).json({ 
        error: "Token expired. Please refresh your token.",
        code: "TOKEN_EXPIRED" 
      });
    } else if (err.code === "auth/id-token-revoked") {
      return res.status(401).json({ 
        error: "Token revoked. Please sign in again.",
        code: "TOKEN_REVOKED" 
      });
    } else if (err.code === "auth/argument-error") {
      return res.status(401).json({ 
        error: "Invalid token format.",
        code: "INVALID_TOKEN_FORMAT" 
      });
    } else {
      return res.status(401).json({ 
        error: "Unauthorized: Invalid or expired token",
        code: "UNAUTHORIZED" 
      });
    }
  }
}