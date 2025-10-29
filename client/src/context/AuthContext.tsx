import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { auth } from "../services/firebase";

/* -------------------------------------- */
/* 🔐 TYPES                               */
/* -------------------------------------- */
export type UserRole = "student" | "admin";

/**
 * Extends Firebase's User object to include a role.
 */
export interface AppUser extends User {
  role?: UserRole;
}

interface AuthState {
  user: AppUser | null;
  role: UserRole;
  loading: boolean;
  login: (email: string, password: string, specialKey?: string) => Promise<UserRole>;
  signup: (email: string, password: string, specialKey?: string) => Promise<UserRole>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
}

/* -------------------------------------- */
/* 🌐 CONTEXT SETUP                        */
/* -------------------------------------- */
const AuthContext = createContext<AuthState>({
  user: null,
  role: "student",
  loading: true,
  login: async () => "student",
  signup: async () => "student",
  logout: async () => {},
  refreshToken: async () => "",
});

export const useAuth = () => useContext(AuthContext);

/* -------------------------------------- */
/* 🚀 PROVIDER IMPLEMENTATION             */
/* -------------------------------------- */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const detectRole = (specialKey?: string): UserRole => {
    const adminKey = import.meta.env.VITE_ADMIN_KEY;
    return specialKey && adminKey && specialKey === adminKey
      ? "admin"
      : "student";
  };

  // Enhanced token refresh function
  const refreshToken = async (): Promise<string> => {
    if (!user) {
      throw new Error("No user logged in");
    }
    
    try {
      console.log("🔄 Manually refreshing token...");
      const token = await user.getIdToken(true);
      console.log("✅ Token refreshed manually");
      return token;
    } catch (error) {
      console.error("❌ Manual token refresh failed:", error);
      throw error;
    }
  };

  const login = async (
    email: string,
    password: string,
    specialKey?: string
  ): Promise<UserRole> => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const detectedRole = detectRole(specialKey);

    // Force token refresh on login to ensure fresh token
    try {
      await cred.user.getIdToken(true);
      console.log("✅ Token refreshed on login");
    } catch (error) {
      console.error("❌ Token refresh on login failed:", error);
    }

    const newUser: AppUser = { ...cred.user, role: detectedRole };
    setUser(newUser);
    localStorage.setItem("quiz_role", detectedRole);

    return detectedRole;
  };

  const signup = async (
    email: string,
    password: string,
    specialKey?: string
  ): Promise<UserRole> => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const detectedRole = detectRole(specialKey);

    // Force token refresh on signup
    try {
      await cred.user.getIdToken(true);
      console.log("✅ Token refreshed on signup");
    } catch (error) {
      console.error("❌ Token refresh on signup failed:", error);
    }

    const newUser: AppUser = { ...cred.user, role: detectedRole };
    setUser(newUser);
    localStorage.setItem("quiz_role", detectedRole);

    return detectedRole;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem("quiz_role");
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Force token refresh on auth state change
        try {
          await firebaseUser.getIdToken(true);
          console.log("✅ Token refreshed on auth state change");
        } catch (error) {
          console.error("❌ Token refresh on auth change failed:", error);
        }

        const savedRole =
          (localStorage.getItem("quiz_role") as UserRole | null) || "student";
        setUser({ ...firebaseUser, role: savedRole });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // ✅ role getter
  const role = user?.role || "student";

  const value = {
    user,
    role,
    loading,
    login,
    signup,
    logout,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};