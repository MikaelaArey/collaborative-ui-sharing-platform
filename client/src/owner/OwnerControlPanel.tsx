import type { Participant } from "../canvas/types.js";

interface Props {
  participants: Participant[];
  isLocked: boolean;
  onSetRole: (userId: string, role: "EDITOR" | "VIEWER") => void;
  onKick: (userId: string) => void;
  onLock: (locked: boolean) => void;
  onEnd: () => void;
}

export function OwnerControlPanel({ participants, isLocked, onSetRole, onKick, onLock, onEnd }: Props) {
  return (
    <aside className="owner-panel">
      <h3>Owner controls</h3>
      <div className="owner-panel-global">
        <button onClick={() => onLock(!isLocked)}>{isLocked ? "Unlock room" : "Lock room (view-only)"}</button>
        <button
          className="danger"
          onClick={() => {
            if (confirm("End the session for everyone? This cannot be undone.")) onEnd();
          }}
        >
          End session
        </button>
      </div>

      <ul className="owner-panel-participants">
        {participants
          .filter((p) => p.role !== "OWNER")
          .map((p) => (
            <li key={p.id}>
              <span>{p.displayName}</span>
              <select value={p.role} onChange={(e) => onSetRole(p.id, e.target.value as "EDITOR" | "VIEWER")}>
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
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
