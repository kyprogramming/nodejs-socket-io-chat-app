import http from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import { chatSocket } from "./sockets/chatSocket.js";
import { connectKafka } from "./config/kafka.js";

dotenv.config();

await connectDB();
await connectRedis();
await connectKafka();

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

chatSocket(io);

server.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`);
});
