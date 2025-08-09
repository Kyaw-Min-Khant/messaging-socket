import { createClient } from "redis";

const redisPort = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 0;

export const redisClient = createClient({
  username: "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_URL,
    port: redisPort ?? 6379,
  },
});
redisClient.on("error", (err) => console.error("Redis Client Error", err));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("✅ Redis connected");
  }
};
