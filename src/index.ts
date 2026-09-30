import { createServer } from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import app from "./app";
import connectDB from "./config/database";
import initializeFirebase from "./config/firebase";
import { connectRedis, redisClient } from "./config/redis";
import { registerSocketHandlers } from "./socket";
import dotenv from "dotenv";
import { getAllowedOrigins } from "./config/cors";

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set. Exiting.");
  process.exit(1);
}

// Log but do not exit: a single rejected promise in one request should not
// tear down every in-flight response and every live socket.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

// An uncaught exception leaves the process in an undefined state, so this one
// does exit — the shutdown hook below drains first where it can.
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 1500;
const SERVER = process.env.APP_NAME;
/**
 * Drains the server on SIGTERM/SIGINT before exiting. Docker and Render both
 * send SIGTERM on stop/redeploy and Node's default is to die immediately,
 * dropping in-flight responses and live WebSocket sessions and leaving Mongo
 * and Redis connections to time out server-side.
 *
 * NOTE: duplicates registerShutdown in @app/shared-config. The monolith cannot
 * import that package yet — the root Dockerfile does not copy packages/ into
 * the image (Phase 2.4). Consolidate once it does.
 */
function registerShutdown(
  httpServer: ReturnType<typeof createServer>,
  cleanups: Array<() => Promise<unknown> | unknown>,
): void {
  let closing = false;

  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    console.log(`🛑 ${signal} received, draining…`);

    const forced = setTimeout(() => {
      console.error("⚠️ Drain timed out after 10000ms, forcing exit");
      process.exit(1);
    }, 10_000);
    forced.unref();

    await new Promise<void>((resolve) => httpServer.close(() => resolve()));

    const results = await Promise.allSettled(cleanups.map((fn) => fn()));
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("⚠️ Cleanup failed:", result.reason);
      }
    }

    clearTimeout(forced);
    console.log("👋 Shutdown complete");
    process.exit(0);
  };

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => void shutdown(signal));
  }
}

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Firebase
    initializeFirebase();

    // Connect to Redis
    await connectRedis();

    // Register Socket.IO handlers
    registerSocketHandlers(io);

    server.listen(PORT, () => {
      console.log(`🚀 Real-time messaging ${SERVER} running on port ${PORT}`);
      console.log(`📡 Socket.IO server ready for connections`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
    });

    registerShutdown(server, [
      () => io.close(),
      () => mongoose.connection.close(),
      () => (redisClient.isOpen ? redisClient.quit() : Promise.resolve()),
    ]);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
