import client from "prom-client";

const register = new client.Registry();
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

export default { register };
