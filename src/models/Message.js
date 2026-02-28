import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    sender: String,
    room: String,
    receiver: String, // for private chat
    content: String,
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model("Message", messageSchema);
