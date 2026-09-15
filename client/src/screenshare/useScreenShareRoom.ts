import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL } from "../api/client.js";
import type { Participant, RoomRole } from "./types.js";

type Status = "connecting" | "joined" | "kicked" | "ended" | "error";

interface State {
  status: Status;
  errorReason: string | null;
  roomName: string | null;
  isLocked: boolean;
  you: { id: string; role: RoomRole } | null;
  participants: Participant[];
  controllerId: string | null;
  pendingControlRequests: string[];
  remoteStream: MediaStream | null;
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

/**
 * Drives one screen-sharing room over the existing room WebSocket protocol, per
 * docs/08-remote-screen-control.md. Used by both the browser Viewer/Controller client and (loaded
 * inside an Electron BrowserWindow) the Host app.
 *
 * `onHostInputEvent` is supplied only by the Host app — it's how a granted Controller's mouse/
 * keyboard events reach the native injection layer (see desktop/src/preload.ts).
 */
export function useScreenShareRoom(
  joinCode: string,
  token: string | null,
  displayName: string | undefined,
  onHostInputEvent?: (msg: any) => void
) {
  const [state, setState] = useState<State>({
    status: "connecting",
    errorReason: null,
    roomName: null,
    isLocked: false,
    you: null,
    participants: [],
    controllerId: null,
    pendingControlRequests: [],
    remoteStream: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const youRef = useRef<{ id: string; role: RoomRole } | null>(null);
  const participantsRef = useRef<Participant[]>([]);
  const onHostInputEventRef = useRef(onHostInputEvent);
  onHostInputEventRef.current = onHostInputEvent;

  const send = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(message));
  }, []);

  const createPeerForViewer = useCallback(
    (viewerId: string) => {
      if (peersRef.current.has(viewerId)) return;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peersRef.current.set(viewerId, pc);
      localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
      pc.onicecandidate = (e) => {
        if (e.candidate) send({ type: "rtc:ice", toId: viewerId, candidate: e.candidate.toJSON() });
      };
      void pc.createOffer().then(async (offer) => {
        await pc.setLocalDescription(offer);
        send({ type: "rtc:offer", toId: viewerId, sdp: offer });
      });
    },
    [send]
  );

  const ensureViewerPeer = useCallback(
    (hostId: string) => {
      let pc = peersRef.current.get(hostId);
      if (pc) return pc;
      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peersRef.current.set(hostId, pc);
      pc.onicecandidate = (e) => {
        if (e.candidate) send({ type: "rtc:ice", toId: hostId, candidate: e.candidate.toJSON() });
      };
      pc.ontrack = (e) => {
        setState((prev) => ({ ...prev, remoteStream: e.streams[0] ?? null }));
      };
      return pc;
    },
    [send]
  );

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/rooms/${encodeURIComponent(joinCode)}`);
    wsRef.current = ws;

    ws.onopen = () => ws.send(JSON.stringify({ type: "join", token, displayName }));

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "joined": {
          youRef.current = msg.you;
          participantsRef.current = msg.participants;
          setState((prev) => ({
            ...prev,
            status: "joined",
            roomName: msg.room.name,
            isLocked: msg.room.isLocked,
            controllerId: msg.room.controllerId,
            you: msg.you,
            participants: msg.participants,
          }));
          if (msg.you.role === "OWNER" && localStreamRef.current) {
            for (const p of msg.participants as Participant[]) {
              if (p.id !== msg.you.id) createPeerForViewer(p.id);
            }
          }
          return;
        }
        case "participant:joined": {
          participantsRef.current = [...participantsRef.current, msg.participant];
          setState((prev) => ({ ...prev, participants: participantsRef.current }));
          if (youRef.current?.role === "OWNER" && localStreamRef.current) {
            createPeerForViewer(msg.participant.id);
          }
          return;
        }
        case "participant:left": {
          participantsRef.current = participantsRef.current.filter((p) => p.id !== msg.userId);
          setState((prev) => ({ ...prev, participants: participantsRef.current }));
          peersRef.current.get(msg.userId)?.close();
          peersRef.current.delete(msg.userId);
          return;
        }
        case "role:changed": {
          setState((prev) => {
            const participants = prev.participants.map((p) => (p.id === msg.userId ? { ...p, role: msg.role } : p));
            participantsRef.current = participants;
            const you = prev.you && prev.you.id === msg.userId ? { ...prev.you, role: msg.role } : prev.you;
            return { ...prev, participants, you };
          });
          return;
        }
        case "room:locked":
          setState((prev) => ({ ...prev, isLocked: msg.locked }));
          return;
        case "room:ended":
          setState((prev) => ({ ...prev, status: "ended" }));
          return;
        case "kicked":
          setState((prev) => ({ ...prev, status: "kicked" }));
          return;
        case "control:granted":
          setState((prev) => ({ ...prev, controllerId: msg.userId, pendingControlRequests: [] }));
          return;
        case "control:revoked":
          setState((prev) => ({ ...prev, controllerId: null }));
          return;
        case "control:requested":
          setState((prev) => ({
            ...prev,
            pendingControlRequests: prev.pendingControlRequests.includes(msg.userId)
              ? prev.pendingControlRequests
              : [...prev.pendingControlRequests, msg.userId],
          }));
          return;
        case "rtc:offer": {
          const pc = ensureViewerPeer(msg.fromId);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send({ type: "rtc:answer", toId: msg.fromId, sdp: answer });
          return;
        }
        case "rtc:answer": {
          const pc = peersRef.current.get(msg.fromId);
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          return;
        }
        case "rtc:ice": {
          const pc = peersRef.current.get(msg.fromId);
          if (pc && msg.candidate) await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          return;
        }
        case "input:event":
          onHostInputEventRef.current?.(msg);
          return;
        case "error":
          setState((prev) => ({ ...prev, errorReason: msg.reason }));
          return;
        default:
          return;
      }
    };

    ws.onerror = () => setState((prev) => ({ ...prev, status: "error", errorReason: "CONNECTION_ERROR" }));

    return () => {
      ws.close();
      for (const pc of peersRef.current.values()) pc.close();
      peersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode]);

  const startSharing = useCallback(
    (stream: MediaStream) => {
      localStreamRef.current = stream;
      for (const p of participantsRef.current) {
        if (p.id !== youRef.current?.id) createPeerForViewer(p.id);
      }
    },
    [createPeerForViewer]
  );

  const stopSharing = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    for (const pc of peersRef.current.values()) pc.close();
    peersRef.current.clear();
  }, []);

  return {
    state,
    actions: {
      startSharing,
      stopSharing,
      requestControl: () => send({ type: "control:request" }),
      grantControl: (userId: string) => send({ type: "owner:grantControl", userId }),
      revokeControl: () => send({ type: "owner:revokeControl" }),
      lock: (locked: boolean) => send({ type: "owner:lock", locked }),
      kick: (userId: string) => send({ type: "owner:kick", userId }),
      end: () => send({ type: "owner:end" }),
      sendMouseMove: (x: number, y: number) => send({ type: "input:mouseMove", x, y }),
      sendMouseButton: (button: string, action: "down" | "up", x: number, y: number) =>
        send({ type: "input:mouseButton", button, action, x, y }),
      sendScroll: (deltaX: number, deltaY: number) => send({ type: "input:scroll", deltaX, deltaY }),
      sendKey: (
        key: string,
        code: string,
        action: "down" | "up",
        modifiers: { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean }
      ) => send({ type: "input:key", key, code, action, modifiers }),
    },
  };
}
