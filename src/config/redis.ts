import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisPort =
  process.env.NODE_ENV === "development"
    ? process.env.DEV_REDIS_PORT
    : process.env.REDIS_PORT;
console.log("Redis Port:", redisPort);
const redisUrl =
  process.env.NODE_ENV === "development"
    ? process.env.DEV_REDIS_URL
    : process.env.REDIS_URL;
const redisPassword =
  process.env.NODE_ENV === "development"
    ? process.env.DEV_REDIS_PASSWORD
    : process.env.REDIS_PASSWORD;

export const redisClient = createClient({
  username: "default",
  password: redisPassword,
  socket: {
    host: redisUrl,
    port: Number(redisPort),
  },
});
redisClient.on("error", (err) => console.error("Redis Client Error", err));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("✅ Redis connected");
  }
};
