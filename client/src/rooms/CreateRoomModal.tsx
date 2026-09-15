import { useState } from "react";

interface Props {
  onCreate: (name: string) => Promise<void>;
  onClose: () => void;
}

export function CreateRoomModal({ onCreate, onClose }: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onCreate(name);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create a screen-sharing room</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Room name
            <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </label>
          <p className="modal-hint">
            You'll get a join link to share. Everyone who can control the screen is chosen by you,
            one at a time, once you start sharing from the Host desktop app.
          </p>
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
