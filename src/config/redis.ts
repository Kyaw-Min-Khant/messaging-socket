import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisPort = Number(
  (process.env.NODE_ENV === "development"
    ? process.env.DEV_REDIS_PORT
    : process.env.REDIS_PORT) || 6379,
);
const redisUrl =
  (process.env.NODE_ENV === "development"
    ? process.env.DEV_REDIS_URL
    : process.env.REDIS_URL) || "127.0.0.1";
const redisPassword =
  process.env.NODE_ENV === "development"
    ? process.env.DEV_REDIS_PASSWORD
    : process.env.REDIS_PASSWORD;
const redisPasswordTrimmed = redisPassword?.trim();

export const redisClient = createClient({
  ...(redisPasswordTrimmed
    ? { username: "default", password: redisPasswordTrimmed }
    : {}),
  socket: {
    host: redisUrl,
    port: redisPort,
  },
});
redisClient.on("error", (err) => console.error("Redis Client Error", err));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("✅ Redis connected");
  }
};
