#!/usr/bin/env bash
#
# Updates an existing Mailux install in place: pulls the latest commits
# (if this checkout is a clean git repo), rebuilds backend + frontend, and
# restarts both systemd services. Use this after a `git pull` instead of
# re-running install.sh - install.sh also recreates the mailux-web system
# user and would overwrite /etc/mailux/backend.env if it didn't already
# exist-check first, which is more than an update needs to touch.
#
# Run as root, from the repository root:
#
#   sudo ./deploy/reinstall.sh
#
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root." >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="/opt/mailux"
CONFIG_DIR="/etc/mailux"

if [[ ! -d "${INSTALL_DIR}/backend" || ! -f "${CONFIG_DIR}/backend.env" ]]; then
  echo "No existing installation found at ${INSTALL_DIR} (or ${CONFIG_DIR}/backend.env is missing)." >&2
  echo "Run ./deploy/install.sh first." >&2
  exit 1
fi

# Same native-addon prerequisite as install.sh - a missing header here
# fails npm ci below with an unhelpful node-gyp compiler error.
if [[ ! -f /usr/include/security/pam_appl.h ]]; then
  echo "==> Installing PAM development headers (libpam0g-dev)"
  apt-get update && apt-get install -y libpam0g-dev build-essential python3
fi

if [[ -d "${REPO_DIR}/.git" ]]; then
  if [[ -n "$(git -C "${REPO_DIR}" status --porcelain)" ]]; then
    echo "==> ${REPO_DIR} has local changes - not pulling. Update it yourself, then re-run this script." >&2
  else
    echo "==> Pulling latest changes"
    git -C "${REPO_DIR}" pull --ff-only
  fi
else
  echo "==> ${REPO_DIR} is not a git checkout - skipping pull, using the files on disk as-is"
fi

echo "==> Stopping services"
systemctl stop mailux-frontend mailux-backend 2>/dev/null || true

echo "==> Syncing application into ${INSTALL_DIR}"
rsync -a --delete \
  --exclude 'node_modules' --exclude '.git' --exclude 'deploy' \
  "${REPO_DIR}/backend" "${REPO_DIR}/frontend" "${INSTALL_DIR}/"

echo "==> Rebuilding backend"
pushd "${INSTALL_DIR}/backend" >/dev/null
npm ci
npm run build
popd >/dev/null

echo "==> Rebuilding frontend"
pushd "${INSTALL_DIR}/frontend" >/dev/null
npm ci
npm run build
popd >/dev/null
chown -R mailux-web:mailux-web "${INSTALL_DIR}/frontend"

echo "==> Refreshing the PAM service file"
# Re-copied on every reinstall, not just the first one - this is the exact
# file that silently broke every login for months after being committed
# with CRLF line endings, because nothing ever re-copied it afterwards.
# A reinstall should never leave a stale or hand-patched copy in place.
install -m 644 "${REPO_DIR}/backend/pam/mailux" /etc/pam.d/mailux

echo "==> Reloading and starting services"
systemctl daemon-reload
systemctl start mailux-backend mailux-frontend

echo
echo "Reinstall complete."
systemctl --no-pager --lines=0 status mailux-backend mailux-frontend || true
echo
echo "Watch logs with: journalctl -u mailux-backend -f"
