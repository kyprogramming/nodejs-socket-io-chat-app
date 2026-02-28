import { Kafka, Partitioners } from "kafkajs";

const kafka = new Kafka({
    clientId: "chat-app",
    brokers: [process.env.KAFKA_BROKER || "kafka:9092"],
});

export const producer = kafka.producer({
    // ✅ silence the partitioner warning
    createPartitioner: Partitioners.LegacyPartitioner,
});

export const consumer = kafka.consumer({ groupId: "chat-group" });

// ✅ admin client to auto-create topics
const admin = kafka.admin();

export const connectKafka = async () => {
    // create topic if it doesn't exist
    await admin.connect();
    const existing = await admin.listTopics();

    if (!existing.includes("chat-messages")) {
        await admin.createTopics({
            topics: [
                {
                    topic: "chat-messages",
                    numPartitions: 1,
                    replicationFactor: 1,
                },
            ],
        });
        console.log("Kafka topic 'chat-messages' created");
    } else {
        console.log("Kafka topic 'chat-messages' already exists");
    }

    await admin.disconnect();

    // connect producer and consumer
    await producer.connect();
    console.log("Kafka producer connected");

    await consumer.connect();
    await consumer.subscribe({
        topic: "chat-messages",
        fromBeginning: false,
    });
    console.log("Kafka consumer connected");
};
