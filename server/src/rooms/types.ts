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
  id: string; // userId, or a generated guest id
  displayName: string;
  role: RoomRole;
  isGuest: boolean;
}
