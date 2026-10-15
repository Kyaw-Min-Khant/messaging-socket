import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const MONGODB_URI =
  process.env.NODE_ENV === "development"
    ? (process.env.DEV_MONGODB_URI as string)
    : (process.env.MONGODB_URI as string);

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
    });

    // NOTE: shutdown is owned by registerShutdown in src/index.ts, which closes
    // the HTTP server and Socket.IO before disconnecting Mongo and Redis. A
    // SIGINT handler here would race it and exit before the drain completed.
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

export default connectDB;
