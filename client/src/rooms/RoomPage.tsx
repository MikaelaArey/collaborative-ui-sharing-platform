import { useParams } from "react-router-dom";
import { useRef } from "react";
import { useAuth } from "../auth/AuthContext.js";
import { elementDefaults, RoomCanvas } from "../canvas/RoomCanvas.js";
import { useRoomSocket } from "../canvas/useRoomSocket.js";
import type { ElementType } from "../canvas/types.js";
import { OwnerControlPanel } from "../owner/OwnerControlPanel.js";

const CURSOR_THROTTLE_MS = 50;

export function RoomPage() {
  const { joinCode = "" } = useParams();
  const { token, user } = useAuth();
  const { state, actions } = useRoomSocket(joinCode, token, user?.displayName);
  const lastCursorSent = useRef(0);

  const canEdit = state.you?.role === "OWNER" || state.you?.role === "EDITOR";
  const isOwner = state.you?.role === "OWNER";

  if (state.status === "connecting") return <div className="room-status">Connecting...</div>;
  if (state.status === "kicked") return <div className="room-status">You were removed from this room by the owner.</div>;
  if (state.status === "ended") return <div className="room-status">This session has ended.</div>;
  if (state.status === "error") return <div className="room-status">Couldn't join room: {state.errorReason}</div>;

  function handleAdd(type: ElementType) {
    const defaults = elementDefaults[type];
    actions.addElement({ type, x: 80, y: 80, width: defaults.width, height: defaults.height, content: defaults.content, style: defaults.style });
  }

  function handleCursorMove(x: number, y: number) {
    const now = Date.now();
    if (now - lastCursorSent.current < CURSOR_THROTTLE_MS) return;
    lastCursorSent.current = now;
    actions.sendCursor(x, y);
  }

  return (
    <div className="room-page">
      <header className="room-header">
        <h1>{state.roomName}</h1>
        <span className="join-code">Join code: {joinCode}</span>
        <span className="your-role">You are: {state.you?.role}</span>
        {state.isLocked && <span className="badge">Room locked (view-only)</span>}
      </header>

      <div className="room-body">
        <RoomCanvas
          elements={state.elements}
          participants={state.participants}
          cursors={state.cursors}
          canEdit={canEdit}
          onAdd={handleAdd}
          onMove={(id, x, y) => actions.updateElement(id, { x, y })}
          onContentChange={(id, content) => actions.updateElement(id, { content })}
          onDelete={actions.deleteElement}
          onCursorMove={handleCursorMove}
        />

        {isOwner && (
          <OwnerControlPanel
            participants={state.participants}
            isLocked={state.isLocked}
            onSetRole={actions.setRole}
            onKick={actions.kick}
            onLock={actions.lock}
            onEnd={actions.end}
          />
        )}
      </div>
    </div>
  );
}
