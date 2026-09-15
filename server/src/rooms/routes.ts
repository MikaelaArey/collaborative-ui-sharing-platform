import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { AuthedRequest } from "../auth/middleware.js";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { rateLimit } from "../utils/rateLimit.js";

export const roomsRouter = Router();

const createRoomSchema = z.object({
  name: z.string().min(1).max(80),
  defaultRole: z.enum(["EDITOR", "VIEWER"]).optional(),
});

roomsRouter.post(
  "/",
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 10, keyFn: (req) => (req as AuthedRequest).user?.userId ?? req.ip ?? "unknown" }),
  async (req: AuthedRequest, res) => {
    const parsed = createRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input." });
      return;
    }

    const room = await prisma.room.create({
      data: {
        name: parsed.data.name,
        joinCode: nanoid(10),
        ownerId: req.user!.userId,
        defaultRole: parsed.data.defaultRole ?? "EDITOR",
      },
    });

    res.status(201).json({ room });
  }
);

roomsRouter.get("/mine", requireAuth, async (req: AuthedRequest, res) => {
  const rooms = await prisma.room.findMany({
    where: {
      OR: [{ ownerId: req.user!.userId }, { memberships: { some: { userId: req.user!.userId } } }],
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ rooms });
});

roomsRouter.get("/:joinCode", async (req, res) => {
  const room = await prisma.room.findUnique({ where: { joinCode: req.params.joinCode } });
  if (!room) {
    res.status(404).json({ error: "Room not found." });
    return;
  }
  res.json({ id: room.id, name: room.name, isLocked: room.isLocked, isEnded: room.isEnded, joinCode: room.joinCode });
});
