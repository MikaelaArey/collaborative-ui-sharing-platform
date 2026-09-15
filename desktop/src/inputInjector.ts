import { Button, Point, keyboard, mouse, screen } from "@nut-tree-fork/nut-js";
import { CODE_TO_NUT_KEY } from "./keyMap.js";

const BUTTONS: Record<string, Button> = { left: Button.LEFT, middle: Button.MIDDLE, right: Button.RIGHT };

/**
 * Translates the normalized (0-1) coordinates and abstract key codes coming over the wire from
 * a Controller into real OS-level input on this machine, via nut-js. See
 * docs/08-remote-screen-control.md §4 and docs/09-security-and-permissions-v2.md §2 — this only
 * ever runs for messages the server has already confirmed came from the currently-granted
 * Controller (server/src/realtime/wsServer.ts `canSendInput`); this module trusts its caller on
 * that point and focuses purely on translating events into OS calls.
 *
 * Known limitation (documented, not silently wrong): coordinates are mapped against the primary
 * display's resolution. This is correct when the Host is sharing their entire primary screen —
 * the expected/recommended setup when granting control — but will misalign if sharing a single
 * window or a secondary monitor. See docs/08-remote-screen-control.md §6.
 */
export async function injectInput(msg: any): Promise<void> {
  try {
    switch (msg.inputType) {
      case "input:mouseMove": {
        const point = await toScreenPoint(msg.x, msg.y);
        await mouse.setPosition(point);
        return;
      }
      case "input:mouseButton": {
        const point = await toScreenPoint(msg.x, msg.y);
        await mouse.setPosition(point);
        const button = BUTTONS[msg.button] ?? Button.LEFT;
        if (msg.action === "down") await mouse.pressButton(button);
        else await mouse.releaseButton(button);
        return;
      }
      case "input:scroll": {
        const steps = (delta: number) => Math.max(1, Math.round(Math.abs(delta) / 20));
        if (msg.deltaY) {
          if (msg.deltaY > 0) await mouse.scrollDown(steps(msg.deltaY));
          else await mouse.scrollUp(steps(msg.deltaY));
        }
        if (msg.deltaX) {
          if (msg.deltaX > 0) await mouse.scrollRight(steps(msg.deltaX));
          else await mouse.scrollLeft(steps(msg.deltaX));
        }
        return;
      }
      case "input:key": {
        const key = CODE_TO_NUT_KEY[msg.code];
        if (key === undefined) {
          console.warn(`[inputInjector] unmapped key code: ${msg.code}`);
          return;
        }
        if (msg.action === "down") await keyboard.pressKey(key);
        else await keyboard.releaseKey(key);
        return;
      }
      default:
        console.warn(`[inputInjector] unknown input type: ${msg.inputType}`);
    }
  } catch (err) {
    // Most likely cause: the Accessibility OS permission hasn't been granted yet.
    console.error("[inputInjector] failed to inject input", err);
  }
}

async function toScreenPoint(normX: number, normY: number): Promise<Point> {
  const width = await screen.width();
  const height = await screen.height();
  return new Point(Math.round(normX * width), Math.round(normY * height));
}
