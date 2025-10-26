import { auth } from "../config/firebaseAdmin.js";
export async function verifyFirebaseTokenMiddleware(req, res, next) {
    const authHeader = (req.headers.authorization || "").toString();
    if (!authHeader.startsWith("Bearer ")) {
        // no token provided — continue but verifiedUid will be undefined
        return next();
    }
    const idToken = authHeader.split("Bearer ")[1].trim();
    try {
        const decoded = await auth.verifyIdToken(idToken);
        req.verifiedUid = decoded.uid;
        return next();
    }
    catch (err) {
        console.warn("Failed to verify Firebase token:", err);
        // treat as unauthenticated — you may change behavior to 401 if you want strict auth
        return next();
    }
}
