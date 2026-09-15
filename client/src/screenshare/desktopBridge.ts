import type { InputEvent } from "./types.js";

export interface ScreenSource {
  id: string;
  name: string;
  thumbnailDataUrl: string;
}

/**
 * The narrow bridge the Electron Host app's preload script exposes on `window.desktopBridge`
 * (see desktop/src/preload.ts). Absent entirely in a plain browser — that's how the web client
 * tells "I'm running inside the Host desktop app" from "I'm a regular Viewer/Controller browser".
 */
export interface DesktopBridge {
  listScreenSources: () => Promise<ScreenSource[]>;
  injectInput: (event: InputEvent) => void;
  getPermissionStatus: () => Promise<{ screenRecording: boolean; accessibility: boolean }>;
  openPermissionSettings: (kind: "screenRecording" | "accessibility") => void;
}

declare global {
  interface Window {
    desktopBridge?: DesktopBridge;
  }
}

export function getDesktopBridge(): DesktopBridge | null {
  return typeof window !== "undefined" ? window.desktopBridge ?? null : null;
}

/** Requests the chosen screen/window as a local MediaStream, via Electron's chromeMediaSourceId. */
export async function captureScreenSource(sourceId: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      // Electron-specific constraint shape; not part of the standard MediaTrackConstraints type.
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: sourceId,
        maxWidth: 3840,
        maxHeight: 2160,
        maxFrameRate: 30,
      },
    } as unknown as MediaTrackConstraints,
  });
}
