import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import connectDB from "./config/database";
import initializeFirebase from "./config/firebase";
import { connectRedis } from "./config/redis";
import { registerSocketHandlers } from "./socket";
import dotenv from "dotenv";
import { getAllowedOrigins } from "./config/cors";

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set. Exiting.");
  process.exit(1);
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  process.exit(1);
});

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

async function waitForExpenseService(baseUrl: string): Promise<void> {
  const healthUrl = `${baseUrl}/v1/api/health`;
  const MAX_ATTEMPTS = 30; // 30 × 5 s = 2.5 minutes
  const INTERVAL_MS = 5_000;

  console.log(`⏳ Waiting for expense-service at ${healthUrl} ...`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(healthUrl, {
        signal: AbortSignal.timeout(4_000),
      });
      if (res.ok) {
        console.log(
          `✅ Expense service is ready (attempt ${attempt}/${MAX_ATTEMPTS})`,
        );
        return;
      }
    } catch {
      // not ready yet — swallow and retry
    }
    console.log(
      `⏳ Expense service not ready yet (${attempt}/${MAX_ATTEMPTS}), retrying in ${INTERVAL_MS / 1000}s...`,
    );
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }

  // After all retries, exit so Render restarts the service rather than
  // silently serving a monolith with a broken expense dependency.
  console.error("❌ Expense service did not become ready in time. Exiting.");
  process.exit(1);
}

const PORT = process.env.PORT || 3001;
const SERVER = process.env.APP_NAME;
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

    // Block startup until expense-service is healthy
    if (process.env.EXPENSE_SERVICE_URL) {
      await waitForExpenseService(process.env.EXPENSE_SERVICE_URL);
    }

    server.listen(PORT, () => {
      console.log(`🚀 Real-time messaging ${SERVER} running on port ${PORT}`);
      console.log(`📡 Socket.IO server ready for connections`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
