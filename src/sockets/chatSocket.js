import Message from "../models/Message.js";
import { activeConnections, totalMessages } from "../monitoring/metrics.js";
import { producer } from "../config/kafka.js";
import { redisClient } from "../config/redis.js";

export const chatSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("New socket connected:", socket.id);
        activeConnections.inc();

        // store room+user on socket for disconnect cleanup
        let joinedRoom = null;
        let joinedUser = null;

        socket.on("joinRoom", async ({ room, user }) => {
            socket.join(room);
            joinedRoom = room;
            joinedUser = user;

            // ✅ 1. PRESENCE — track who's online in this room
            await redisClient.sAdd(`room:${room}:online`, user);
            const onlineUsers = await redisClient.sMembers(`room:${room}:online`);
            io.to(room).emit("onlineUsers", onlineUsers);

            // ✅ 2. MESSAGE CACHE — send last 50 messages to the joining user
            const history = await redisClient.lRange(`room:${room}:messages`, 0, 49);
            socket.emit("history", history.map(JSON.parse).reverse());

            console.log(`${user} joined room ${room}`);
        });

        socket.on("message", async ({ room, user, content }) => {
            if (!room || !user || !content) {
                socket.emit("error", { message: "room, user and content are all required." });
                return;
            }

            // ✅ 3. RATE LIMIT — max 10 messages per user per 10 seconds
            const rateLimitKey = `ratelimit:${user}`;
            const count = await redisClient.incr(rateLimitKey);
            if (count === 1) await redisClient.expire(rateLimitKey, 10);
            if (count > 10) {
                socket.emit("error", { message: "Slow down — too many messages." });
                return;
            }

            try {
                const msg = await Message.create({ sender: user, room, content });
                totalMessages.inc();

                // ✅ 2. MESSAGE CACHE — push to cache, keep last 50 only
                await redisClient.lPush(`room:${room}:messages`, JSON.stringify(msg));
                await redisClient.lTrim(`room:${room}:messages`, 0, 49);

                await producer.send({
                    topic: "chat-messages",
                    messages: [{ value: JSON.stringify(msg) }],
                });

                io.to(room).emit("message", msg);
                console.log(`Message sent to room ${room}: ${content}`);
            } catch (err) {
                console.error("Error handling message:", err);
                socket.emit("error", { message: "Failed to send message." });
            }
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
            activeConnections.dec();

            // ✅ 1. PRESENCE — remove from online set on disconnect
            if (joinedRoom && joinedUser) {
                redisClient.sRem(`room:${joinedRoom}:online`, joinedUser).then(() => {
                    redisClient.sMembers(`room:${joinedRoom}:online`).then((onlineUsers) => {
                        io.to(joinedRoom).emit("onlineUsers", onlineUsers);
                    });
                });
            }
        });
    });
};
