import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL || "mongodb://mongo:27017/chatapp");
        console.log("MongoDB Connected");
    } catch (error) {
        console.error("DB Error:", error);
        process.exit(1);
    }
};

export default connectDB;
