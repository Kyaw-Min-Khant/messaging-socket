import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import app from "./app";
import { socketProxy } from "./proxies";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

const PORT = process.env.PORT || 4000;

const server = createServer(app);

// Socket.IO's HTTP-upgrade handshake happens on the raw http.Server, not
// through Express — wire it separately so it proxies to messaging-service
// (currently the monolith) instead of falling through to a 404.
const upgrade = socketProxy.upgrade as
  | ((req: unknown, socket: unknown, head: unknown) => void)
  | undefined;

server.on("upgrade", (req, socket, head) => {
  if (req.url?.startsWith("/socket.io") && upgrade) {
    upgrade(req, socket, head);
  }
});

server.listen(PORT, () => {
  console.log(`🚪 Gateway listening on port ${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
});
