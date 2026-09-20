# Deployment

**Added:** 2026-09-20, so join links work for anyone on the internet, not just people on the same
machine or local network as the Host.

## 1. Shape of the deployment

The server (`/server`) and browser client (`/client`) are deployed together as **one service, one
URL**: the Express server serves the client's built static files directly (see
`server/src/index.ts` — `express.static` + an SPA fallback route) and answers `/api/*` and
`/ws/*` itself. This avoids CORS and keeps join links to a single domain.

The **Electron Host app is not deployed** — it's something each Host runs locally on their own
machine (that's the whole point: it needs to see and control *that* machine). Once the server is
deployed, point the Host app at it via `HOST_CLIENT_URL=https://<your-app>.fly.dev` instead of
`http://localhost:5173`.

## 2. Why Fly.io

The database is SQLite — a single file — which needs to live on **persistent storage**, not the
ephemeral filesystem most serverless/PaaS platforms give you. Fly.io's volumes solve that simply,
without requiring a migration to Postgres just to get a first real deployment out. (A future
multi-instance deployment would want Postgres + Redis instead — see
[07-roadmap.md](07-roadmap.md) phase 2 — but that's not needed for one Fly machine serving one
SQLite file.)

## 3. One-time setup

```bash
brew install flyctl        # already done if you're following along with this session
flyctl auth login           # opens a browser to log in / create a Fly account — has to be you
```

## 4. Deploy

From the repo root (`Dockerfile` and `fly.toml` are already checked in):

```bash
flyctl launch --no-deploy --copy-config --name <your-unique-app-name>
flyctl volumes create collab_data --size 1 --region iad
flyctl secrets set JWT_SECRET="$(openssl rand -hex 32)"
flyctl deploy
```

- `<your-unique-app-name>` must be globally unique across all of Fly — if `collab-screen-share`
  (the name in `fly.toml`) is taken, pick another; update `app = "..."` in `fly.toml` to match.
- The volume (`collab_data`, mounted at `/data`) is where the SQLite database file
  (`/data/prod.db`, per `DATABASE_URL` in `fly.toml`) actually lives — without it, every deploy
  would wipe all rooms/accounts.
- `JWT_SECRET` is the one required secret (see `server/src/env.ts`) — generated fresh here, never
  committed.
- `flyctl deploy` builds the `Dockerfile` on Fly's remote builder (no local Docker needed) and
  ships it.

`min_machines_running = 1` in `fly.toml` is a deliberate choice: Fly can scale a web service to
zero when idle to save cost, but for a real-time WebSocket/WebRTC app that means an active session
could get cut off mid-call by a cold stop, so this app always keeps at least one machine warm
instead. That has a small ongoing cost on Fly even at low traffic — acceptable for now, worth
revisiting if cost becomes a concern.

## 5. After deploying

- Your public URL is `https://<your-app-name>.fly.dev`. Open it — the same register/login/create
  room flow should work exactly as it did locally.
- Point the Host app at it: `HOST_CLIENT_URL=https://<your-app-name>.fly.dev npm start` (from
  `/desktop`), or edit the default in `desktop/src/main.ts` if you want it permanent.
- Join links are now real: `https://<your-app-name>.fly.dev/room/<code>` works for anyone,
  anywhere — send it however you'd send any link (text, Slack, email).

## 6. Redeploying after code changes

```bash
flyctl deploy
```
That's it — same command every time; it rebuilds the Docker image from the current source and
rolls it out.

## 7. Known gap

WebRTC here is STUN-only (see [08-remote-screen-control.md](08-remote-screen-control.md) §7) —
works for most networks, but a participant behind a strict corporate firewall/symmetric NAT may be
unable to connect. Fixing that needs a TURN relay server, tracked as a phase-2 roadmap item, not
part of this deployment.
