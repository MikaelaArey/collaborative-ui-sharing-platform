#!/usr/bin/env bash
# Gives the dev Electron.app its own distinct identity instead of the generic "Electron" /
# com.github.Electron shared by every unpackaged Electron project on the machine, then ad-hoc
# code-signs it. On recent macOS, TCC (Screen Recording / Accessibility permission prompts) is
# unreliable for that generic, unsigned identity — this is what actually makes the permission
# dialogs appear. See desktop/README.md's Troubleshooting section for the full story.
#
# Safe to re-run any time (e.g. after a fresh `npm install` recreates node_modules/electron).
set -euo pipefail

if [[ "$(uname)" != "Darwin" ]]; then
  echo "sign-macos-app: not on macOS, nothing to do."
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$SCRIPT_DIR/../../node_modules/electron/dist/Electron.app"

if [[ ! -d "$APP" ]]; then
  echo "sign-macos-app: $APP not found — run npm install first." >&2
  exit 1
fi

PLIST="$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.mikaelaarey.collabscreenshare.host" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleName ScreenShareHost" "$PLIST"
if ! /usr/libexec/PlistBuddy -c "Print :CFBundleDisplayName" "$PLIST" >/dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string 'Screen Share Host'" "$PLIST"
else
  /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName 'Screen Share Host'" "$PLIST"
fi

# Extended attributes left over from a manual `unzip` extraction (see README Troubleshooting)
# make codesign refuse to sign — strip them first.
xattr -cr "$APP"

codesign --force --deep --sign - "$APP"

echo "sign-macos-app: signed as $(codesign -dv "$APP" 2>&1 | grep Identifier)"
