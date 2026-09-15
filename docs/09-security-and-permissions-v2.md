# Security & Permissions — Remote Screen Control (addendum)

This extends [05-security-and-permissions.md](05-security-and-permissions.md) for the
screen-sharing/remote-control feature described in
[08-remote-screen-control.md](08-remote-screen-control.md). Read that document's role table first.

## 1. Why this feature is higher-risk than the original canvas editor, and how that's handled

Letting another person move your mouse and type on your keyboard is meaningfully more dangerous
than letting them edit a shared document. The design responds to that directly, not just with a
permissions table:

- **Consent is always active, never passive or implied.** The Host must explicitly launch the
  desktop app, explicitly choose what to share, and explicitly grant control to a specific named
  participant — there is no default-on control, no "auto-approve," and no way for a participant to
  request or take control without the Host granting it.
- **Exactly one Controller at a time**, chosen by the Host (see
  [08-remote-screen-control.md](08-remote-screen-control.md) §2). Revocable with one action.
- **A persistent, unmissable on-screen indicator** on the Host's machine whenever the session is
  live and whenever someone has control (`desktop` app renders an always-on-top banner — this is
  not just a dashboard toggle the Host has to remember to check).
- **Server-side enforcement of who the current Controller is**, exactly like every other permission
  in this system (see [05-security-and-permissions.md](05-security-and-permissions.md) §2) —
  `input:*` messages from anyone other than the currently-granted Controller are rejected before
  they ever reach the Host app, not filtered only in the UI.
- **The platform never attempts to bypass, auto-grant, or silently work around OS permission
  prompts** (macOS Accessibility / Screen Recording, and their Windows/Linux equivalents). If those
  permissions are not granted, screen capture and/or input injection simply do not function, and the
  app says so — it does not degrade into a stealthier mode.

## 2. OS permission model (macOS, primary dev target)

| Permission | Needed for | Granted via |
|---|---|---|
| Screen Recording | Capturing the screen/window to stream | System Settings → Privacy & Security → Screen Recording → enable for the Host app |
| Accessibility | Injecting mouse/keyboard events | System Settings → Privacy & Security → Accessibility → enable for the Host app |

Both are per-machine, user-granted, revocable at any time by the machine's own owner outside this
app entirely (which is the correct safety valve — the OS, not this app, has the final word on
whether input injection is allowed on that machine). The app detects missing permissions and shows
instructions rather than failing silently or attempting a workaround.

## 3. Threat model additions

In scope, defended against:
- A non-Controller participant sending `input:*` messages (rejected server-side; see §1).
- A kicked/removed participant continuing to send input (their connection is closed immediately,
  same mechanism as [05-security-and-permissions.md](05-security-and-permissions.md) §3).
- A participant guessing another room's join code to view or request control of a screen they
  weren't invited to (join codes are high-entropy and unguessable, per
  [05-security-and-permissions.md](05-security-and-permissions.md) §4).

Explicitly out of scope for v1, stated rather than ignored:
- Protecting the Host from *themselves* granting control to someone malicious — the platform
  enforces who the Host said can control the screen; it cannot evaluate whether that grant was wise.
  This is inherent to any remote-support tool and is mitigated by the always-visible indicator plus
  one-action revoke, not by the platform second-guessing the Host's choice.
- Protecting against a compromised Host machine (e.g., malware already running as the Host's user)
  — out of scope for a screen-sharing application, same as for TeamViewer/AnyDesk/etc.
- Recording/session-replay and its associated data-retention concerns — no session recording is
  implemented in v1.
