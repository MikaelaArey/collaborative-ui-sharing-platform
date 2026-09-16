import type { Server } from "http";
import { nanoid } from "nanoid";
import { WebSocket, WebSocketServer } from "ws";
import { verifyToken } from "../auth/jwt.js";
import { prisma } from "../db.js";
import { recordAudit, roomManager } from "../rooms/roomManager.js";
import type { Participant, RoomRole } from "../rooms/types.js";
import { ConnectionRateLimiter } from "../utils/rateLimit.js";
import { logger } from "../utils/logger.js";

type ControlMode = "host_approval" | "quick_swap";

interface RoomFlags {
  roomId: string;
  ownerId: string;
  isLocked: boolean;
  isEnded: boolean;
  /** The single participant currently allowed to send input:* messages, or null. Host-granted only. */
  controllerId: string | null;
  /** host_approval: only owner:grantControl assigns a controller. quick_swap: anyone can self-claim
   *  control:claim, no host approval needed. The Host picks this per-session and can change it, or
   *  override it with lock/revoke/kick, at any time regardless of which mode is active. */
  controlMode: ControlMode;
}

interface ConnectionState {
  id: string;
  ws: WebSocket;
  roomId: string;
  participant: Participant;
  limiter: ConnectionRateLimiter;
}

// roomId -> connectionId -> ConnectionState
const roomConnections = new Map<string, Map<string, ConnectionState>>();
// roomId -> flags, hydrated from DB on first join, kept in sync on lock/end
const roomFlags = new Map<string, RoomFlags>();

function send(conn: ConnectionState, message: unknown) {
  if (conn.ws.readyState === WebSocket.OPEN) conn.ws.send(JSON.stringify(message));
}

function broadcast(roomId: string, message: unknown, exceptConnectionId?: string) {
  const conns = roomConnections.get(roomId);
  if (!conns) return;
  const data = JSON.stringify(message);
  for (const [connId, conn] of conns) {
    if (connId === exceptConnectionId) continue;
    if (conn.ws.readyState === WebSocket.OPEN) conn.ws.send(data);
  }
}

function participantsList(roomId: string): Participant[] {
  const conns = roomConnections.get(roomId);
  return conns ? Array.from(conns.values()).map((c) => c.participant) : [];
}

/** A room lock forces every non-owner to behave as VIEWER, regardless of assigned role. */
function effectiveRole(conn: ConnectionState): RoomRole {
  const flags = roomFlags.get(conn.roomId);
  if (flags?.isLocked && conn.participant.role !== "OWNER") return "VIEWER";
  return conn.participant.role;
}

function canMutateCanvas(conn: ConnectionState): boolean {
  const role = effectiveRole(conn);
  return role === "OWNER" || role === "EDITOR";
}

async function persistSoon(roomId: string) {
  await roomManager.persist(roomId);
}

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "", "http://localhost");
    const match = url.pathname.match(/^\/ws\/rooms\/([^/]+)$/);
    if (!match) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      void handleConnection(ws, decodeURIComponent(match[1]));
    });
  });

  // Periodically flush dirty canvas state to the DB so a restart doesn't lose settled work.
  setInterval(() => {
    for (const roomId of roomFlags.keys()) {
      void persistSoon(roomId);
    }
  }, 5000);

  return wss;
}

async function handleConnection(ws: WebSocket, joinCode: string) {
  let conn: ConnectionState | null = null;
  const limiter = new ConnectionRateLimiter(40, 1000); // 40 msgs/sec burst allowance

  ws.on("message", async (raw) => {
    if (!limiter.allow()) {
      ws.send(JSON.stringify({ type: "error", reason: "RATE_LIMITED" }));
      return;
    }

    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", reason: "BAD_MESSAGE" }));
      return;
    }

    if (!conn) {
      if (msg?.type !== "join") {
        ws.send(JSON.stringify({ type: "error", reason: "MUST_JOIN_FIRST" }));
        return;
      }
      conn = await handleJoin(ws, joinCode, msg);
      return;
    }

    await handleMessage(conn, msg);
  });

  ws.on("close", () => {
    if (!conn) return;
    const conns = roomConnections.get(conn.roomId);
    const wasPresent = conns?.delete(conn.id) ?? false;
    if (!wasPresent) return; // already removed (and broadcast) by an owner:kick/owner:end action
    clearControllerIfSelf(conn.roomId, conn.participant.id);
    broadcast(conn.roomId, { type: "participant:left", userId: conn.participant.id }, conn.id);
    void recordAudit(conn.roomId, conn.participant.id, "LEAVE");
  });
}

