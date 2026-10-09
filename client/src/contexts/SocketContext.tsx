import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { seenRecently } from "../lib/presence";
import type { Friend } from "../types";

interface SocketContextValue {
  socket: Socket | null;
  onlineUsers: Map<string, boolean>;
  connected: boolean;
  /** Connected now, or last seen within the grace window. */
  isOnline: (friend: Friend) => boolean;
  /** Most recent last-seen time we know of (live socket event or API). */
  lastSeenOf: (friend: Friend) => string | undefined;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, boolean>>(
    new Map(),
  );
  const [offlineAt, setOfflineAt] = useState<Map<string, number>>(new Map());
  const [now, setNow] = useState(() => Date.now());

  // Re-evaluate presence periodically so the grace window expires on screen.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;

    // In production VITE_API_URL = https://host/v1/api — extract the origin.
    // In local dev (no VITE_API_URL) fall back to "/" so Vite proxy handles it.
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
    const socketUrl = apiUrl ? new URL(apiUrl).origin : "/";

    // Default transport order (polling → upgrade to websocket). The gateway
    // proxies both: /socket.io as Express middleware for the polling
    // handshake, plus the raw "upgrade" event for the WebSocket itself.
    // Pinning to ["websocket"] here would mask a broken polling route and
    // locks out clients on networks that block raw WS.
    const s = io(socketUrl, {
      withCredentials: true,
    });

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("userOnline", ({ id }: { id: string }) =>
      setOnlineUsers((prev) => new Map(prev).set(id, true)),
    );
    s.on("userOffline", ({ id }: { id: string }) => {
      setOnlineUsers((prev) => new Map(prev).set(id, false));
      setOfflineAt((prev) => new Map(prev).set(id, Date.now()));
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [user]);

  const lastSeenOf = (friend: Friend) => {
    const live = offlineAt.get(friend.id);
    return live !== undefined ? new Date(live).toISOString() : friend.lastSeen;
  };

  const isOnline = (friend: Friend) => {
    const live = onlineUsers.get(friend.id);
    if (live ?? friend.isOnline) return true;
    return seenRecently(lastSeenOf(friend), now);
  };

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, connected, isOnline, lastSeenOf }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
