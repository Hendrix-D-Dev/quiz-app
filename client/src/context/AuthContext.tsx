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
  role: UserRole; // ✅ added
  loading: boolean;
  login: (email: string, password: string, specialKey?: string) => Promise<UserRole>;
  signup: (email: string, password: string, specialKey?: string) => Promise<UserRole>;
  logout: () => Promise<void>;
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

  const login = async (
    email: string,
    password: string,
    specialKey?: string
  ): Promise<UserRole> => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const detectedRole = detectRole(specialKey);

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
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
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

  return (
    <AuthContext.Provider value={{ user, role, loading, login, signup, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
