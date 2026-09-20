import cors from "cors";
import express from "express";
import { createServer } from "http";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { authRouter } from "./auth/routes.js";
import { env } from "./env.js";
import { attachWebSocketServer } from "./realtime/wsServer.js";
import { roomsRouter } from "./rooms/routes.js";
import { logger } from "./utils/logger.js";
import { rateLimit } from "./utils/rateLimit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// In production, the server also serves the built browser client (client/dist) — one deployed
// origin, no CORS/two-URL setup needed. The Electron Host app still loads this same URL via
// HOST_CLIENT_URL. Client-side routes (e.g. /room/:joinCode) fall back to index.html.
const clientDist = path.join(__dirname, "../public");
app.use(express.static(clientDist));
app.get(/^(?!\/api|\/ws|\/health).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const server = createServer(app);
attachWebSocketServer(server);

server.listen(env.port, () => {
  logger.info(`Server listening on http://localhost:${env.port}`);
});
