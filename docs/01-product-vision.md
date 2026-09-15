# Product Vision — Collaborative UI Sharing Platform

**Author / Owner:** Mikaela Arey
**Document created:** 2026-09-15
**Status:** Founding product definition — first written record for authorship/copyright purposes.

## 1. One-line description

A web platform where multiple people can simultaneously view, control, and edit a single shared
user interface in real time — the way Google Docs lets many people edit one document at once, but
for interactive interfaces instead of text.

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

1. Create a shared interface ("room") in seconds.
2. Invite others with a link or code.
3. See everyone's cursors and edits live, on the same interface, at the same time.
4. Have one clear owner who can restrict, pause, or end access to the room instantly.

## 4. Target users (v1)

- **General / open collaboration** — no login friction, quick ad-hoc sessions.
- **Education** — a teacher builds/annotates a screen with students, controlling who can edit vs.
  only watch, and can revoke access at the end of class.
- **Business teams** — reviewing or jointly building an internal tool mockup / prototype without
  passing screen control back and forth.

## 5. What v1 is NOT

To keep the first version buildable and legally/technically sound, v1 explicitly does **not**:

- Remote-control arbitrary third-party desktop applications or take over someone's OS-level screen
  (that is a different product — closer to remote-access software — with a much larger security
  surface). Instead, the platform *is* the interface: elements live inside our canvas, and everyone
  interacts with that same canvas live.
- Attempt full character-by-character conflict-free merging (CRDT) on every field on day one. v1
  uses an authoritative server + last-write-wins per element, documented in
  [03-architecture.md](03-architecture.md). CRDT-based merging is a scoped phase-2 upgrade.
- Ship a native desktop app in v1. The web app is the foundation; a desktop wrapper (Electron) is
  phase 2, reusing the same client and backend.

## 6. Core differentiators

- **Instant, live, multi-user control of one interface** — not turn-based, not "my copy vs. your
  copy."
- **Owner-first safety model** — the creator of a room can lock it to view-only, remove any
  individual participant, or end the session entirely, at any time, with immediate effect for
  everyone connected.
- **General-purpose** — not locked to one vertical; same primitive (a shared live UI canvas) serves
  business, education, and casual use.

## 7. Ownership / authorship note

This document, and all documents, source code, and design artifacts in this repository, are
original work authored beginning 2026-09-15 by Mikaela Arey, for the purpose of establishing a
dated record of authorship. See [LICENSE](../LICENSE) for the copyright notice.
