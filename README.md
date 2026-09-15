# Collaborative UI Sharing Platform

A web platform where multiple people can simultaneously view, control, and edit a single shared,
live user interface in real time — like Google Docs, but for interactive interfaces instead of
text. One Owner per room controls access at all times: change roles, kick a participant, lock the
room to view-only, or end the session outright, all with immediate effect.

Full product definition, requirements, architecture, data model, security model, API/protocol
spec, and roadmap live in [`/docs`](docs/) — start with
[`docs/01-product-vision.md`](docs/01-product-vision.md).

## Repository layout

```
/docs      Product vision, requirements, architecture, security, API spec, roadmap
/server    Node.js + TypeScript backend (Express + WebSocket + Prisma/SQLite)
/client    React + TypeScript frontend (Vite)
/desktop   Phase 2 planning notes (Electron wrapper, not yet built)
```

## Running it locally

Requires Node.js 18+.

### 1. Server
```bash
cd server
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev
```
Server runs at `http://localhost:4000` (HTTP API) and `ws://localhost:4000/ws/rooms/:joinCode`
(WebSocket).

### 2. Client
```bash
cd client
npm install
npm run dev
```
Client runs at `http://localhost:5173` and talks to the server above.

### 3. Try it
1. Open `http://localhost:5173`, register an account, create a room.
2. Copy the room's join link/code, open it in a second browser (or incognito window) — join as a
   second participant.
3. Add and move elements from either window and watch them sync live in the other.
4. From the Owner's window, use the owner control panel to change roles, kick, lock, or end the
   room, and observe the effect on the other window.

## Status

Phase 1 (MVP) as scoped in [`docs/02-requirements.md`](docs/02-requirements.md) and
[`docs/07-roadmap.md`](docs/07-roadmap.md). This is an early-stage, actively developed project.

## License

All Rights Reserved — see [LICENSE](LICENSE).
