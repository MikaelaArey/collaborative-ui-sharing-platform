import { useEffect, useRef } from "react";

interface Props {
  remoteStream: MediaStream | null;
  isController: boolean;
  isLocked: boolean;
  onMouseMove: (x: number, y: number) => void;
  onMouseButton: (button: "left" | "middle" | "right", action: "down" | "up", x: number, y: number) => void;
  onScroll: (deltaX: number, deltaY: number) => void;
  onKey: (key: string, code: string, action: "down" | "up", modifiers: Modifiers) => void;
}

interface Modifiers {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
}

const BUTTON_NAMES: Array<"left" | "middle" | "right"> = ["left", "middle", "right"];

/** Maps a point within the <video> element to a 0-1 fraction of its *content* area, accounting
 * for the letterboxing that `object-fit: contain` introduces when aspect ratios differ. */
function toNormalizedPoint(video: HTMLVideoElement, clientX: number, clientY: number): { x: number; y: number } | null {
  const rect = video.getBoundingClientRect();
  const videoW = video.videoWidth;
  const videoH = video.videoHeight;
  if (!videoW || !videoH || rect.width === 0 || rect.height === 0) return null;

  const elementAspect = rect.width / rect.height;
  const videoAspect = videoW / videoH;

  let contentWidth = rect.width;
  let contentHeight = rect.height;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspect > elementAspect) {
    contentHeight = rect.width / videoAspect;
    offsetY = (rect.height - contentHeight) / 2;
  } else {
    contentWidth = rect.height * videoAspect;
    offsetX = (rect.width - contentWidth) / 2;
  }

  const localX = clientX - rect.left - offsetX;
  const localY = clientY - rect.top - offsetY;
  if (localX < 0 || localY < 0 || localX > contentWidth || localY > contentHeight) return null;

  return { x: localX / contentWidth, y: localY / contentHeight };
}

function modifiersFrom(e: { shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean }): Modifiers {
  return { shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey };
}

export function ScreenShareView({ remoteStream, isController, isLocked, onMouseMove, onMouseButton, onScroll, onKey }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canControl = isController && !isLocked;

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // Keyboard capture only while this view has focus and the participant is the active Controller.
  useEffect(() => {
    if (!canControl) return;
    const container = containerRef.current;
    if (!container) return;

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      onKey(e.key, e.code, "down", modifiersFrom(e));
    }
    function handleKeyUp(e: KeyboardEvent) {
      e.preventDefault();
      onKey(e.key, e.code, "up", modifiersFrom(e));
    }

    container.addEventListener("keydown", handleKeyDown);
    container.addEventListener("keyup", handleKeyUp);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      container.removeEventListener("keyup", handleKeyUp);
    };
  }, [canControl, onKey]);

  function handlePointerMove(e: React.PointerEvent<HTMLVideoElement>) {
    if (!canControl || !videoRef.current) return;
    const point = toNormalizedPoint(videoRef.current, e.clientX, e.clientY);
    if (point) onMouseMove(point.x, point.y);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLVideoElement>) {
    if (!canControl || !videoRef.current) return;
    const point = toNormalizedPoint(videoRef.current, e.clientX, e.clientY);
    if (point) onMouseButton(BUTTON_NAMES[e.button] ?? "left", "down", point.x, point.y);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLVideoElement>) {
    if (!canControl || !videoRef.current) return;
    const point = toNormalizedPoint(videoRef.current, e.clientX, e.clientY);
    if (point) onMouseButton(BUTTON_NAMES[e.button] ?? "left", "up", point.x, point.y);
  }

  function handleWheel(e: React.WheelEvent<HTMLVideoElement>) {
    if (!canControl) return;
    e.preventDefault();
    onScroll(e.deltaX, e.deltaY);
  }

  return (
    <div
      className={`screen-share-view ${canControl ? "controllable" : ""}`}
      ref={containerRef}
      tabIndex={canControl ? 0 : -1}
    >
      {remoteStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="screen-share-video"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onContextMenu={(e) => canControl && e.preventDefault()}
        />
      ) : (
        <div className="screen-share-waiting">Waiting for the Host to start sharing…</div>
      )}
      {remoteStream && !isController && (
        <div className="screen-share-badge">View only</div>
      )}
      {remoteStream && isController && isLocked && (
        <div className="screen-share-badge">Room locked — control paused</div>
      )}
      {remoteStream && isController && !isLocked && (
        <div className="screen-share-badge screen-share-badge-active">You are in control</div>
      )}
    </div>
  );
}
