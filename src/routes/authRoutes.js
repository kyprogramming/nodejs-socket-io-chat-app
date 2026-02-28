import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

router.post("/register", async (req, res) => {
    const hashed = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({
        username: req.body.username,
        password: hashed,
    });
    res.json(user);
});

router.post("/login", async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    const valid = await bcrypt.compare(req.body.password, user.password);

    if (!valid) return res.status(401).json({ message: "Invalid" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token });
});

export default router;
