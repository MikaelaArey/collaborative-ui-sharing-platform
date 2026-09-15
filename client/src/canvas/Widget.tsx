import { useRef } from "react";
import type { CanvasElement } from "./types.js";

interface Props {
  element: CanvasElement;
  canEdit: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onContentChange: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

export function Widget({ element, canEdit, onMove, onContentChange, onDelete }: Props) {
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  function handlePointerDown(e: React.PointerEvent) {
    if (!canEdit) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: element.x, origY: element.y };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    onMove(element.id, dragState.current.origX + dx, dragState.current.origY + dy);
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  const style: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    cursor: canEdit ? "grab" : "default",
    ...element.style,
  };

  return (
    <div
      className={`widget widget-${element.type}`}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {element.type === "rectangle" ? null : (
        <div
          className="widget-content"
          contentEditable={canEdit}
          suppressContentEditableWarning
          onBlur={(e) => onContentChange(element.id, e.currentTarget.textContent ?? "")}
        >
          {element.content}
        </div>
      )}
      {canEdit && (
        <button className="widget-delete" onClick={() => onDelete(element.id)} title="Delete">
          ×
        </button>
      )}
    </div>
  );
}