async function handleJoin(ws: WebSocket, joinCode: string, msg: any): Promise<ConnectionState | null> {
  const room = await prisma.room.findUnique({ where: { joinCode } });
  if (!room) {
    ws.send(JSON.stringify({ type: "error", reason: "ROOM_NOT_FOUND" }));
    ws.close();
    return null;
  }
  if (room.isEnded) {
    ws.send(JSON.stringify({ type: "error", reason: "ROOM_ENDED" }));
    ws.close();
    return null;
  }

  let userId: string | null = null;
  let displayName = typeof msg.displayName === "string" && msg.displayName.trim() ? msg.displayName.trim() : "Guest";
  let isGuest = true;

  if (typeof msg.token === "string" && msg.token) {
    const payload = verifyToken(msg.token);
    if (payload) {
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (user) {
        userId = user.id;
        displayName = user.displayName;
        isGuest = false;
      }
    }
  }

  if (!roomFlags.has(room.id)) {
    roomFlags.set(room.id, {
      roomId: room.id,
      ownerId: room.ownerId,
      isLocked: room.isLocked,
      isEnded: room.isEnded,
      controllerId: null,
      controlMode: "host_approval",
    });
  }
  const flags = roomFlags.get(room.id)!;

  const participantId = userId ?? `guest:${nanoid(10)}`;
  const role: RoomRole = userId === room.ownerId ? "OWNER" : (room.defaultRole as RoomRole);

  const participant: Participant = { id: participantId, displayName, role, isGuest };

  const connState: ConnectionState = {
    id: nanoid(12),
    ws,
    roomId: room.id,
    participant,
    limiter: new ConnectionRateLimiter(40, 1000),
  };

  if (!roomConnections.has(room.id)) roomConnections.set(room.id, new Map());
  roomConnections.get(room.id)!.set(connState.id, connState);

  await prisma.membership.create({
    data: {
      roomId: room.id,
      userId,
      guestName: isGuest ? displayName : null,
      role,
    },
  });
  await recordAudit(room.id, participantId, "JOIN", { displayName, role });

  const elements = await roomManager.getElements(room.id);

  send(connState, {
    type: "joined",
    you: { id: participant.id, role: effectiveRoleFor(flags, participant) },
    room: {
      id: room.id,
      name: room.name,
      isLocked: flags.isLocked,
      controllerId: flags.controllerId,
      controlMode: flags.controlMode,
    },
    elements,
    participants: participantsList(room.id),
  });

  broadcast(room.id, { type: "participant:joined", participant }, connState.id);

  logger.info("participant joined room", { roomId: room.id, participantId, role });
  return connState;
}

function effectiveRoleFor(flags: RoomFlags, participant: Participant): RoomRole {
  if (flags.isLocked && participant.role !== "OWNER") return "VIEWER";
  return participant.role;
}

