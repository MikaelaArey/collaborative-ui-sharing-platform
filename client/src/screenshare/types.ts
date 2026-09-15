export type { Participant, RoomRole } from "../canvas/types.js";

export type MouseButton = "left" | "middle" | "right";

export interface InputMouseMove {
  inputType: "input:mouseMove";
  x: number;
  y: number;
}

export interface InputMouseButton {
  inputType: "input:mouseButton";
  button: MouseButton;
  action: "down" | "up";
  x: number;
  y: number;
}

export interface InputScroll {
  inputType: "input:scroll";
  deltaX: number;
  deltaY: number;
}

export interface InputKey {
  inputType: "input:key";
  key: string;
  code: string;
  action: "down" | "up";
  modifiers: { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean };
}

export type InputEvent = InputMouseMove | InputMouseButton | InputScroll | InputKey;
