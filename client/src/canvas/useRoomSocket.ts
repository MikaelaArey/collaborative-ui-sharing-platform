import { useEffect, useRef, useState } from "react";
import { WS_URL } from "../api/client.js";
import type { CanvasElement, CursorPosition, Participant, RoomRole } from "./types.js";

type ConnectionStatus = "connecting" | "joined" | "kicked" | "ended" | "error";

interface RoomSocketState {
  status: ConnectionStatus;
  roomName: string | null;
  isLocked: boolean;
  you: { id: string; role: RoomRole } | null;
  elements: Map<string, CanvasElement>;
  participants: Participant[];
  cursors: Map<string, CursorPosition>;
  errorReason: string | null;
}

export interface NewElementInput {
  type: CanvasElement["type"];
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  style: Record<string, string | number>;
}

export function useRoomSocket(joinCode: string, token: string | null, displayName: string | undefined) {
  const [state, setState] = useState<RoomSocketState>({
    status: "connecting",
    roomName: null,
    isLocked: false,
    you: null,
    elements: new Map(),
    participants: [],
    cursors: new Map(),
    errorReason: null,
  });
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/rooms/${encodeURIComponent(joinCode)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", token, displayName }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setState((prev) => applyMessage(prev, msg));
    };

    ws.onerror = () => {
      setState((prev) => ({ ...prev, status: "error", errorReason: "CONNECTION_ERROR" }));
    };

    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode]);

  function sendMessage(message: unknown) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }

  return {
    state,
    actions: {
      addElement: (element: NewElementInput) => sendMessage({ type: "element:add", element }),
      updateElement: (id: string, patch: Partial<CanvasElement>) =>
        sendMessage({ type: "element:update", id, patch }),
      deleteElement: (id: string) => sendMessage({ type: "element:delete", id }),
      sendCursor: (x: number, y: number) => sendMessage({ type: "cursor", x, y }),
      setRole: (userId: string, role: "EDITOR" | "VIEWER") =>
        sendMessage({ type: "owner:setRole", userId, role }),
      kick: (userId: string) => sendMessage({ type: "owner:kick", userId }),
      lock: (locked: boolean) => sendMessage({ type: "owner:lock", locked }),
      end: () => sendMessage({ type: "owner:end" }),
    },
  };
}

function applyMessage(prev: RoomSocketState, msg: any): RoomSocketState {
  switch (msg.type) {
    case "joined": {
      const elements = new Map<string, CanvasElement>();
      for (const el of msg.elements as CanvasElement[]) elements.set(el.id, el);
      return {
        ...prev,
        status: "joined",
        roomName: msg.room.name,
        isLocked: msg.room.isLocked,
        you: msg.you,
        elements,
        participants: msg.participants,
      };
    }
    case "element:added": {
      const elements = new Map(prev.elements);
      elements.set(msg.element.id, msg.element);
      return { ...prev, elements };
    }
    case "element:updated": {
      const elements = new Map(prev.elements);
      const current = elements.get(msg.id);
      if (current) elements.set(msg.id, { ...current, ...msg.patch, version: msg.version });
      return { ...prev, elements };
    }
    case "element:deleted": {
      const elements = new Map(prev.elements);
      elements.delete(msg.id);
      return { ...prev, elements };
    }
    case "cursor:moved": {
      const cursors = new Map(prev.cursors);
      cursors.set(msg.userId, { userId: msg.userId, x: msg.x, y: msg.y });
      return { ...prev, cursors };
    }
    case "participant:joined": {
      return { ...prev, participants: [...prev.participants, msg.participant] };
    }
    case "participant:left": {
      return { ...prev, participants: prev.participants.filter((p) => p.id !== msg.userId) };
    }
    case "role:changed": {
      const participants = prev.participants.map((p) => (p.id === msg.userId ? { ...p, role: msg.role } : p));
      const you = prev.you && prev.you.id === msg.userId ? { ...prev.you, role: msg.role } : prev.you;
      return { ...prev, participants, you };
    }
    case "room:locked": {
      return { ...prev, isLocked: msg.locked };
    }
    case "room:ended": {
      return { ...prev, status: "ended" };
    }
    case "kicked": {
      return { ...prev, status: "kicked" };
    }
    case "error": {
      return { ...prev, status: prev.status === "connecting" ? "error" : prev.status, errorReason: msg.reason };
    }
    default:
      return prev;
  }
}
