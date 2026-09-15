# Data Model

Implemented as a Prisma schema at `server/prisma/schema.prisma`. Summarized here for reference.

## User
| Field         | Type      | Notes                          |
|---------------|-----------|---------------------------------|
| id            | string (cuid) | primary key                |
| email         | string    | unique                          |
| passwordHash  | string    | bcrypt hash                     |
| displayName   | string    |                                  |
| createdAt     | datetime  |                                  |

## Room
| Field         | Type      | Notes                                          |
|---------------|-----------|-------------------------------------------------|
| id            | string (cuid) | primary key                                |
| joinCode      | string    | unique, non-guessable, shareable               |
| name          | string    |                                                  |
| ownerId       | string    | FK → User                                       |
| defaultRole   | enum      | EDITOR \| VIEWER — role auto-assigned on join   |
| isLocked      | boolean   | forces all non-owners to VIEWER when true       |
| isEnded       | boolean   | room permanently closed                         |
| stateSnapshot | JSON      | last-persisted array of canvas elements         |
| createdAt     | datetime  |                                                  |

## Membership
| Field    | Type   | Notes                                  |
|----------|--------|------------------------------------------|
| id       | string | primary key                               |
| roomId   | string | FK → Room                                 |
| userId   | string | FK → User (nullable — guests have no User row, identified by a signed guest token instead) |
| role     | enum   | OWNER \| EDITOR \| VIEWER                 |
| joinedAt | datetime |                                          |

## AuditLogEntry
| Field     | Type     | Notes                                              |
|-----------|----------|-----------------------------------------------------|
| id        | string   | primary key                                         |
| roomId    | string   | FK → Room                                           |
| actorId   | string   | user id or guest label                              |
| action    | string   | e.g. `JOIN`, `KICK`, `LOCK`, `END`, `ELEMENT_UPDATE` |
| detail    | JSON     | action-specific payload                             |
| createdAt | datetime |                                                       |

## In-memory only (not persisted per-event, snapshotted periodically)
- Live canvas elements array (position, size, type, content, style, version, updatedBy).
- Connected participant list + live cursor positions.

Rationale for splitting persisted vs. in-memory state: cursors and every intermediate drag frame
are extremely high-frequency and have no long-term value, so persisting every one would be waste;
the canvas's *settled* state is snapshotted to `Room.stateSnapshot` so a room survives a server
restart, while high-frequency ephemeral events stay in memory only.
