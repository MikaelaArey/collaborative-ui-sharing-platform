import { useState } from "react";

interface Props {
  onCreate: (name: string, defaultRole: "EDITOR" | "VIEWER") => Promise<void>;
  onClose: () => void;
}

export function CreateRoomModal({ onCreate, onClose }: Props) {
  const [name, setName] = useState("");
  const [defaultRole, setDefaultRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onCreate(name, defaultRole);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create a room</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Room name
            <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </label>
          <label>
            Default role for new joiners
            <select value={defaultRole} onChange={(e) => setDefaultRole(e.target.value as "EDITOR" | "VIEWER")}>
              <option value="EDITOR">Editor — can edit the canvas</option>
              <option value="VIEWER">Viewer — can only watch</option>
            </select>
          </label>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={busy}>
              {busy ? "Creating..." : "Create room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
