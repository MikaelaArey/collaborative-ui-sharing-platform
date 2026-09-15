import { nanoid } from "nanoid";
import { prisma } from "../db.js";
import type { CanvasElement, ElementType } from "./types.js";

/**
 * Authoritative in-memory canvas state per room, per docs/03-architecture.md §3.3:
 * server-authoritative broadcast model with per-element last-write-wins, not a full CRDT.
 */
interface LiveRoom {
  elements: Map<string, CanvasElement>;
  dirty: boolean;
}

const liveRooms = new Map<string, LiveRoom>();

async function hydrate(roomId: string): Promise<LiveRoom> {
  const existing = liveRooms.get(roomId);
  if (existing) return existing;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  const snapshot: CanvasElement[] = room ? JSON.parse(room.stateSnapshot) : [];
  const live: LiveRoom = {
    elements: new Map(snapshot.map((el) => [el.id, el])),
    dirty: false,
  };
  liveRooms.set(roomId, live);
  return live;
}

export const roomManager = {
  async getElements(roomId: string): Promise<CanvasElement[]> {
    const live = await hydrate(roomId);
    return Array.from(live.elements.values());
  },

  async addElement(
    roomId: string,
    actorId: string,
    input: { type: ElementType; x: number; y: number; width: number; height: number; content: string; style: Record<string, string | number> }
  ): Promise<CanvasElement> {
    const live = await hydrate(roomId);
    const element: CanvasElement = {
      id: nanoid(12),
      type: input.type,
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      content: input.content,
      style: input.style ?? {},
      version: 1,
      updatedBy: actorId,
    };
    live.elements.set(element.id, element);
    live.dirty = true;
    return element;
  },

  async updateElement(
    roomId: string,
    actorId: string,
    id: string,
    patch: Partial<Pick<CanvasElement, "x" | "y" | "width" | "height" | "content" | "style">>
  ): Promise<CanvasElement | null> {
    const live = await hydrate(roomId);
    const current = live.elements.get(id);
    if (!current) return null;

    const updated: CanvasElement = {
      ...current,
      ...patch,
      version: current.version + 1,
      updatedBy: actorId,
    };
    live.elements.set(id, updated);
    live.dirty = true;
    return updated;
  },

  async deleteElement(roomId: string, id: string): Promise<boolean> {
    const live = await hydrate(roomId);
    const removed = live.elements.delete(id);
    if (removed) live.dirty = true;
    return removed;
  },

  /** Persist the current in-memory snapshot to the DB. Call periodically and on room end. */
  async persist(roomId: string): Promise<void> {
    const live = liveRooms.get(roomId);
    if (!live || !live.dirty) return;
    const snapshot = JSON.stringify(Array.from(live.elements.values()));
    await prisma.room.update({ where: { id: roomId }, data: { stateSnapshot: snapshot } });
    live.dirty = false;
  },

  /** Drop in-memory state for a room (e.g. after it has ended) to free memory. */
  evict(roomId: string): void {
    liveRooms.delete(roomId);
  },
};

export async function recordAudit(roomId: string, actorId: string, action: string, detail: unknown = {}) {
  await prisma.auditLogEntry.create({
    data: { roomId, actorId, action, detail: JSON.stringify(detail) },
  });
}
