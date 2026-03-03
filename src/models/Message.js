import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        sender: String,
        room: String,
        receiver: String, // for private chat
        content: String,
        type: { type: String, default: "text" }, // "text" | "file"
        fileData: {
            name: String,
            type: String, // MIME
            size: Number,
            data: String, // base64 data URL
        },
    },
    { timestamps: true }
);

export default mongoose.model("Message", messageSchema);