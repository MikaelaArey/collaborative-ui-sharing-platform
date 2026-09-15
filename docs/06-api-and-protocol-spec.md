# API & Realtime Protocol Spec

## 1. HTTP REST API

Base URL (local dev): `http://localhost:4000/api`

### `POST /auth/register`
Body: `{ email, password, displayName }` → `201 { token, user }`

### `POST /auth/login`
Body: `{ email, password }` → `200 { token, user }`

### `POST /rooms` (auth required)
Body: `{ name, defaultRole?: "EDITOR" | "VIEWER" }` → `201 { room }` (caller becomes Owner)

### `GET /rooms/mine` (auth required)
→ `200 { rooms: Room[] }` — rooms the caller owns or is a member of.

### `GET /rooms/:joinCode` (auth optional)
Public lookup used by the join screen to preview a room's name before connecting.
→ `200 { id, name, isLocked, isEnded }` or `404`.

All error responses: `{ error: string }` with an appropriate HTTP status (400/401/403/404/429).

## 2. WebSocket protocol

Connect: `ws(s)://<host>/ws/rooms/:joinCode`

First message the client must send:
```json
{ "type": "join", "token": "<jwt-or-null-for-guest>", "displayName": "optional for guests" }
```

Server replies:
```json
{
  "type": "joined",
  "you": { "id": "...", "role": "OWNER" | "EDITOR" | "VIEWER" },
  "room": { "id": "...", "name": "...", "isLocked": false },
  "elements": [ /* full current element list */ ],
  "participants": [ { "id": "...", "displayName": "...", "role": "..." } ]
}
```
or, on failure: `{ "type": "error", "reason": "ROOM_NOT_FOUND" | "ROOM_ENDED" | "UNAUTHORIZED" }`

### Client → Server messages
| type              | payload                                   | who         |
|-------------------|--------------------------------------------|-------------|
| `element:add`     | `{ element: {...} }`                      | Editor/Owner |
| `element:update`  | `{ id, patch: {...} }`                    | Editor/Owner |
| `element:delete`  | `{ id }`                                  | Editor/Owner |
| `cursor`          | `{ x, y }`                                | anyone       |
| `owner:setRole`   | `{ userId, role }`                        | Owner only   |
| `owner:kick`      | `{ userId }`                              | Owner only   |
| `owner:lock`      | `{ locked: boolean }`                     | Owner only   |
| `owner:end`       | `{}`                                      | Owner only   |

### Server → Client broadcasts
| type              | payload                                                     |
|-------------------|--------------------------------------------------------------|
| `element:added`   | `{ element }`                                                 |
| `element:updated` | `{ id, patch, version }`                                      |
| `element:deleted` | `{ id }`                                                       |
| `cursor:moved`     | `{ userId, x, y }`                                           |
| `participant:joined` / `participant:left` | `{ participant }` / `{ userId }`         |
| `role:changed`     | `{ userId, role }`                                            |
| `kicked`           | `{}` (sent only to the removed client, immediately before close) |
| `room:locked`      | `{ locked: boolean }`                                         |
| `room:ended`       | `{}` (sent to all, then all sockets closed)                   |
| `error`            | `{ reason: string }` (e.g. `FORBIDDEN` when a Viewer tries to mutate) |

Every rejected client request results in an `error` message back to that client only — state is
never silently dropped without feedback.
