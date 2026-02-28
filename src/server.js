import http from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";
import app from "./app.js";
import  connectDB  from "./config/db.js";
import { chatSocket } from "./sockets/chatSocket.js";
import { connectKafka } from "./config/kafka.js";

dotenv.config();

await connectDB();
await connectKafka();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // allow frontend
        methods: ["GET", "POST"],
    },
});

chatSocket(io);

server.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});