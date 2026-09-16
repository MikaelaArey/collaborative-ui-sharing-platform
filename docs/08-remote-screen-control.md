# Remote Screen Sharing & Control — Architecture

**Added:** 2026-09-15, at the owner's explicit direction, superseding the shared-canvas-editor
framing in the original v1 docs (see [01-product-vision.md](01-product-vision.md) revision note).

## 1. The constraint that shapes everything here

A web browser **cannot** inject synthetic mouse/keyboard input into the operating system, or into
other applications, on someone else's computer. This is a deliberate, load-bearing security
boundary in every browser — not a limitation of this project — and it cannot be worked around from
JavaScript running on a web page.

Consequence: **the Host must run a small native application**, not just visit a web page, for real
remote control to work. Viewers/controllers can stay fully browser-based. This is exactly how every
comparable product works (TeamViewer, AnyDesk, Chrome Remote Desktop all require an installed host
agent or browser extension with elevated OS permissions).

## 2. Roles (screen-sharing session)

| Role | Who | Can |
|------|-----|-----|
| **Host** | The person whose screen is shared. Exactly one per session, runs the desktop Host app. | Choose what to share (full screen / a window), grant or revoke the single active Controller, lock the room to view-only, kick a participant, end the session. |
| **Controller** | At most one participant at a time, granted by the Host. | Move the mouse, click, scroll, and type on the Host's machine, in addition to everything a Viewer can do. |
| **Viewer** | Any other connected participant. | Watch the live video stream of the Host's screen. Cannot send input. |

Only one Controller at a time, by design — simultaneous mouse/keyboard input from multiple people
onto one real cursor has no sane semantics and is a safety risk. A Viewer can *request* control; the
Host grants or denies it.

## 3. High-level flow

```mermaid
sequenceDiagram
    participant Host as Host (Electron app)
    participant Server as Signaling server (existing WS room server)
    participant Viewer as Viewer/Controller (browser)

    Host->>Server: join room (as Owner/Host)
    Viewer->>Server: join room (as Viewer)
    Server-->>Host: participant:joined
    Host->>Server: rtc:offer (SDP, target=Viewer)
    Server-->>Viewer: rtc:offer
    Viewer->>Server: rtc:answer (SDP, target=Host)
    Server-->>Host: rtc:answer
    Host-->>Viewer: (WebRTC media stream, direct P2P once ICE connects)
    Note over Host,Viewer: Live screen video now flows Host to Viewer directly.

    Host->>Server: owner:grantControl {viewerId}
    Server-->>Viewer: control:granted
    Viewer->>Server: input:mouseMove / input:key / ...
    Server->>Host: input:event (only from the current Controller; else FORBIDDEN)
    Host->>Host: native input-simulation library moves the real mouse / types
```

The existing room WebSocket server (`server/src/realtime/wsServer.ts`) is extended to relay two new
categories of message — it does not become a media server; the video itself flows directly between
Host and Viewer via WebRTC once the connection is established (peer-to-peer, or via a TURN relay on
restrictive networks — see §6).

1. **WebRTC signaling relay** — `rtc:offer` / `rtc:answer` / `rtc:ice`, each addressed to a specific
   participant by id, forwarded as-is. The server never inspects or needs to understand SDP/ICE
   content.
2. **Input relay** — `input:*` messages from the current Controller, forwarded to the Host's
   connection only, after the server confirms the sender actually is the currently-granted
   Controller (server-side enforcement, same principle as
   [05-security-and-permissions.md](05-security-and-permissions.md) — the client is never trusted).

## 4. Host application (`/desktop`)

An Electron app (not a browser tab) because it needs two OS-level capabilities no web page has:

- **Screen capture**: Electron's `desktopCapturer` API lists available screens/windows; the
  renderer requests a `MediaStream` for the chosen source and hands it to the same WebRTC code used
  conceptually in the browser client.
- **Input injection**: a native automation library (`@nut-tree/nut-js`) actually moves the OS
  cursor, sends clicks/scroll, and types keystrokes. This requires the user to grant Accessibility
  (and Screen Recording, for capture) permission in macOS System Settings — the app prompts for this
  and cannot and does not attempt to bypass it. See
  [09-security-and-permissions-v2.md](09-security-and-permissions-v2.md) §2.

