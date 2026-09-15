# Requirements — v1 (MVP)

## 1. Functional requirements

### 1.1 Accounts & authentication
- FR-1: A person can register with an email + password.
- FR-2: A person can log in and receive a session (JWT).
- FR-3: A person can use the app without an account as an anonymous guest **only when invited into
  an existing room** (guests cannot create rooms).

### 1.2 Rooms (shared interface sessions)
- FR-4: An authenticated user can create a room. They become the **Owner**.
- FR-5: A room has a unique, non-guessable join code/link.
- FR-6: Anyone with the join link can request to join; the Owner's chosen default role
  (Editor or Viewer) is applied automatically, or the Owner can approve joins manually
  (configurable per room).
- FR-7: The Owner can, at any time and with immediate effect:
  - Change any participant's role (Viewer / Editor).
  - Remove ("kick") any participant — their connection is closed immediately.
  - Lock the room (forces all non-owners to Viewer, regardless of prior role).
  - End the session — closes the room for everyone, disconnects all participants.
- FR-8: Roles:
  - **Owner** — full control, exactly one per room, the creator.
  - **Editor** — can add/move/edit/delete interface elements.
  - **Viewer** — can see live changes and cursors, cannot mutate the interface.

### 1.3 Shared interface canvas
- FR-9: The canvas holds discrete **elements** (text block, button, rectangle/shape, image
  placeholder, input field) with position, size, and style/content properties.
- FR-10: Any Editor (or Owner) can add, move, resize, restyle, edit content of, or delete an
  element. Changes broadcast to all participants within ~200ms under normal network conditions.
- FR-11: Every participant sees a live cursor / label for every other connected participant.
- FR-12: Concurrent edits to *different* elements never conflict. Concurrent edits to the *same*
  element's same property resolve by last-write-wins with the change visibly applied for everyone
  (documented limitation — see [03-architecture.md](03-architecture.md) §6).

### 1.4 Safety / access control
- FR-13: All room-mutating actions are authorized server-side by role — the client is never
  trusted to self-enforce permissions.
- FR-14: A kicked or room-ended participant is disconnected within 1 second and cannot rejoin
  without a new invite/approval.
- FR-15: Basic abuse protection: rate limiting on room creation, join attempts, and message volume
  per connection.
- FR-16: An audit trail is kept per room (who joined, who was kicked, who changed what element and
  when) for the Owner to review.

## 2. Non-functional requirements

- NFR-1: **Latency** — element updates and cursor updates delivered to other participants in
  well under 1 second on a normal broadband connection.
- NFR-2: **Consistency** — every connected client converges to the same room state within a few
  seconds of any change, even after a brief disconnect/reconnect.
- NFR-3: **Security** — passwords hashed (bcrypt), sessions via signed JWT, all room actions
  authorized server-side, transport encrypted (HTTPS/WSS) in any non-local deployment.
- NFR-4: **Portability** — runs locally for development with zero external services (SQLite file
  DB, in-memory room state); swappable to Postgres + Redis for multi-instance production
  deployment without changing application code (behind an interface).
- NFR-5: **Accessibility of codebase** — TypeScript across client and server, documented, testable.

## 3. Out of scope for v1 (tracked in [07-roadmap.md](07-roadmap.md))

- Native desktop app (Electron wrapper) — phase 2.
- CRDT-based deep merge (Yjs or similar) — phase 2/3.
- Rich component library / templates, version history / rollback, comments/chat, exporting a room
  to a standalone shareable page.
