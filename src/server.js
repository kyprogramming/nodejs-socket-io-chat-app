import "dotenv/config";

import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import { chatSocket } from "./sockets/chatSocket.js";
import { connectKafka } from "./config/kafka.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function connectWithRetry(name, fn, retries = 5, delay = 3000) {
    for (let i = 1; i <= retries; i++) {
        try {
            await fn();
            return;
        } catch (err) {
            console.error(`[${name}] attempt ${i}/${retries} failed:`, err.message);
            if (i < retries) {
                console.log(`[${name}] retrying in ${delay / 1000}s...`);
                await sleep(delay);
            } else {
                throw new Error(`[${name}] all ${retries} attempts failed`);
            }
        }
    }
}

await connectWithRetry("MongoDB", connectDB);
await connectWithRetry("Redis", connectRedis);
await connectWithRetry("Kafka", connectKafka);

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

chatSocket(io);

server.listen(process.env.PORT || 3000, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${process.env.PORT || 3000}`);
    // This tells the server to listen to your laptop's IP (e.g. 192.168.x.x)
});