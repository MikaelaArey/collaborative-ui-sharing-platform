import { app, BrowserWindow, desktopCapturer, ipcMain, shell, systemPreferences } from "electron";
import * as path from "node:path";
import { injectInput } from "./inputInjector.js";

const CLIENT_URL = process.env.HOST_CLIENT_URL ?? "http://localhost:5173";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    title: "Screen Share — Host",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload needs ipcRenderer; desktopCapturer access stays main-process-only
    },
  });

  void win.loadURL(CLIENT_URL);
}

app.whenReady().then(() => {
  ipcMain.handle("list-screen-sources", async () => {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 300, height: 200 },
    });
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnailDataUrl: s.thumbnail.toDataURL(),
    }));
  });

  ipcMain.on("inject-input", (_event, msg) => {
    void injectInput(msg);
  });

  ipcMain.handle("get-permission-status", () => {
    if (process.platform !== "darwin") {
      // Windows/Linux don't gate this behind an explicit OS permission the same way.
      return { screenRecording: true, accessibility: true };
    }
    const screenRecording = systemPreferences.getMediaAccessStatus("screen") === "granted";
    // `false` = check only, never prompt — used for passive status display, not for requesting.
    const accessibility = systemPreferences.isTrustedAccessibilityClient(false);
    return { screenRecording, accessibility };
  });

  // Screen Recording has no separate "request" API on macOS — the system only shows that consent
  // dialog the first time something actually attempts to capture the screen (desktopCapturer
  // listing sources is enough to trigger it). So there's nothing to do here beyond letting the
  // capture attempt happen; see client/src/rooms/RoomPage.tsx, which no longer blocks on the
  // status check before trying.

  // Accessibility DOES have an explicit prompting mode — `true` shows the system dialog if the
  // user hasn't decided yet. Call this once, right when it's actually needed (granting control),
  // not proactively on load, so the prompt has clear context.
  ipcMain.handle("request-accessibility-access", () => {
    if (process.platform !== "darwin") return true;
    return systemPreferences.isTrustedAccessibilityClient(true);
  });

  ipcMain.on("open-permission-settings", (_event, kind: "screenRecording" | "accessibility") => {
    if (process.platform !== "darwin") return;
    const url =
      kind === "screenRecording"
        ? "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
        : "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";
    void shell.openExternal(url);
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
