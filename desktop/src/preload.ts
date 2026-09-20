import { contextBridge, ipcRenderer } from "electron";

/**
 * The only surface the renderer (the same React web client, loaded into this Electron window)
 * gets access to. No direct Node/OS access — everything routes through a specific, named IPC
 * call handled in main.ts. This is how `client/src/screenshare/desktopBridge.ts` detects it's
 * running inside the Host app and gets access to screen capture + input injection.
 */
contextBridge.exposeInMainWorld("desktopBridge", {
  listScreenSources: () => ipcRenderer.invoke("list-screen-sources"),
  injectInput: (event: unknown) => ipcRenderer.send("inject-input", event),
  getPermissionStatus: () => ipcRenderer.invoke("get-permission-status"),
  requestAccessibilityAccess: () => ipcRenderer.invoke("request-accessibility-access"),
  openPermissionSettings: (kind: "screenRecording" | "accessibility") =>
    ipcRenderer.send("open-permission-settings", kind),
});
