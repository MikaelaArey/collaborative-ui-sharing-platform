# Security & Permissions

## 1. Roles and what they can do

| Action                              | Owner | Editor | Viewer |
|--------------------------------------|:-----:|:------:|:------:|
| View live canvas + cursors           | ✅    | ✅     | ✅     |
| Add / move / edit / delete elements  | ✅    | ✅     | ❌     |
| Change another participant's role    | ✅    | ❌     | ❌     |
| Kick a participant                   | ✅    | ❌     | ❌     |
| Lock room (force all to Viewer)      | ✅    | ❌     | ❌     |
| End session (disconnect everyone)    | ✅    | ❌     | ❌     |

There is exactly one Owner per room — the creator. Ownership is not transferable in v1.

## 2. Server-side enforcement (the actual safety boundary)

The client UI hiding a button is a convenience, **never** the security control. Every mutating
WebSocket message is checked against the sender's authoritative role, tracked server-side in the
`RoomManager`, before it is applied to room state or broadcast to anyone:

1. Client sends `element:update`.
2. Server looks up the sender's *current, server-tracked* role for that room (not anything the
   client claims).
3. If role is Viewer, or the room `isLocked`/`isEnded`, the request is rejected (and, if repeated
   abnormally, the connection may be throttled/dropped — see §4).
4. Otherwise the update is applied to authoritative state, versioned, and broadcast.

Owner-only actions (`owner:*`) additionally re-verify `senderId === room.ownerId` from the
server's own membership record, not from any client-supplied flag.

## 3. "Stop letting people use it" — safety guarantees

This was a specific requirement: the owner must be able to cut off access at will, with immediate,
reliable effect.

- **Kick one participant** — server finds that participant's live socket and closes it directly;
  they receive a `kicked` message first (for a clean UI message) and the socket is then terminated
  within ~1 second regardless of whether the client acknowledges.
- **Lock room** — sets `isLocked = true`; every non-owner's effective role becomes Viewer
  immediately (checked server-side per-message, so it takes effect on the very next action attempt,
  not just at next reconnect) and a `room:locked` broadcast updates every UI instantly.
- **End session** — sets `isEnded = true`, broadcasts `room:ended` to everyone, then closes every
  non-owner socket. A permanently-ended room cannot be rejoined; the join code stops working.
- Because enforcement is server-side and re-checked on every message (not just at connect time),
  there is no window where a client can "keep" access after being kicked/locked/ended by holding
  its existing connection open or replaying old client state.

## 4. Abuse / rate limiting

- Login and registration endpoints are rate-limited per IP to slow credential-stuffing/brute force.
- Room creation is rate-limited per user.
- WebSocket messages are rate-limited per connection (a connection sending far above normal
  interaction rates — e.g. a scripted flood — is throttled, then disconnected).
- Join codes are generated with sufficient entropy (cryptographically random, not sequential) so
  they cannot be guessed or enumerated.

## 5. Data protection

- Passwords are hashed with bcrypt; plaintext passwords are never stored or logged.
- JWTs are signed with a server-side secret (`JWT_SECRET` in `.env`, never committed — see
  `server/.env.example`), and expire.
- All traffic is served over HTTPS/WSS in any non-local deployment (local dev over plain HTTP/WS
  is fine on `localhost` only).
- The audit log (`AuditLogEntry`) gives the Owner a record of who joined, was kicked, or changed
  what, for accountability and dispute resolution.

## 6. Threat model notes (v1 scope)

In scope for v1 defenses: unauthorized room mutation by a non-Editor, unauthorized owner-action
by a non-Owner, brute-force login, join-code guessing, basic connection flooding.

Explicitly out of scope for v1 (documented, not silently ignored): DDoS-scale traffic mitigation
(would sit at the infrastructure/CDN layer in a real deployment, e.g. Cloudflare), and end-to-end
encryption of canvas content (the server, as the authoritative broadcaster, necessarily sees
plaintext content in v1's architecture).
