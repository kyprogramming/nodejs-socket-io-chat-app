import express from "express";
import path from "path";
import authRoutes from "./routes/authRoutes.js";
import metrics from "./monitoring/metrics.js";

const app = express();
app.use(express.json());

app.use(express.static(path.join(path.resolve(), "public")));

app.use("/auth", authRoutes);

app.get("/metrics", async (req, res) => {
    res.set("Content-Type", metrics.register.contentType);
    res.end(await metrics.register.metrics());
});

export default app;