async function handleMessage(conn: ConnectionState, msg: any) {
  const flags = roomFlags.get(conn.roomId);
  if (!flags || flags.isEnded) {
    send(conn, { type: "error", reason: "ROOM_ENDED" });
    return;
  }

  switch (msg?.type) {
    case "cursor": {
      const x = Number(msg.x);
      const y = Number(msg.y);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        broadcast(conn.roomId, { type: "cursor:moved", userId: conn.participant.id, x, y }, conn.id);
      }
      return;
    }

    case "element:add": {
      if (!canMutateCanvas(conn)) {
        send(conn, { type: "error", reason: "FORBIDDEN" });
        return;
      }
      const el = msg.element ?? {};
      const element = await roomManager.addElement(conn.roomId, conn.participant.id, {
        type: el.type,
        x: Number(el.x) || 0,
        y: Number(el.y) || 0,
        width: Number(el.width) || 100,
        height: Number(el.height) || 60,
        content: typeof el.content === "string" ? el.content : "",
        style: typeof el.style === "object" && el.style ? el.style : {},
      });
      broadcast(conn.roomId, { type: "element:added", element });
      await recordAudit(conn.roomId, conn.participant.id, "ELEMENT_ADD", { id: element.id });
      return;
    }

    case "element:update": {
      if (!canMutateCanvas(conn)) {
        send(conn, { type: "error", reason: "FORBIDDEN" });
        return;
      }
      const id = String(msg.id ?? "");
      const patch = typeof msg.patch === "object" && msg.patch ? msg.patch : {};
      const updated = await roomManager.updateElement(conn.roomId, conn.participant.id, id, patch);
      if (!updated) {
        send(conn, { type: "error", reason: "ELEMENT_NOT_FOUND" });
        return;
      }
      broadcast(conn.roomId, { type: "element:updated", id: updated.id, patch, version: updated.version });
      await recordAudit(conn.roomId, conn.participant.id, "ELEMENT_UPDATE", { id, patch });
      return;
    }

    case "element:delete": {
      if (!canMutateCanvas(conn)) {
        send(conn, { type: "error", reason: "FORBIDDEN" });
        return;
      }
      const id = String(msg.id ?? "");
      const removed = await roomManager.deleteElement(conn.roomId, id);
      if (removed) {
        broadcast(conn.roomId, { type: "element:deleted", id });
        await recordAudit(conn.roomId, conn.participant.id, "ELEMENT_DELETE", { id });
      }
      return;
    }

    // --- WebRTC signaling relay: server never inspects SDP/ICE content, only routes it. ---
    case "rtc:offer":
    case "rtc:answer":
    case "rtc:ice": {
      const targetId = String(msg.toId ?? "");
      const target = findParticipantConnection(conn.roomId, targetId);
      if (!target) {
        send(conn, { type: "error", reason: "PEER_NOT_FOUND" });
        return;
      }
      const { toId, ...rest } = msg;
      send(target, { ...rest, type: msg.type, fromId: conn.participant.id });
      return;
    }

    case "control:request": {
      const host = findParticipantConnection(conn.roomId, flags.ownerId);
      if (host) send(host, { type: "control:requested", userId: conn.participant.id });
      return;
    }

    case "control:claim": {
      if (conn.participant.id === flags.ownerId) {
        send(conn, { type: "error", reason: "INVALID_CONTROL_GRANT" });
        return;
      }
      if (flags.controlMode !== "quick_swap") {
        send(conn, { type: "error", reason: "NOT_QUICK_SWAP" });
        return;
      }
      if (flags.isLocked) {
        send(conn, { type: "error", reason: "ROOM_LOCKED" });
        return;
      }
      flags.controllerId = conn.participant.id;
      broadcast(conn.roomId, { type: "control:granted", userId: conn.participant.id });
      await recordAudit(conn.roomId, conn.participant.id, "CLAIM_CONTROL");
      return;
    }

    case "owner:setControlMode": {
      if (conn.participant.id !== flags.ownerId) {
        send(conn, { type: "error", reason: "FORBIDDEN" });
        return;
      }
      const mode = msg.mode === "quick_swap" ? "quick_swap" : msg.mode === "host_approval" ? "host_approval" : null;
      if (!mode) {
        send(conn, { type: "error", reason: "INVALID_CONTROL_MODE" });
        return;
      }
      flags.controlMode = mode;
      broadcast(conn.roomId, { type: "control:modeChanged", mode });
      await recordAudit(conn.roomId, conn.participant.id, "SET_CONTROL_MODE", { mode });
      return;
    }

    case "owner:grantControl": {
      if (conn.participant.id !== flags.ownerId) {
        send(conn, { type: "error", reason: "FORBIDDEN" });
        return;
      }
      const targetId = String(msg.userId ?? "");
      if (targetId === flags.ownerId || !findParticipantConnection(conn.roomId, targetId)) {
        send(conn, { type: "error", reason: "INVALID_CONTROL_GRANT" });
        return;
      }
      flags.controllerId = targetId;
      broadcast(conn.roomId, { type: "control:granted", userId: targetId });
      await recordAudit(conn.roomId, conn.participant.id, "GRANT_CONTROL", { targetId });
      return;
    }

    case "owner:revokeControl": {
      if (conn.participant.id !== flags.ownerId) {
        send(conn, { type: "error", reason: "FORBIDDEN" });
        return;
      }
      flags.controllerId = null;
      broadcast(conn.roomId, { type: "control:revoked" });
      await recordAudit(conn.roomId, conn.participant.id, "REVOKE_CONTROL");
      return;
    }

    case "input:mouseMove":
    case "input:mouseButton":
    case "input:scroll":
    case "input:key": {
      if (!canSendInput(conn, flags)) {
        send(conn, { type: "error", reason: "NOT_CONTROLLER" });
        return;
      }
      const host = findParticipantConnection(conn.roomId, flags.ownerId);
      if (host) {
        const { type, ...payload } = msg;
        send(host, { type: "input:event", inputType: type, ...payload });
      }
      return;
    }

    case "owner:setRole": {
      if (conn.participant.id !== flags.ownerId) {
        send(conn, { type: "error", reason: "FORBIDDEN" });
        return;
      }
      const targetId = String(msg.userId ?? "");
      const role = msg.role === "VIEWER" ? "VIEWER" : msg.role === "EDITOR" ? "EDITOR" : null;
      if (!role || targetId === flags.ownerId) {
        send(conn, { type: "error", reason: "INVALID_ROLE_CHANGE" });
        return;
      }
      const target = findParticipantConnection(conn.roomId, targetId);
      if (target) {
        target.participant.role = role;
        broadcast(conn.roomId, { type: "role:changed", userId: targetId, role });
        await recordAudit(conn.roomId, conn.participant.id, "SET_ROLE", { targetId, role });
      }
      return;
    }

    case "owner:kick": {
      if (conn.participant.id !== flags.ownerId) {
        send(conn, { type: "error", reason: "FORBIDDEN" });
        return;
      }
      const targetId = String(msg.userId ?? "");
      const target = findParticipantConnection(conn.roomId, targetId);
      if (target) {
        send(target, { type: "kicked" });
        roomConnections.get(conn.roomId)?.delete(target.id);
        target.ws.close();
        clearControllerIfSelf(conn.roomId, targetId);
        broadcast(conn.roomId, { type: "participant:left", userId: targetId });
        await recordAudit(conn.roomId, conn.participant.id, "KICK", { targetId });
      }
      return;
    }

    case "owner:lock": {
      if (conn.participant.id !== flags.ownerId) {
        send(conn, { type: "error", reason: "FORBIDDEN" });
        return;
      }
      flags.isLocked = Boolean(msg.locked);
      await prisma.room.update({ where: { id: conn.roomId }, data: { isLocked: flags.isLocked } });
      broadcast(conn.roomId, { type: "room:locked", locked: flags.isLocked });
      await recordAudit(conn.roomId, conn.participant.id, "LOCK", { locked: flags.isLocked });
      return;
    }

    case "owner:end": {
      if (conn.participant.id !== flags.ownerId) {
        send(conn, { type: "error", reason: "FORBIDDEN" });
        return;
      }
      flags.isEnded = true;
      await roomManager.persist(conn.roomId);
      await prisma.room.update({ where: { id: conn.roomId }, data: { isEnded: true } });
      broadcast(conn.roomId, { type: "room:ended" });
      await recordAudit(conn.roomId, conn.participant.id, "END");

      const conns = roomConnections.get(conn.roomId);
      for (const c of conns?.values() ?? []) {
        c.ws.close();
      }
      roomConnections.delete(conn.roomId);
      roomFlags.delete(conn.roomId);
      roomManager.evict(conn.roomId);
      return;
    }

    default:
      send(conn, { type: "error", reason: "UNKNOWN_MESSAGE_TYPE" });
  }
}

function findParticipantConnection(roomId: string, participantId: string): ConnectionState | undefined {
  const conns = roomConnections.get(roomId);
  if (!conns) return undefined;
  for (const c of conns.values()) {
    if (c.participant.id === participantId) return c;
  }
  return undefined;
}

function clearControllerIfSelf(roomId: string, participantId: string) {
  const flags = roomFlags.get(roomId);
  if (flags?.controllerId === participantId) {
    flags.controllerId = null;
    broadcast(roomId, { type: "control:revoked" });
  }
}

function canSendInput(conn: ConnectionState, flags: RoomFlags): boolean {
  return !flags.isLocked && flags.controllerId === conn.participant.id;
}
