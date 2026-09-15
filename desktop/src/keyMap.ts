import { Key } from "@nut-tree-fork/nut-js";

/**
 * Maps a browser KeyboardEvent.code (physical key, layout-independent) to nut-js's Key enum
 * (also physical/scan-code based), so remote keystrokes land on the same physical key regardless
 * of either machine's keyboard layout. Not exhaustive — covers the keys a typical remote-support
 * or classroom session needs. Unmapped keys are ignored (logged), not silently mis-mapped.
 */
export const CODE_TO_NUT_KEY: Record<string, Key> = {
  KeyA: Key.A, KeyB: Key.B, KeyC: Key.C, KeyD: Key.D, KeyE: Key.E, KeyF: Key.F, KeyG: Key.G,
  KeyH: Key.H, KeyI: Key.I, KeyJ: Key.J, KeyK: Key.K, KeyL: Key.L, KeyM: Key.M, KeyN: Key.N,
  KeyO: Key.O, KeyP: Key.P, KeyQ: Key.Q, KeyR: Key.R, KeyS: Key.S, KeyT: Key.T, KeyU: Key.U,
  KeyV: Key.V, KeyW: Key.W, KeyX: Key.X, KeyY: Key.Y, KeyZ: Key.Z,

  Digit0: Key.Num0, Digit1: Key.Num1, Digit2: Key.Num2, Digit3: Key.Num3, Digit4: Key.Num4,
  Digit5: Key.Num5, Digit6: Key.Num6, Digit7: Key.Num7, Digit8: Key.Num8, Digit9: Key.Num9,

  F1: Key.F1, F2: Key.F2, F3: Key.F3, F4: Key.F4, F5: Key.F5, F6: Key.F6, F7: Key.F7, F8: Key.F8,
  F9: Key.F9, F10: Key.F10, F11: Key.F11, F12: Key.F12,

  Space: Key.Space, Enter: Key.Enter, NumpadEnter: Key.Enter, Escape: Key.Escape,
  Backspace: Key.Backspace, Tab: Key.Tab, CapsLock: Key.CapsLock, Delete: Key.Delete,
  Home: Key.Home, End: Key.End, PageUp: Key.PageUp, PageDown: Key.PageDown,
  ArrowUp: Key.Up, ArrowDown: Key.Down, ArrowLeft: Key.Left, ArrowRight: Key.Right,

  ShiftLeft: Key.LeftShift, ShiftRight: Key.RightShift,
  ControlLeft: Key.LeftControl, ControlRight: Key.RightControl,
  AltLeft: Key.LeftAlt, AltRight: Key.RightAlt,
  MetaLeft: Key.LeftSuper, MetaRight: Key.RightSuper,

  Minus: Key.Minus, Equal: Key.Equal, BracketLeft: Key.LeftBracket, BracketRight: Key.RightBracket,
  Backslash: Key.Backslash, Semicolon: Key.Semicolon, Quote: Key.Quote, Comma: Key.Comma,
  Period: Key.Period, Slash: Key.Slash, Backquote: Key.Grave,
};
