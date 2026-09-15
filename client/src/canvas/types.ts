export type RoomRole = "OWNER" | "EDITOR" | "VIEWER";
export type ElementType = "text" | "button" | "rectangle" | "image" | "input";

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  style: Record<string, string | number>;
  version: number;
  updatedBy: string;
}

export interface Participant {
  id: string;
  displayName: string;
  role: RoomRole;
  isGuest: boolean;
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
}
