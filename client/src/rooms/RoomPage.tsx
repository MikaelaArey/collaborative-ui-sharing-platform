import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.js";
import { captureScreenSource, getDesktopBridge, type ScreenSource } from "../screenshare/desktopBridge.js";
import { HostControlPanel } from "../screenshare/HostControlPanel.js";
import { ScreenShareView } from "../screenshare/ScreenShareView.js";
import type { InputEvent } from "../screenshare/types.js";
import { useScreenShareRoom } from "../screenshare/useScreenShareRoom.js";

export function RoomPage() {
  const { joinCode = "" } = useParams();
  const { token, user } = useAuth();
  const [isSharing, setIsSharing] = useState(false);
  const [sourcePicker, setSourcePicker] = useState<ScreenSource[] | null>(null);
  const [permissionWarning, setPermissionWarning] = useState<string | null>(null);

  const bridge = getDesktopBridge();

  const { state, actions } = useScreenShareRoom(
    joinCode,
    token,
    user?.displayName,
    bridge ? (msg: InputEvent) => bridge.injectInput(msg) : undefined
  );

  const isHost = state.you?.role === "OWNER";
  const isController = state.you?.id === state.controllerId;
  const isElectronHost = isHost && !!bridge;

  useEffect(() => {
    if (!isElectronHost || !bridge) return;
    bridge.getPermissionStatus().then((p) => {
      if (!p.accessibility) setPermissionWarning((prev) => prev ?? "accessibility");
    });
  }, [isElectronHost, bridge]);

  if (state.status === "connecting") return <div className="room-status">Connecting...</div>;
  if (state.status === "kicked") return <div className="room-status">You were removed from this room by the host.</div>;
  if (state.status === "ended") return <div className="room-status">This session has ended.</div>;
  if (state.status === "error") return <div className="room-status">Couldn't join room: {state.errorReason}</div>;

  async function handleStartSharing() {
    if (!bridge) return;
    const permissions = await bridge.getPermissionStatus();
    if (!permissions.screenRecording) {
      setPermissionWarning("screenRecording");
      return;
    }
    setPermissionWarning(null);
    const sources = await bridge.listScreenSources();
    if (sources.length === 1) {
      await beginCapture(sources[0].id);
    } else {
      setSourcePicker(sources);
    }
  }

  async function beginCapture(sourceId: string) {
    setSourcePicker(null);
    const stream = await captureScreenSource(sourceId);
    actions.startSharing(stream);
    setIsSharing(true);
  }

  function handleStopSharing() {
    actions.stopSharing();
    setIsSharing(false);
  }

  return (
    <div className="room-page">
      <header className="room-header">
        <h1>{state.roomName}</h1>
        <span className="join-code">Join code: {joinCode}</span>
        <span className="your-role">You are: {isHost ? "HOST" : isController ? "CONTROLLER" : "VIEWER"}</span>
        {state.isLocked && <span className="badge">Room locked</span>}
      </header>

      {isElectronHost && permissionWarning && (
        <div className="host-web-notice permission-warning">
          {permissionWarning === "screenRecording"
            ? "Screen Recording permission is required before you can share your screen."
            : "Accessibility permission is required before remote control can move your mouse or keyboard."}
          <button onClick={() => bridge?.openPermissionSettings(permissionWarning as "screenRecording" | "accessibility")}>
            Open System Settings
          </button>
        </div>
      )}

      <div className="room-body">
        <div className="room-canvas-wrapper">
          {isHost && !isElectronHost && !state.remoteStream && (
            <div className="host-web-notice">
              You created this room from the browser. To actually share and control your screen,
              open the <strong>Host desktop app</strong> and join this same room —
              see <code>desktop/README.md</code>.
            </div>
          )}
          <ScreenShareView
            remoteStream={state.remoteStream}
            isController={isController}
            isLocked={state.isLocked}
            onMouseMove={actions.sendMouseMove}
            onMouseButton={actions.sendMouseButton}
            onScroll={actions.sendScroll}
            onKey={actions.sendKey}
          />
          {!isHost && !isController && state.remoteStream && (
            <button className="request-control-btn" onClick={actions.requestControl}>
              Request control
            </button>
          )}
        </div>

        {isHost && (
          <HostControlPanel
            participants={state.participants}
            controllerId={state.controllerId}
            pendingControlRequests={state.pendingControlRequests}
            isLocked={state.isLocked}
            isSharing={isSharing}
            onStartSharing={handleStartSharing}
            onStopSharing={handleStopSharing}
            onGrantControl={actions.grantControl}
            onRevokeControl={actions.revokeControl}
            onLock={actions.lock}
            onKick={actions.kick}
            onEnd={actions.end}
          />
        )}
      </div>

      {sourcePicker && (
        <div className="modal-backdrop" onClick={() => setSourcePicker(null)}>
          <div className="modal source-picker" onClick={(e) => e.stopPropagation()}>
            <h2>Choose what to share</h2>
            <div className="source-grid">
              {sourcePicker.map((source) => (
                <button key={source.id} className="source-option" onClick={() => beginCapture(source.id)}>
                  <img src={source.thumbnailDataUrl} alt={source.name} />
                  <span>{source.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
