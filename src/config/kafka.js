import { Kafka } from "kafkajs";

const kafka = new Kafka({
    brokers: [process.env.KAFKA_BROKER],
});

export const producer = kafka.producer();

export const connectKafka = async () => {
    await producer.connect();
};
