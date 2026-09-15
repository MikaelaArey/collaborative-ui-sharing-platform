# Roadmap

## Phase 1 — MVP (this build)
- Auth (register/login), room create/join, live shared canvas (add/move/edit/delete elements),
  live cursors, Owner controls (role change, kick, lock, end), server-side permission
  enforcement, audit log, SQLite local dev setup.

## Phase 2 — Hardening & richer editing
- Swap text-element content from a plain string to a Yjs `Y.Text` (or similar CRDT) so
  simultaneous character-level text editing merges instead of last-write-wins.
- Manual join-approval flow (Owner approves each join request instead of auto-role).
- Version history / rollback for a room's canvas.
- Postgres + Redis-backed `RoomManager` for multi-instance horizontal scaling.
- Move HTTP/WS to a real TLS deployment (HTTPS/WSS) with a domain.

## Phase 3 — Desktop app
- Electron wrapper reusing the existing React client, talking to the same backend, adding
  offline-aware reconnect handling and native window chrome. (`/desktop` currently holds only
  planning notes — see `desktop/README.md`.)

## Phase 4 — Product breadth
- Component/template library beyond basic shapes/text/buttons/inputs.
- In-room chat / comments.
- Exporting a room's final canvas as a standalone static page or embeddable widget.
- Org/team accounts, billing (if this becomes a commercial product).

## Explicit non-goals (revisit only if the product direction changes)
- Full OS-level remote desktop control of third-party apps — different product, different
  security model, out of scope as defined in [01-product-vision.md](01-product-vision.md) §5.
