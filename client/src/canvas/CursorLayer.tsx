import type { CursorPosition, Participant } from "./types.js";

interface Props {
  cursors: Map<string, CursorPosition>;
  participants: Participant[];
}

const COLORS = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6"];

function colorFor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) % COLORS.length;
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function CursorLayer({ cursors, participants }: Props) {
  return (
    <div className="cursor-layer">
      {Array.from(cursors.values()).map((cursor) => {
        const participant = participants.find((p) => p.id === cursor.userId);
        return (
          <div
            key={cursor.userId}
            className="live-cursor"
            style={{ left: cursor.x, top: cursor.y, color: colorFor(cursor.userId) }}
          >
            <span className="cursor-dot" />
            <span className="cursor-label">{participant?.displayName ?? "Someone"}</span>
          </div>
        );
      })}
    </div>
  );
}
