import client from "prom-client";

client.collectDefaultMetrics();

export const activeConnections = new client.Gauge({
    name: "active_socket_connections",
    help: "Active socket connections",
});

export const totalMessages = new client.Counter({
    name: "total_chat_messages",
    help: "Total chat messages",
});

export default client;
