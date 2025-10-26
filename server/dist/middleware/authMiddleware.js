import { auth } from "../config/firebaseAdmin.js";
import { debugLogger } from "../utils/debugLogger.js";
/**
 * Middleware to verify Firebase ID token from Authorization header
 * Expects: Authorization: "Bearer <idToken>"
 *
 * On success attaches decoded token to `req.user`.
 */
export async function verifyFirebaseTokenMiddleware(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith("Bearer ")) {
            debugLogger?.("authMiddleware", { step: "missing-header" });
            return res
                .status(401)
                .json({ error: "Missing or invalid Authorization header" });
        }
        const idToken = header.split(" ")[1];
        if (!idToken) {
            debugLogger?.("authMiddleware", { step: "missing-token" });
            return res.status(401).json({ error: "Missing or invalid Authorization header" });
        }
        // Verify token with Firebase Admin SDK
        const decodedToken = await auth.verifyIdToken(idToken);
        // Attach decoded token (uid, email, etc.) to req for downstream handlers
        req.user = decodedToken;
        debugLogger?.("authMiddleware", { step: "verified", uid: decodedToken.uid });
        return next();
    }
    catch (err) {
        debugLogger?.("authMiddleware", {
            step: "verify-failed",
            error: err?.message || err,
        });
        // Provide a safe error to client. Detailed error logged only on server.
        return res.status(401).json({
            error: "Unauthorized: Invalid or expired token",
        });
    }
}
