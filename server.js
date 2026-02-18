import "dotenv/config";
import express from "express";
import cors from "cors";
import aiRoutes from "./routes/ai.routes.js";

const app = express();

app.use(
  cors({
    origin: "*",
  }),
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

app.use("/api/ai", aiRoutes);

const port = process.env.AI_SERVER_PORT || process.env.PORT || 5001;

app.listen(port, () => {
  console.log(`AI server listening on http://localhost:${port}`);
});

