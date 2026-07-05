import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { prisma } from "./config/prisma";

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set. Exiting.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is not set. Exiting.");
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

const PORT = process.env.PORT || 4004;

const startServer = async () => {
  try {
    await prisma.$connect();
    app.listen(PORT, () => {
      console.log(`💰 Expense service running on port ${PORT}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Failed to start expense-service:", error);
    process.exit(1);
  }
};

startServer();
