import type { ElementType } from "./types.js";

interface Props {
  disabled: boolean;
  onAdd: (type: ElementType) => void;
}

const TOOLS: { type: ElementType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "button", label: "Button" },
  { type: "rectangle", label: "Shape" },
  { type: "input", label: "Input" },
];

export function Toolbar({ disabled, onAdd }: Props) {
  return (
    <div className="toolbar">
      {TOOLS.map((tool) => (
        <button key={tool.type} disabled={disabled} onClick={() => onAdd(tool.type)}>
          + {tool.label}
        </button>
      ))}
      {disabled && <span className="toolbar-hint">View only</span>}
    </div>
  );
}
