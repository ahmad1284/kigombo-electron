#!/usr/bin/env bash
#
# Builds Kigombo and installs it as a desktop app for the current user:
# an AppImage in ~/Applications, an icon, and a menu entry. No root needed.
#
set -euo pipefail

cd "$(dirname "$0")/.."

APP_DIR="${HOME}/Applications"
DESKTOP_DIR="${HOME}/.local/share/applications"
ICON_DIR="${HOME}/.local/share/icons/hicolor/512x512/apps"
TARGET="${APP_DIR}/Kigombo.AppImage"

if [ ! -d node_modules ]; then
  echo "==> Installing dependencies"
  npm install
fi

echo "==> Building AppImage"
npm run package

BUILT=$(ls -t dist/Kigombo-*.AppImage | head -1)
if [ -z "${BUILT}" ]; then
  echo "Build produced no AppImage in dist/." >&2
  exit 1
fi

echo "==> Installing to ${TARGET}"
mkdir -p "${APP_DIR}" "${DESKTOP_DIR}" "${ICON_DIR}"
cp "${BUILT}" "${TARGET}"
chmod +x "${TARGET}"
cp build/icon.png "${ICON_DIR}/kigombo.png"

cat > "${DESKTOP_DIR}/kigombo.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Kigombo
GenericName=Cash Ledger
Comment=Personal cash ledger — money in, money out
Exec=${TARGET} %U
Icon=kigombo
Terminal=false
Categories=Office;Finance;
Keywords=finance;money;budget;ledger;expenses;
StartupWMClass=Kigombo
EOF
chmod +x "${DESKTOP_DIR}/kigombo.desktop"

command -v update-desktop-database >/dev/null && update-desktop-database "${DESKTOP_DIR}" || true
command -v gtk-update-icon-cache >/dev/null &&
  gtk-update-icon-cache -f -t "${HOME}/.local/share/icons/hicolor" >/dev/null 2>&1 || true

echo
echo "Installed. Look for Kigombo in your app menu, or double-click ${TARGET}."