The Host app reuses the existing web client's React code for the room UI (join screen, owner
control panel) by loading it in an Electron `BrowserWindow`, and adds a thin native layer
(`desktop/src/main.ts`, `desktop/src/preload.ts`) exposing screen-source selection and input
injection to that same renderer code via a narrow, explicit IPC bridge — the renderer never gets
raw Node/OS access.

## 5. Browser client changes

- `client/src/screenshare/` (new) replaces the widget canvas as the primary room view:
  `ScreenShareView.tsx` renders the incoming `<video>` stream and, when the local participant is the
  Controller, captures pointer/wheel/keyboard events on it, translates screen-space coordinates to
  the Host's actual resolution (normalized 0–1 fractions sent over the wire; the Host maps them back
  using its own screen size, so it works regardless of the two machines' resolutions/DPI), and sends
  them as `input:*` messages.
- `OwnerControlPanel` gains "Grant control" / "Revoke control" alongside the existing lock / kick /
  end actions.
- The original widget-canvas code (`client/src/canvas/`) is left in place, unused by the default
  room view, in case a future direction wants collaborative annotation *on top of* a shared screen
  (drawing/markers over the live video) — that would reuse, not duplicate, this existing code.

## 6. Presence cursors and control hand-off modes

Added 2026-09-16, in response to a direct request for something closer to Google Docs' "everyone
has a visible cursor" feel. The key fact that shapes this: a real computer has exactly one system
mouse cursor and one keyboard input focus. Docs can show independent per-user cursors because every
user is editing a shared *data model*, not fighting over one literal pointer — that doesn't
transfer to remote-controlling one real OS desktop. So this is two separate, honestly-scoped
features rather than one:

**Presence cursors (visual only, no real effect).** Every connected participant — Viewer or
Controller — continuously broadcasts their pointer position over the shared-screen video as a
`cursor` message (already a generic, unauthenticated, broadcast-only message type — see
[06-api-and-protocol-spec.md](06-api-and-protocol-spec.md) §2/§3). `ScreenShareView` renders every
other participant's position as a colored, labeled dot overlaid on the video, exactly like the
original canvas editor's `CursorLayer`. This lets people point things out and divide up work
("I'll take this side of the screen") — it does not let more than one person's *actual* clicks land
at once. Only the currently-granted Controller's `input:*` messages are relayed to the Host and
actually move the real cursor (§3).

**Control mode — the Host's choice per session.** A room has a `controlMode`, set by the Host at
any time via `owner:setControlMode`, defaulting to `"host_approval"`:

| Mode | How a participant gets control |
|---|---|
| `host_approval` (default) | Sends `control:request`; the Host sees it and must explicitly `owner:grantControl`. Nothing happens without the Host's action. |
| `quick_swap` | Any non-Host participant can send `control:claim` and is *immediately* made the Controller (auto-replacing whoever had it) — no Host action needed per hand-off. |

The Host can switch modes mid-session, and — critically — **retains every override regardless of
mode**: `owner:lock`, `owner:revokeControl`, `owner:kick`, and `owner:end` all work identically in
either mode and always win. `quick_swap` trades a layer of per-hand-off Host approval for speed; it
does not trade away the Host's ability to shut things down instantly. This is why it's offered as a
per-session choice rather than a global setting — a classroom demo might want `host_approval` for
every hand-off to be deliberate, while a fast-paced pairing session might prefer `quick_swap` and
rely on the Host's standing override for safety instead.

## 7. Known limitations (stated plainly, not glossed over)

1. **NAT traversal**: direct peer-to-peer WebRTC works on most home/office networks via STUN, but
   strict corporate firewalls may block it entirely without a TURN relay server, which this v1 does
   not stand up (documented as a phase-2 item — see [07-roadmap.md](07-roadmap.md)). Sessions on
   such networks may fail to connect.
2. **One Controller at a time**, by design (§2) — not a bug, a safety choice.
3. **Multi-monitor hosts**: v1 shares one selected screen/window at a time, not all monitors
   simultaneously.
4. **Permission grants are manual and OS-specific** — the Host must click through macOS's
   Accessibility/Screen Recording prompts (and the equivalent on Windows/Linux) the first time; the
   app cannot do this silently, by design (see §4 and
   [09-security-and-permissions-v2.md](09-security-and-permissions-v2.md)).
