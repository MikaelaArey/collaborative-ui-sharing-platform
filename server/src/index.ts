import cors from "cors";
import express from "express";
import { createServer } from "http";
import { authRouter } from "./auth/routes.js";
import { env } from "./env.js";
import { attachWebSocketServer } from "./realtime/wsServer.js";
import { roomsRouter } from "./rooms/routes.js";
import { logger } from "./utils/logger.js";
import { rateLimit } from "./utils/rateLimit.js";

const app = express();
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());

app.use(
  "/api/auth",
  rateLimit({ windowMs: 60_000, max: 20 }),
  authRouter
);
app.use("/api/rooms", roomsRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

const server = createServer(app);
attachWebSocketServer(server);

server.listen(env.port, () => {
  logger.info(`Server listening on http://localhost:${env.port}`);
});
