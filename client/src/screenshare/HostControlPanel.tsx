import type { Participant } from "./types.js";

interface Props {
  participants: Participant[];
  controllerId: string | null;
  pendingControlRequests: string[];
  isLocked: boolean;
  isSharing: boolean;
  onStartSharing: () => void;
  onStopSharing: () => void;
  onGrantControl: (userId: string) => void;
  onRevokeControl: () => void;
  onLock: (locked: boolean) => void;
  onKick: (userId: string) => void;
  onEnd: () => void;
}

export function HostControlPanel({
  participants,
  controllerId,
  pendingControlRequests,
  isLocked,
  isSharing,
  onStartSharing,
  onStopSharing,
  onGrantControl,
  onRevokeControl,
  onLock,
  onKick,
  onEnd,
}: Props) {
  const others = participants.filter((p) => p.role !== "OWNER");

  return (
    <aside className="owner-panel">
      <h3>Host controls</h3>
      <div className="owner-panel-global">
        {isSharing ? (
          <button className="danger" onClick={onStopSharing}>
            Stop sharing screen
          </button>
        ) : (
          <button onClick={onStartSharing}>Start sharing screen</button>
        )}
        <button onClick={() => onLock(!isLocked)}>{isLocked ? "Unlock room" : "Lock room (pause control)"}</button>
        {controllerId && (
          <button onClick={onRevokeControl}>Revoke control</button>
        )}
        <button
          className="danger"
          onClick={() => {
            if (confirm("End the session for everyone? This cannot be undone.")) onEnd();
          }}
        >
          End session
        </button>
      </div>

      {pendingControlRequests.length > 0 && (
        <div className="control-requests">
          <h4>Requesting control</h4>
          <ul>
            {pendingControlRequests.map((userId) => {
              const p = participants.find((pp) => pp.id === userId);
              return (
                <li key={userId}>
                  <span>{p?.displayName ?? userId}</span>
                  <button onClick={() => onGrantControl(userId)}>Grant</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ul className="owner-panel-participants">
        {others.map((p) => (
          <li key={p.id}>
            <span>
              {p.displayName} {controllerId === p.id && <strong>(in control)</strong>}
            </span>
            {controllerId !== p.id && <button onClick={() => onGrantControl(p.id)}>Grant control</button>}
            <button
              className="danger"
              onClick={() => {
                if (confirm(`Remove ${p.displayName} from the room?`)) onKick(p.id);
              }}
            >
              Kick
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
