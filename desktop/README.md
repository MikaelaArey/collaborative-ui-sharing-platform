# Host desktop app

This is what the **Host** (the person whose screen gets shared and controlled) runs. Viewers and
Controllers don't need this — they use an ordinary web browser. See
[docs/08-remote-screen-control.md](../docs/08-remote-screen-control.md) for why a native app is
required at all: a browser cannot inject OS-level input, so real remote control needs this.

It's an Electron app that loads the same web client (`/client`) in a window, and adds two native
capabilities via a narrow IPC bridge (`src/preload.ts` / `src/main.ts`):
screen capture (`desktopCapturer`) and input injection (`@nut-tree-fork/nut-js`).

## Setup

```bash
cd desktop
npm install
npm run rebuild-native   # rebuilds nut-js's native module against Electron's Node ABI
```

`@nut-tree-fork/nut-js` ships prebuilt binaries for common platforms, but they're built against a
plain Node.js ABI, not Electron's — `rebuild-native` (wrapping `@electron/rebuild`) recompiles it
against the exact Electron version in this project so the native module actually loads inside the
Electron process. Re-run it whenever you bump the `electron` version in `package.json`.

## Running it

You need the server and client dev servers running too (see the root [README](../README.md)):

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev

# terminal 3
cd desktop && npm start
```

`npm start` builds the TypeScript main/preload files and launches Electron, which loads
`http://localhost:5173` (override with the `HOST_CLIENT_URL` env var, e.g. to point at a deployed
client instead of a local dev server).

## Using it

1. In the Electron window, register/log in and create a room, exactly like in the browser.
2. Click **Start sharing screen** in the Host controls panel. The first time, macOS will prompt
   for **Screen Recording** permission — grant it in System Settings and restart the app (macOS
   requires an app restart after granting this one). The app also checks and links directly to
   this setting if it's missing.
3. Choose the screen or window to share from the picker.
4. Share the room's join link (shown in the browser client, or copy the join code from the
   header) with participants — they open it in their own browser.
5. When a participant clicks **Request control**, they show up under "Requesting control" in the
   Host panel — click **Grant** to hand them the mouse/keyboard. **Accessibility** permission is
   required the first time control is actually used; the app checks for it and links to the
   setting if missing.
6. **Revoke control**, **Lock room**, **Kick**, or **End session** at any time from the same panel
   — all take effect immediately, per
   [docs/09-security-and-permissions-v2.md](../docs/09-security-and-permissions-v2.md).

## Known limitation

Input coordinates are mapped against the **primary display**. Sharing your entire primary screen
(the default/recommended choice) works correctly for both viewing and control. Sharing a single
window or a secondary monitor still works for *viewing*, but a granted Controller's clicks may not
land in the right place — see
[docs/08-remote-screen-control.md](../docs/08-remote-screen-control.md) §6.

## Troubleshooting

**`Error: Electron failed to install correctly` (or `node_modules/electron/dist` is only a few
hundred KB instead of ~200+MB).** Electron's own installer unzips its ~100MB binary using the
`extract-zip`/`yauzl` npm packages, which have a silent-failure bug on very new Node.js versions
(reproduced here on Node v26.5.1) — the promise just never resolves, leaving a near-empty `dist/`
with no error. The download itself is fine (it's cached at
`~/Library/Caches/electron/<hash>/electron-vX.X.X-darwin-<arch>.zip`); only the JS extraction step
is broken. Fix by extracting it with the system's `unzip` instead:

```bash
cd "path/to/repo"
rm -rf node_modules/electron/dist node_modules/electron/path.txt
mkdir -p node_modules/electron/dist
unzip -q ~/Library/Caches/electron/*/electron-v*-darwin-*.zip -d node_modules/electron/dist
printf '%s' "Electron.app/Contents/MacOS/Electron" > node_modules/electron/path.txt   # no trailing newline
```
(On Linux/Windows, adjust the `path.txt` contents to `electron` / `electron.exe` respectively —
see `node_modules/electron/install.js`'s `getPlatformPath()`.) Verify with
`node -e "console.log(require('electron'))"` — it should print the binary path, not throw.

**Electron launches but immediately errors with something like
`Cannot read properties of undefined (reading 'whenReady')`, or `electron --version` prints a
plain Node version instead of the Electron version.** The `ELECTRON_RUN_AS_NODE` environment
variable is set, which forces the Electron binary to behave as a plain Node.js interpreter instead
of launching as a GUI app — so `require('electron')` returns a path string instead of the real API,
and `app` is `undefined`. This is a well-known side effect of **VS Code's integrated terminal**,
which is itself an Electron app and leaks this variable into terminals it opens. `npm start` in
this project already works around it (`env -u ELECTRON_RUN_AS_NODE electron .`), but if you're
invoking `electron` directly for debugging, either prefix the command the same way or just run it
from a plain Terminal.app window instead of VS Code's built-in terminal.
