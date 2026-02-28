import { createClient } from "redis";

const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://redis:6379",
});

redisClient.on("error", (err) => console.error("Redis error:", err));
redisClient.on("connect", () => console.log("Redis connected"));

export const connectRedis = async () => {
    await redisClient.connect();
};

export { redisClient };
