import { useEffect, useRef } from "react";
import type { Participant } from "./types.js";
import type { PresenceCursor } from "./useScreenShareRoom.js";

interface Props {
  /** The Host's own local preview stream, or a Viewer's received remote stream — see
   * useScreenShareRoom's `localStream` vs `remoteStream`. Whichever this participant should see. */
  displayStream: MediaStream | null;
  isController: boolean;
  isHost: boolean;
  isLocked: boolean;
  selfId: string | undefined;
  participants: Participant[];
  cursors: Map<string, PresenceCursor>;
  onMouseMove: (x: number, y: number) => void;
  onMouseButton: (button: "left" | "middle" | "right", action: "down" | "up", x: number, y: number) => void;
  onScroll: (deltaX: number, deltaY: number) => void;
  onKey: (key: string, code: string, action: "down" | "up", modifiers: Modifiers) => void;
  onCursorMove: (x: number, y: number) => void;
}

interface Modifiers {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
}

const BUTTON_NAMES: Array<"left" | "middle" | "right"> = ["left", "middle", "right"];
const CURSOR_COLORS = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#0aa3a3", "#f032e6"];

function colorFor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) % CURSOR_COLORS.length;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

/** The video element's content rect within the container, accounting for `object-fit: contain`
 * letterboxing — shared by the normalized<->display coordinate conversions below. */
function contentRect(video: HTMLVideoElement) {
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

  return { rect, contentWidth, contentHeight, offsetX, offsetY };
}

/** Maps a point within the <video> element to a 0-1 fraction of its *content* area. */
function toNormalizedPoint(video: HTMLVideoElement, clientX: number, clientY: number): { x: number; y: number } | null {
  const c = contentRect(video);
  if (!c) return null;
  const localX = clientX - c.rect.left - c.offsetX;
  const localY = clientY - c.rect.top - c.offsetY;
  if (localX < 0 || localY < 0 || localX > c.contentWidth || localY > c.contentHeight) return null;
  return { x: localX / c.contentWidth, y: localY / c.contentHeight };
}

/** Inverse of toNormalizedPoint: a 0-1 fraction back to pixel coordinates within the container,
 * for positioning the presence-cursor overlay dots. */
function toDisplayPoint(video: HTMLVideoElement, normX: number, normY: number): { left: number; top: number } | null {
  const c = contentRect(video);
  if (!c) return null;
  return { left: c.offsetX + normX * c.contentWidth, top: c.offsetY + normY * c.contentHeight };
}

function modifiersFrom(e: { shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean }): Modifiers {
  return { shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey };
}

export function ScreenShareView({
  displayStream,
  isController,
  isHost,
  isLocked,
  selfId,
  participants,
  cursors,
  onMouseMove,
  onMouseButton,
  onScroll,
  onKey,
  onCursorMove,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canControl = isController && !isLocked;

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = displayStream;
  }, [displayStream]);

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
    if (!videoRef.current) return;
    const point = toNormalizedPoint(videoRef.current, e.clientX, e.clientY);
    if (!point) return;
    onCursorMove(point.x, point.y);
    if (canControl) onMouseMove(point.x, point.y);
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
      {displayStream ? (
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

      {displayStream && videoRef.current && (
        <div className="presence-cursor-layer">
          {Array.from(cursors.entries())
            .filter(([userId]) => userId !== selfId)
            .map(([userId, cursor]) => {
              const point = toDisplayPoint(videoRef.current!, cursor.x, cursor.y);
              if (!point) return null;
              const participant = participants.find((p) => p.id === userId);
              const color = colorFor(userId);
              return (
                <div key={userId} className="presence-cursor" style={{ left: point.left, top: point.top, color }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill={color}>
                    <path d="M1 1 L1 14 L4.5 10.8 L7 15 L9 14 L6.7 9.8 L11 9.5 Z" />
                  </svg>
                  <span className="presence-cursor-label" style={{ background: color }}>
                    {participant?.displayName ?? "Someone"}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      {displayStream && isHost && <div className="screen-share-badge screen-share-badge-active">Your screen — sharing</div>}
      {displayStream && !isHost && !isController && <div className="screen-share-badge">View only</div>}
      {displayStream && !isHost && isController && isLocked && (
        <div className="screen-share-badge">Room locked — control paused</div>
      )}
      {displayStream && !isHost && isController && !isLocked && (
        <div className="screen-share-badge screen-share-badge-active">You are in control</div>
      )}
    </div>
  );
}
