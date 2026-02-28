import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// ── Register ───────────────────────────────────────────────
router.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;

        // input validation
        if (!username || !password) return res.status(400).json({ message: "Username and password are required." });

        if (username.trim().length < 3) return res.status(400).json({ message: "Username must be at least 3 characters." });

        if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });

        // duplicate check
        const existing = await User.findOne({ username: username.trim() });
        if (existing) return res.status(409).json({ message: "Username already taken." });

        const hashed = await bcrypt.hash(password, 12);
        const user = await User.create({ username: username.trim(), password: hashed });

        // never return the password hash
        res.status(201).json({ id: user._id, username: user.username });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ message: "Server error during registration." });
    }
});

// ── Login ──────────────────────────────────────────────────
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) return res.status(400).json({ message: "Username and password are required." });

        const user = await User.findOne({ username: username.trim() });

        // same error for wrong username OR wrong password — prevents user enumeration
        if (!user) return res.status(401).json({ message: "Invalid username or password." });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ message: "Invalid username or password." });

        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.json({
            token,
            user: { id: user._id, username: user.username },
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error during login." });
    }
});

export default router;
