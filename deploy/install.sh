#!/usr/bin/env bash
#
# Installs Mailux as two systemd services (mailux-backend, mailux-frontend)
# on a Debian/Ubuntu host that already has Postfix + Dovecot configured
# (see docs/DEPLOYMENT.md). Run as root, from the repository root:
#
#   sudo ./deploy/install.sh
#
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root (it installs systemd units and creates system users)." >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="/opt/mailux"
CONFIG_DIR="/etc/mailux"
NODE_MAJOR_MIN=20

echo "==> Checking prerequisites"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found on PATH. Install Node.js ${NODE_MAJOR_MIN}+ first (e.g. via nodesource or nvm)." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if (( NODE_MAJOR < NODE_MAJOR_MIN )); then
  echo "Node.js ${NODE_MAJOR_MIN}+ is required, found $(node -v)." >&2
  exit 1
fi

echo "==> Creating an unprivileged user for the frontend (mailux-web)"
if ! id -u mailux-web >/dev/null 2>&1; then
  useradd --system --home-dir /opt/mailux/frontend --shell /usr/sbin/nologin mailux-web
fi

echo "==> Copying application into ${INSTALL_DIR}"
mkdir -p "${INSTALL_DIR}"
rsync -a --delete \
  --exclude 'node_modules' --exclude '.git' --exclude 'deploy' \
  "${REPO_DIR}/backend" "${REPO_DIR}/frontend" "${INSTALL_DIR}/"

echo "==> Installing backend dependencies and building"
pushd "${INSTALL_DIR}/backend" >/dev/null
npm ci
npm run build
popd >/dev/null

echo "==> Installing frontend dependencies and building"
pushd "${INSTALL_DIR}/frontend" >/dev/null
npm ci
npm run build
popd >/dev/null
chown -R mailux-web:mailux-web "${INSTALL_DIR}/frontend"

echo "==> Installing the PAM service file"
install -m 644 "${REPO_DIR}/backend/pam/mailux" /etc/pam.d/mailux

echo "==> Setting up ${CONFIG_DIR}"
mkdir -p "${CONFIG_DIR}"
if [[ ! -f "${CONFIG_DIR}/backend.env" ]]; then
  install -m 600 "${REPO_DIR}/deploy/mailux-backend.env.example" "${CONFIG_DIR}/backend.env"
  echo "    Created ${CONFIG_DIR}/backend.env from the example - edit it before starting the service."
fi

echo "==> Installing systemd units"
install -m 644 "${REPO_DIR}/deploy/systemd/mailux-backend.service" /etc/systemd/system/mailux-backend.service
install -m 644 "${REPO_DIR}/deploy/systemd/mailux-frontend.service" /etc/systemd/system/mailux-frontend.service
systemctl daemon-reload

echo
echo "Install complete. Next steps:"
echo "  1. Edit ${CONFIG_DIR}/backend.env with your mail server details."
echo "  2. sudo systemctl enable --now mailux-backend mailux-frontend"
echo "  3. journalctl -u mailux-backend -f   # watch it come up"
echo
echo "See docs/DEPLOYMENT.md for the full guide, including the Postfix/Dovecot setup."
