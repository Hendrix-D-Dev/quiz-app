// small helper middleware to verify firebase id token if present in Authorization header
import type { Request, Response, NextFunction } from "express";
import { auth } from "../config/firebaseAdmin.js";
import { debugLogger } from "../utils/debugLogger.js";

export async function verifyFirebaseTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = (req.headers.authorization || "").toString();
  
  debugLogger("authMiddleware", {
    step: "verify-token-start",
    hasAuthHeader: !!authHeader,
    authHeader: authHeader ? "Bearer ***" : "none"
  });

  if (!authHeader.startsWith("Bearer ")) {
    // no token provided — continue but verifiedUid will be undefined
    debugLogger("authMiddleware", { step: "no-token-provided" });
    (req as any).verifiedUid = null;
    return next();
  }
  
  const idToken = authHeader.split("Bearer ")[1].trim();
  
  try {
    debugLogger("authMiddleware", { step: "verifying-token" });
    const decoded = await auth.verifyIdToken(idToken);
    (req as any).verifiedUid = decoded.uid;
    
    debugLogger("authMiddleware", {
      step: "token-verified",
      uid: decoded.uid,
      email: decoded.email
    });
    
    return next();
  } catch (err: any) {
    debugLogger("authMiddleware", {
      step: "token-verification-failed",
      error: err.message,
      code: err.code
    });
    
    // For development, you might want to be more permissive
    // In production, you might return 401
    console.warn("Failed to verify Firebase token:", err);
    (req as any).verifiedUid = null;
    return next();
  }
}