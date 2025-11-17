import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import connectDB from "./config/database";
import initializeFirebase from "./config/firebase";
import { connectRedis } from "./config/redis";
import { registerSocketHandlers } from "./socket";
import dotenv from "dotenv";

dotenv.config();

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

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

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Real-time messaging ${SERVER} running on port ${PORT}`);
      console.log(`📡 Socket.IO server ready for connections`);
      // console.log(`🌐 API available at http://localhost:${PORT}/api-docs`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
