import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextValue {
  socket: Socket | null;
  onlineUsers: Map<string, boolean>;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!user) return;

    // Cookie is sent automatically — no need to pass token manually
    const s = io('/', {
      withCredentials: true,
      transports: ['websocket'],
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('userOnline', ({ id }: { id: string }) =>
      setOnlineUsers((prev) => new Map(prev).set(id, true))
    );
    s.on('userOffline', ({ id }: { id: string }) =>
      setOnlineUsers((prev) => new Map(prev).set(id, false))
    );

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
