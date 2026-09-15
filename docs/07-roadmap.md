# Roadmap

## Phase 1 — Canvas MVP (original build, 2026-09-15)
- Auth (register/login), room create/join, live shared canvas (add/move/edit/delete elements),
  live cursors, Owner controls (role change, kick, lock, end), server-side permission
  enforcement, audit log, SQLite local dev setup.
- Superseded as the primary product surface by Phase 1.5 (below), at the owner's direction; code
  kept in the repo (`client/src/canvas/`) rather than deleted — see
  [01-product-vision.md](01-product-vision.md) revision note.

## Phase 1.5 — Real screen sharing & remote control (this build, 2026-09-15)
- Electron Host desktop app: screen/window capture, native input injection
  (`@nut-tree/nut-js`), always-on-top "you are sharing / X is in control" indicator.
- WebRTC signaling relay + input relay added to the existing room WebSocket server.
- Browser Viewer/Controller experience reusing the existing auth/room/owner-control
  infrastructure: watch the live stream, request control, and — once granted — drive the Host's
  mouse/keyboard.
- Full architecture: [08-remote-screen-control.md](08-remote-screen-control.md). Security model:
  [09-security-and-permissions-v2.md](09-security-and-permissions-v2.md).

## Phase 2 — Hardening & scale
- TURN relay server for restrictive-network NAT traversal (see
  [08-remote-screen-control.md](08-remote-screen-control.md) §6.1) — v1.5 is STUN-only.
- Swap the (now secondary) canvas editor's text content from a plain string to a Yjs `Y.Text` so
  simultaneous character-level text editing merges instead of last-write-wins, if that surface is
  revived.
- Manual join-approval flow (Host/Owner approves each join request instead of auto-role).
- Postgres + Redis-backed `RoomManager` for multi-instance horizontal scaling.
- Move HTTP/WS to a real TLS deployment (HTTPS/WSS) with a domain.
- Session recording/playback (with clear consent and retention policy — not yet designed).

## Phase 3 — Product breadth
- Multi-monitor sharing (choose or switch between several of the Host's screens mid-session).
- Optional collaborative annotation layer drawn over the live screen share, reusing the existing
  canvas-widget code (`client/src/canvas/`) rather than rebuilding it.
- In-room chat / comments.
- Org/team accounts, billing (if this becomes a commercial product).
