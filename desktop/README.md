# Desktop app — Phase 2 (not yet built)

Per [`docs/07-roadmap.md`](../docs/07-roadmap.md), the desktop app is phase 2, planned as an
Electron wrapper around the existing `/client` React app, talking to the same `/server` backend
over the same HTTP/WebSocket protocol documented in
[`docs/06-api-and-protocol-spec.md`](../docs/06-api-and-protocol-spec.md).

Planned shape when built:
```
/desktop
  package.json       electron, electron-builder
  main.js            creates the BrowserWindow, loads the client build (or a configurable server URL)
  preload.js         minimal, no Node integration exposed to the page
```

No code here yet — intentionally left as a plan until phase 1 (web) is complete and stable.
