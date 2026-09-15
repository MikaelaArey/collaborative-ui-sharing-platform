# Product Vision — Collaborative UI Sharing Platform

**Author / Owner:** Mikaela Arey
**Document created:** 2026-09-15
**Revised:** 2026-09-15 — see [08-remote-screen-control.md](08-remote-screen-control.md) for the
pivot from a shared editing canvas to real host-screen sharing and remote control, made at the
owner's explicit direction. §5 below is updated to reflect it; it is kept (rather than silently
rewritten) so the record shows the product's actual evolution.
**Status:** Founding product definition — first written record for authorship/copyright purposes.

## 1. One-line description

A platform where one person (the **Host**) shares their live screen, and invited participants —
watching from an ordinary web browser — can be granted real-time control of the Host's mouse and
keyboard, with the Host able to revoke that access instantly at any time.

## 2. Problem

Today, when a group needs to work on the same interface (a form, a dashboard mockup, a lesson
screen, a business tool prototype), they either:

- Pass control back and forth one person at a time (screen share + "can you click that for me"), or
- Edit separate copies and manually reconcile differences afterward, or
- Use design tools (e.g. Figma) that only cover static mockups, not an interactive, *live*, running
  interface that everyone can actually operate together at the same time.

There is no lightweight, general-purpose tool for a *live, jointly-operated* interface session with
one clear owner who controls access.

## 3. Vision

Any group — a business team, a classroom, a pair of friends — should be able to:

1. Have one person start sharing their screen in seconds (running a small Host app).
2. Invite others with a link or code — they join from an ordinary browser, no install required.
3. Watch the Host's screen live, and — when the Host grants it — actually operate it: move the
   mouse, click, type, exactly as if sitting at that computer.
4. Have the Host restrict, hand off, revoke, or end access instantly, at any time.

## 4. Target users (v1)

- **General / open collaboration** — no login friction, quick ad-hoc sessions.
- **Education** — a teacher builds/annotates a screen with students, controlling who can edit vs.
  only watch, and can revoke access at the end of class.
- **Business teams** — reviewing or jointly building an internal tool mockup / prototype without
  passing screen control back and forth.

## 5. What v1 is NOT (superseded 2026-09-15 — see revision note above)

*Original v1 scoping, kept for the record:* the first cut of this product was a shared editing
*canvas* (widgets everyone could add/move/edit together), explicitly **not** real OS-level screen
sharing or remote input control, on the reasoning that remote control is a different, higher-risk
product. The owner subsequently asked directly for real host-screen sharing with remote control,
overriding that scoping decision. The product is now that: see
[08-remote-screen-control.md](08-remote-screen-control.md) for the current architecture. The
original canvas-editing code remains in the repo (`client/src/canvas/`) but is no longer the
primary product surface.

Current (v1.1) non-goals, carried forward for the same reasons as before:
- Attempt full character-by-character conflict-free merging (CRDT) anywhere in the product. Not
  applicable to screen sharing in the same way, and was already deferred for the canvas editor —
  see [03-architecture.md](03-architecture.md) §3.3.
- Silent, covert, or permission-bypassing operation on the Host's machine. The Host always sees a
  persistent on-screen indicator while sharing/being controlled, must explicitly grant the OS-level
  Accessibility/Screen-Recording permissions the platform needs (macOS) — the platform never
  attempts to auto-grant or work around these — and can revoke control or end the session with one
  action at any time. See [09-security-and-permissions-v2.md](09-security-and-permissions-v2.md).

## 6. Core differentiators

- **Real remote control, not just viewing** — an authorized participant's mouse/keyboard input
  actually drives the Host's operating system, not a copy or simulation of it.
- **Host-first safety model** — the Host can lock the room to view-only, grant/revoke the single
  active controller, remove any participant, or end the session entirely, at any time, with
  immediate effect, and always sees a persistent on-screen indicator of who (if anyone) is in
  control.
- **General-purpose** — not locked to one vertical; the same primitive (a shared live controllable
  screen) serves business, education, and casual use.

## 7. Ownership / authorship note

This document, and all documents, source code, and design artifacts in this repository, are
original work authored beginning 2026-09-15 by Mikaela Arey, for the purpose of establishing a
dated record of authorship. See [LICENSE](../LICENSE) for the copyright notice.
