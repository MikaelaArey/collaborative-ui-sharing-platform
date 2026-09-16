import type { ControlMode } from "./useScreenShareRoom.js";
import type { Participant } from "./types.js";

interface Props {
  participants: Participant[];
  controllerId: string | null;
  controlMode: ControlMode;
  pendingControlRequests: string[];
  isLocked: boolean;
  isSharing: boolean;
  onStartSharing: () => void;
  onStopSharing: () => void;
  onGrantControl: (userId: string) => void;
  onRevokeControl: () => void;
  onSetControlMode: (mode: ControlMode) => void;
  onLock: (locked: boolean) => void;
  onKick: (userId: string) => void;
  onEnd: () => void;
}

export function HostControlPanel({
  participants,
  controllerId,
  controlMode,
  pendingControlRequests,
  isLocked,
  isSharing,
  onStartSharing,
  onStopSharing,
  onGrantControl,
  onRevokeControl,
  onSetControlMode,
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

        <label className="control-mode-select">
          Control hand-off
          <select value={controlMode} onChange={(e) => onSetControlMode(e.target.value as ControlMode)}>
            <option value="host_approval">Host approval — I grant every request</option>
            <option value="quick_swap">Quick swap — anyone can take control instantly</option>
          </select>
        </label>

        <button onClick={() => onLock(!isLocked)}>{isLocked ? "Unlock room" : "Lock room (pause control)"}</button>
        {controllerId && <button onClick={onRevokeControl}>Revoke control</button>}
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
