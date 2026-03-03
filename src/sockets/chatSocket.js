import Message from "../models/Message.js";
import { activeConnections, totalMessages } from "../monitoring/metrics.js";
import { producer, consumer } from "../config/kafka.js";
import { redisClient } from "../config/redis.js";

export const chatSocket = (io) => {
    consumer.run({
        eachMessage: async ({ message }) => {
            const msg = JSON.parse(message.value.toString());
            if (msg.type === "file") io.to(msg.room).emit("fileMessage", msg);
            else io.to(msg.room).emit("message", msg);
        },
    });

    io.on("connection", (socket) => {
        activeConnections.inc();
        let joinedRoom = null,
            joinedUser = null;

        // ── Join ────────────────────────────────────────────
        socket.on("joinRoom", async ({ room, user }) => {
            socket.join(room);
            joinedRoom = room;
            joinedUser = user;
            await redisClient.sAdd(`room:${room}:online`, user);
            io.to(room).emit("onlineUsers", await redisClient.sMembers(`room:${room}:online`));
            const history = await redisClient.lRange(`room:${room}:messages`, 0, 49);
            socket.emit("history", history.map(JSON.parse).reverse());
        });

        // ── Text message ────────────────────────────────────
        socket.on("message", async ({ room, user, content }) => {
            if (!room || !user || !content) {
                socket.emit("error", { message: "Missing fields." });
                return;
            }
            const key = `ratelimit:${user}`;
            const count = await redisClient.incr(key);
            if (count === 1) await redisClient.expire(key, 10);
            if (count > 10) {
                socket.emit("error", { message: "Too many messages. Slow down." });
                return;
            }
            const msg = await Message.create({ sender: user, room, content });
            totalMessages.inc();
            await redisClient.lPush(`room:${room}:messages`, JSON.stringify(msg));
            await redisClient.lTrim(`room:${room}:messages`, 0, 49);
            await producer.send({ topic: "chat-messages", messages: [{ value: JSON.stringify(msg) }] });
        });

        // ── File message ────────────────────────────────────
        socket.on("fileMessage", async ({ room, user, fileData }) => {
            if (!room || !user || !fileData) {
                socket.emit("error", { message: "Missing fields." });
                return;
            }
            const key = `ratelimit:${user}`;
            const count = await redisClient.incr(key);
            if (count === 1) await redisClient.expire(key, 10);
            if (count > 10) {
                socket.emit("error", { message: "Too many messages. Slow down." });
                return;
            }
            if (fileData.data?.length > 14_000_000) {
                socket.emit("error", { message: "File too large (max 10 MB)." });
                return;
            }

            const msg = await Message.create({ sender: user, room, content: `[File: ${fileData.name}]`, type: "file", fileData });
            totalMessages.inc();

            const payload = { _id: msg._id, sender: user, room, type: "file", fileData, createdAt: msg.createdAt };
            await redisClient.lPush(`room:${room}:messages`, JSON.stringify(payload));
            await redisClient.lTrim(`room:${room}:messages`, 0, 49);
            await producer.send({ topic: "chat-messages", messages: [{ value: JSON.stringify(payload) }] });
        });

        // ── WebRTC signalling (pure relay, no media on server) ─
        socket.on("callOffer", ({ room, caller, offer, callType }) => socket.to(room).emit("callOffer", { caller, offer, callType }));
        socket.on("callAnswer", ({ room, user, answer }) => socket.to(room).emit("callAnswer", { user, answer }));
        socket.on("callIceCandidate", ({ room, candidate }) => socket.to(room).emit("callIceCandidate", { candidate }));
        socket.on("callEnded", ({ room, user }) => socket.to(room).emit("callEnded", { user }));
        socket.on("callDeclined", ({ room, user }) => socket.to(room).emit("callDeclined", { user }));

        // ── Disconnect ──────────────────────────────────────
        socket.on("disconnect", async () => {
            activeConnections.dec();
            if (joinedRoom && joinedUser) {
                await redisClient.sRem(`room:${joinedRoom}:online`, joinedUser);
                io.to(joinedRoom).emit("onlineUsers", await redisClient.sMembers(`room:${joinedRoom}:online`));
                socket.to(joinedRoom).emit("callEnded", { user: joinedUser }); // clean up any active call
            }
        });
    });
};
