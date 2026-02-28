import { Kafka } from "kafkajs";

const kafka = new Kafka({
    clientId: "chat-app",
    brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: "chat-group" });

export const connectKafka = async () => {
    await producer.connect();
    console.log("Kafka producer connected");

    await consumer.connect();
    await consumer.subscribe({
        topic: "chat-messages",
        fromBeginning: false,
    });
    console.log("Kafka consumer connected");
};
