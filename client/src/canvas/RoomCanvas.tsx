import { useRef } from "react";
import type { CanvasElement, ElementType } from "./types.js";
import { CursorLayer } from "./CursorLayer.js";
import { Toolbar } from "./Toolbar.js";
import type { Participant, CursorPosition } from "./types.js";
import { Widget } from "./Widget.js";

interface Props {
  elements: Map<string, CanvasElement>;
  participants: Participant[];
  cursors: Map<string, CursorPosition>;
  canEdit: boolean;
  onAdd: (type: ElementType) => void;
  onMove: (id: string, x: number, y: number) => void;
  onContentChange: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onCursorMove: (x: number, y: number) => void;
}

const DEFAULTS: Record<ElementType, { width: number; height: number; content: string; style: Record<string, string> }> = {
  text: { width: 160, height: 40, content: "New text", style: { background: "transparent" } },
  button: { width: 120, height: 44, content: "Button", style: { background: "#4363d8", color: "white", borderRadius: "6px", textAlign: "center" } },
  rectangle: { width: 140, height: 100, content: "", style: { background: "#e0e0e0", border: "1px solid #999" } },
  input: { width: 200, height: 40, content: "Input field", style: { background: "white", border: "1px solid #999" } },
  image: { width: 160, height: 120, content: "Image placeholder", style: { background: "#ddd" } },
};

export function RoomCanvas(props: Props) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  function handlePointerMove(e: React.PointerEvent) {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    props.onCursorMove(e.clientX - rect.left, e.clientY - rect.top);
  }

  return (
    <div className="room-canvas-wrapper">
      <Toolbar disabled={!props.canEdit} onAdd={(type) => props.onAdd(type)} />
      <div className="room-canvas-surface" ref={surfaceRef} onPointerMove={handlePointerMove}>
        {Array.from(props.elements.values()).map((el) => (
          <Widget
            key={el.id}
            element={el}
            canEdit={props.canEdit}
            onMove={props.onMove}
            onContentChange={props.onContentChange}
            onDelete={props.onDelete}
          />
        ))}
        <CursorLayer cursors={props.cursors} participants={props.participants} />
      </div>
    </div>
  );
}

export const elementDefaults = DEFAULTS;
