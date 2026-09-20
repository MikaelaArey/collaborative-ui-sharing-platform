# Collaborative UI Sharing Platform

A platform for live screen sharing with real remote control: a **Host** shares their live screen
from a small desktop app, and invited participants — watching from an ordinary web browser — can
be granted real-time control of the Host's mouse and keyboard. The Host controls access at all
times: grant or revoke the single active controller, lock the room to view-only, kick a
participant, or end the session outright, all with immediate effect.

Full product definition, requirements, architecture, data model, security model, API/protocol
spec, and roadmap live in [`/docs`](docs/) — start with
[`docs/01-product-vision.md`](docs/01-product-vision.md) and
[`docs/08-remote-screen-control.md`](docs/08-remote-screen-control.md).

## Repository layout

```
/docs         Product vision, requirements, architecture, security, API spec, roadmap
/server       Node.js + TypeScript backend (Express + WebSocket signaling/room server + Prisma/SQLite)
/client       React + TypeScript frontend (Vite) — used by Viewers/Controllers in the browser,
              and loaded inside the desktop app's window for the Host
/desktop      Electron Host app — screen capture + native input injection (see desktop/README.md)
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
(WebSocket — room protocol, WebRTC signaling relay, and input relay).

### 2. Client
```bash
cd client
npm install
npm run dev
```
Client runs at `http://localhost:5173` and talks to the server above.

### 3. Desktop Host app
```bash
cd desktop
npm install
npm run rebuild-native
npm start
```
Full walkthrough (permissions, granting control, etc.) in [`desktop/README.md`](desktop/README.md).

### 4. Try it
1. In the **desktop app window**, register/log in and create a room — you're the Host.
2. Click **Start sharing screen**, grant the macOS permission prompts the first time, choose a
   screen/window.
3. Open the room's join link in an ordinary **browser** (or a second machine) — you're a Viewer.
4. Click **Request control** in the browser; in the desktop app's Host panel, click **Grant** next
   to that participant. Move the mouse / type in the browser tab and watch it happen on the Host's
   real screen.
5. From the Host panel, try **Revoke control**, **Lock room**, **Kick**, and **End session** and
   observe the immediate effect in the browser window.

## Deploying so join links work over the internet

Everything above runs on `localhost`, which only works for people on this same machine. To get a
real `https://...` join link anyone can open, see [`docs/10-deployment.md`](docs/10-deployment.md)
(deploys the server + client together to Fly.io — the Electron Host app then points at that URL
instead of `localhost:5173`).

## Status

Screen sharing + remote control (v1.1) as scoped in
[`docs/08-remote-screen-control.md`](docs/08-remote-screen-control.md) and
[`docs/07-roadmap.md`](docs/07-roadmap.md). This superseded an earlier shared-canvas-editor MVP
(code kept at `client/src/canvas/`, unused by default — see
[`docs/01-product-vision.md`](docs/01-product-vision.md) revision note). This is an early-stage,
actively developed project.

## License

All Rights Reserved — see [LICENSE](LICENSE).
