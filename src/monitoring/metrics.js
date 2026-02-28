// src/monitoring/metrics.js
import client from "prom-client";

const register = new client.Registry();

// ✅ this line collects CPU, memory, event loop, heap etc automatically
client.collectDefaultMetrics({ register });

export const activeConnections = new client.Gauge({
    name: "chat_active_connections",
    help: "Number of active socket connections",
    registers: [register],
});

export const totalMessages = new client.Counter({
    name: "chat_total_messages",
    help: "Total messages sent",
    registers: [register],
});

export const messagesByRoom = new client.Counter({
    name: "chat_messages_by_room",
    help: "Messages sent per room",
    labelNames: ["room"], // ← lets you filter by room in Grafana
    registers: [register],
});

export const authAttempts = new client.Counter({
    name: "chat_auth_attempts",
    help: "Login/register attempts",
    labelNames: ["type", "status"], // type: login|register, status: success|fail
    registers: [register],
});

export default { register };
