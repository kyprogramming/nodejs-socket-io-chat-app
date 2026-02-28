import Message from "../models/Message.js";

export const saveMessage = async (data) => {
    return await Message.create(data);
};

export const getRoomMessages = async (room) => {
    return await Message.find({ room }).sort({ timestamp: 1 });
};
