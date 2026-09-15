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
    const accessibility = systemPreferences.isTrustedAccessibilityClient(false);
    return { screenRecording, accessibility };
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
