#!/usr/bin/env bash
#
# Stops and removes the Mailux systemd services and installed application
# files. Does NOT remove mail user accounts, Maildirs, or /etc/mailux
# (which holds your configuration) - remove those manually if you really
# want a clean slate.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root." >&2
  exit 1
fi

echo "==> Stopping and disabling services"
systemctl disable --now mailux-backend mailux-frontend 2>/dev/null || true

echo "==> Removing systemd units"
rm -f /etc/systemd/system/mailux-backend.service /etc/systemd/system/mailux-frontend.service
systemctl daemon-reload

echo "==> Removing application files (/opt/mailux)"
rm -rf /opt/mailux

echo
echo "Done. Left untouched: /etc/mailux (config), /etc/pam.d/mailux, mail user accounts and Maildirs."
