import Message from "../models/Message.js";
import { activeConnections, totalMessages } from "../monitoring/metrics.js";
import { producer, consumer } from "../config/kafka.js";
import { redisClient } from "../config/redis.js";

export const chatSocket = (io) => {
    // ── Kafka consumer: receives events and broadcasts to room ──
    consumer.run({
        eachMessage: async ({ message }) => {
            const msg = JSON.parse(message.value.toString());
            io.to(msg.room).emit("message", msg);
            console.log(`Kafka → broadcast to room ${msg.room}`);
        },
    });

    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);
        activeConnections.inc();

        let joinedRoom = null;
        let joinedUser = null;

        // ── Join room ──────────────────────────────────────────
        socket.on("joinRoom", async ({ room, user }) => {
            socket.join(room);
            joinedRoom = room;
            joinedUser = user;

            // Redis: track online presence
            await redisClient.sAdd(`room:${room}:online`, user);
            const onlineUsers = await redisClient.sMembers(`room:${room}:online`);
            io.to(room).emit("onlineUsers", onlineUsers);

            // Redis: send cached message history to joining user
            const history = await redisClient.lRange(`room:${room}:messages`, 0, 49);
            socket.emit("history", history.map(JSON.parse).reverse());

            console.log(`${user} joined room ${room}`);
        });

        // ── Send message ───────────────────────────────────────
        socket.on("message", async ({ room, user, content }) => {
            if (!room || !user || !content) {
                socket.emit("error", { message: "room, user and content are required." });
                return;
            }

            // Redis: rate limiting — max 10 messages per 10 seconds
            const rateLimitKey = `ratelimit:${user}`;
            const count = await redisClient.incr(rateLimitKey);
            if (count === 1) await redisClient.expire(rateLimitKey, 10);
            if (count > 10) {
                socket.emit("error", { message: "Too many messages. Slow down." });
                return;
            }

            // Save to MongoDB
            const msg = await Message.create({ sender: user, room, content });
            totalMessages.inc();

            // Redis: cache message, keep last 50
            await redisClient.lPush(`room:${room}:messages`, JSON.stringify(msg));
            await redisClient.lTrim(`room:${room}:messages`, 0, 49);

            // Kafka: publish event (consumer above will broadcast to room)
            await producer.send({
                topic: "chat-messages",
                messages: [{ value: JSON.stringify(msg) }],
            });

            console.log(`Message published to Kafka — room: ${room}`);
        });

        // ── Disconnect ─────────────────────────────────────────
        socket.on("disconnect", async () => {
            console.log("Socket disconnected:", socket.id);
            activeConnections.dec();

            if (joinedRoom && joinedUser) {
                await redisClient.sRem(`room:${joinedRoom}:online`, joinedUser);
                const onlineUsers = await redisClient.sMembers(`room:${joinedRoom}:online`);
                io.to(joinedRoom).emit("onlineUsers", onlineUsers);
            }
        });
    });
};
