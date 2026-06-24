import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "../types";
import { getCurrentUser } from "../api/auth";
import { getWebFCMToken, onForegroundMessage } from "../lib/firebase";
import apiClient from "../api/client";
import toast from "react-hot-toast";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // When the user is logged in: refresh FCM token if it changed, and show
  // foreground push notifications as toasts (tab is visible/active).
  useEffect(() => {
    if (!user) return;

    getWebFCMToken()
      .then((token) => {
        if (token) apiClient.put("/auth/fcmtoken", { fcmtoken: token }).catch(() => {});
      })
      .catch(() => {});

    const unsub = onForegroundMessage((payload) => {
      const title = payload.notification?.title ?? "New message";
      const body = payload.notification?.body ?? "";
      toast(`${title}${body ? `: ${body}` : ""}`, { duration: 4000 });
    });

    return unsub;
  }, [user?.id]);

  const clearAuth = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
