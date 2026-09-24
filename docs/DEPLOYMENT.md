# Deployment guide

Mailux is a thin web UI + API in front of a **Postfix** (SMTP) + **Dovecot**
(IMAP/LMTP) mail server, with Linux system accounts as mailboxes. This guide
walks through a from-scratch setup on Ubuntu/Debian: the mail server itself,
then Mailux on top of it via systemd.

If you already run Postfix + Dovecot, skip to
[Installing Mailux](#installing-mailux).

## Contents

- [Architecture](#architecture)
- [Ports](#ports)
- [DNS](#dns)
- [Postfix + Dovecot setup](#postfix--dovecot-setup)
- [TLS](#tls)
- [DKIM, SPF, DMARC](#dkim-spf-dmarc)
- [Installing Mailux](#installing-mailux)
- [Reverse proxy / HTTPS for the web UI](#reverse-proxy--https-for-the-web-ui)
- [Operating it](#operating-it)
- [Troubleshooting](#troubleshooting)
- [Security checklist](#security-checklist)

## Architecture

- **Postfix** - SMTP inbound (25), submission (587)
- **Dovecot** - IMAP (993) + LMTP delivery from Postfix into Maildir
- **Maildir per user** - `/home/<user>/Maildir` for existing system users,
  `/mailuser/<user>/Maildir` for mailboxes Mailux creates itself
- **Mailux backend** - Node/Express API, root, port 5000 (localhost only)
- **Mailux frontend** - static build served by `serve`, unprivileged, port
  4173
- Recommended: a reverse proxy (nginx, Caddy, Nginx Proxy Manager, ...) in
  front of both for TLS termination

## Ports

Public:

| Port | Service              |
| ---- | --------------------- |
| 25   | SMTP inbound (Postfix) |
| 587  | Submission (Postfix), for sending clients |
| 993  | IMAPS (Dovecot) |
| 80/443 | Reverse proxy for the web UI (optional but recommended) |

**Keep 5000 (backend) and 4173 (frontend) bound to `127.0.0.1`** and reach
them only through the reverse proxy.

## DNS

Example for a domain `example.com`:

- `A` record: `mail.example.com -> <SERVER_IP>`
- `MX` record: `example.com -> mail.example.com` (priority 10)
- `TXT` SPF: `v=spf1 ip4:<SERVER_IP> mx a -all`
- `TXT` DMARC (`_dmarc.example.com`): `v=DMARC1; p=none; rua=mailto:postmaster@example.com`
- `TXT` DKIM (`<selector>._domainkey.example.com`): your DKIM public key

Reverse DNS (PTR) for your server's IP matters for deliverability too - set
it with your hosting provider.

## Postfix + Dovecot setup

Run everything below as root.

```bash
apt update
apt install -y postfix postfix-pcre \
  dovecot-imapd dovecot-lmtpd dovecot-core dovecot-sieve \
  openssl \
  libpam0g-dev build-essential python3
```

The last line isn't for mail delivery - it's what lets `npm ci` compile
`authenticate-pam` (the native addon the backend logs in through). Without
`libpam0g-dev` the build fails on a missing `security/pam_appl.h`, and
`install.sh`/`reinstall.sh` also check for it before building.

During the Postfix install, choose "Internet Site" and set the system mail
name to your mail hostname (e.g. `mail.example.com`).

### Postfix: `/etc/postfix/main.cf`

```cf
myhostname = mail.example.com
mydomain = example.com
myorigin = $mydomain

inet_interfaces = all
inet_protocols = all

mydestination = $myhostname, $mydomain, localhost.localdomain, localhost
```

Deliver via Dovecot's LMTP socket (use the **relative** path if Postfix
runs chrooted):

```cf
mailbox_transport = lmtp:unix:private/dovecot-lmtp
local_transport   = lmtp:unix:private/dovecot-lmtp
virtual_transport = lmtp:unix:private/dovecot-lmtp
```

### Postfix: enable submission (587) in `/etc/postfix/master.cf`

Uncomment the `submission` block and set:

```cf
submission inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_client_restrictions=permit_sasl_authenticated,reject
  -o smtpd_sender_restrictions=permit_sasl_authenticated,reject
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
```

### Postfix: SASL auth via Dovecot

In `/etc/postfix/main.cf`:

```cf
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_auth_enable = yes
smtpd_sasl_security_options = noanonymous
broken_sasl_auth_clients = yes
```

### Dovecot: protocols and Maildir location

`/etc/dovecot/dovecot.conf`:

```conf
protocols = imap lmtp
```

`/etc/dovecot/conf.d/10-mail.conf`:

```conf
mail_location = maildir:~/Maildir
```

### Dovecot: strip the domain from logins (`auth_username_format`)

Without this, Dovecot passes whatever login string it was given straight
to the system `passwd`/PAM lookup - fine for Mailux's own web UI, which
always authenticates with the bare system username (`info`), but not for
anything that logs in or gets addressed with a full email address
(`info@example.com`):

- LMTP delivery always addresses the recipient as a full email address
  (that's just how SMTP/LMTP works) - without this setting, every
  delivery to every mailbox fails with `550 5.1.1 User doesn't exist:
  info@example.com`, since there's no literal system user by that name.
  This silently breaks *all* mail delivery through Dovecot LMTP, not just
  forwarding/the autoresponder - the account's Maildir simply never
  receives anything.
- Any real mail client (Thunderbird, Outlook, a phone's mail app, ...)
  conventionally logs into IMAP/SMTP with the full email address as the
  username, not the bare system name - without this, none of them can
  authenticate, even though Mailux's own web UI works fine.

`/etc/dovecot/conf.d/10-auth.conf`:

```conf
auth_username_format = %n
```

`%n` is the login's "user" part only, with any `@domain` stripped -
`info@example.com` becomes `info` before it ever reaches PAM/passwd, the
same way Mailux's own login already works. Restart Dovecot after adding
this (see "Restart everything, then verify" further down).

### Dovecot: Sieve (server-side forwarding + autoresponder)

Mailux's "Weiterleitung" and "Autoresponder" account settings work by
writing a `~/.dovecot.sieve` script per user, run by Dovecot's LMTP
delivery via the Pigeonhole Sieve plugin (`dovecot-sieve`, installed
above). This matters specifically because `local_transport` above points
at Dovecot LMTP, not Postfix's own `local(8)` - so a classic `~/.forward`
file (the local(8) convention) is never consulted here, and Sieve is the
correct hook for this deployment.

`/etc/dovecot/conf.d/20-lmtp.conf`:

```conf
protocol lmtp {
  mail_plugins = $mail_plugins sieve
}
```

`/etc/dovecot/conf.d/90-sieve.conf` (create it if it doesn't exist yet):

```conf
plugin {
  sieve = ~/.dovecot.sieve
}
```

Dovecot recompiles a changed `.dovecot.sieve` automatically on the next
delivery - no extra step needed after Mailux writes one.

Mailux itself also checks each script it writes with `sievec` (the
`dovecot-sieve` package's own compiler) right after writing it, and if
that fails, reports the compiler's error back on the settings page
instead of the change silently doing nothing. If `sievec` isn't on the
backend's `PATH` (it checks `sievec`, `/usr/bin/sievec` and
`/usr/lib/dovecot/sievec`), this check is skipped rather than treated as
an error - so on an unusual install, a broken script can still go
unnoticed by Mailux itself.

**Troubleshooting "forwarding/autoresponder doesn't do anything":**

- Confirm the two config snippets above are actually *active*, not just
  saved to disk (a config edit does nothing until Dovecot is restarted -
  see "Restart everything, then verify" below):

  ```bash
  doveconf -f protocol=lmtp -h mail_plugins   # must list "sieve"
  doveconf -h plugin/sieve                    # must print a path, e.g. ~/.dovecot.sieve
  ```

  Use `plugin/sieve`, not a bare `-h sieve` - on at least some Dovecot
  versions the bare form prints nothing even when `plugin { sieve = ... }`
  is set correctly, which reads as "not configured" when it actually is.
  Mailux's own check (further down) makes the same `plugin/sieve` query.
- Check `~<username>/.dovecot.sieve` on the server directly, and try
  `sievec ~<username>/.dovecot.sieve` by hand - a compile error there is
  also what Mailux's own check (above) would have reported back in the
  UI, if `sievec` was reachable when it saved.
- Check the mail logs (`journalctl -u dovecot` or
  `/var/log/mail.log`, depending on distro) for `sieve:` lines around the
  time a test message was sent - Dovecot logs script errors there even
  when nothing surfaces anywhere else.
- The `vacation` action only replies to a message that looks addressed
  directly to the user (RFC 5230) - it silently skips anything that looks
  like a mailing list post or has `Auto-Submitted` set, and replies to
  the same sender at most once a day by design, not a bug.
- If mail to the account doesn't arrive *at all* (bounces with `550 5.1.1
  User doesn't exist: <account>@yourdomain` in `/var/log/mail.log`, not
  just a missing autoresponder), that's `auth_username_format` missing -
  see "Dovecot: strip the domain from logins" above. It's listed
  separately from the Sieve config because it breaks *all* delivery
  through Dovecot LMTP, not specifically forwarding/the autoresponder,
  but its symptom (mail just never shows up) looks identical from Mailux's
  side, so it's worth ruling out first.

### Dovecot: auth + LMTP sockets for Postfix

`/etc/dovecot/conf.d/10-master.conf`:

```conf
service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}

service lmtp {
  unix_listener /var/spool/postfix/private/dovecot-lmtp {
    mode = 0660
    user = postfix
    group = postfix
  }
}
```

## TLS

### Dovecot (`/etc/dovecot/conf.d/10-ssl.conf`)

```conf
ssl = required
ssl_cert = </etc/letsencrypt/live/mail.example.com/fullchain.pem
ssl_key  = </etc/letsencrypt/live/mail.example.com/privkey.pem
```

### Postfix (`/etc/postfix/main.cf`)

```cf
smtpd_tls_cert_file=/etc/letsencrypt/live/mail.example.com/fullchain.pem
smtpd_tls_key_file=/etc/letsencrypt/live/mail.example.com/privkey.pem
smtpd_tls_security_level=may

smtp_tls_security_level=may
smtp_tls_loglevel = 1
```

Get certificates with `certbot` (webroot or DNS challenge, whichever suits
your setup).

## DKIM, SPF, DMARC

```bash
apt install -y opendkim opendkim-tools

mkdir -p /etc/opendkim/keys/example.com
cd /etc/opendkim/keys/example.com
opendkim-genkey -s mail -d example.com
chown opendkim:opendkim mail.private
chmod 600 mail.private
```

`/etc/opendkim/KeyTable`:

```
mail._domainkey.example.com example.com:mail:/etc/opendkim/keys/example.com/mail.private
```

`/etc/opendkim/SigningTable`:

```
*@example.com mail._domainkey.example.com
```

`/etc/opendkim/TrustedHosts`:

```
127.0.0.1
localhost
mail.example.com
example.com
```

Hook Postfix up to OpenDKIM as a milter, in `/etc/postfix/main.cf`:

```cf
milter_default_action = accept
milter_protocol = 6
smtpd_milters = unix:/opendkim/opendkim.sock
non_smtpd_milters = $smtpd_milters
```

The socket path depends on your OpenDKIM config - check `Socket` in
`/etc/opendkim.conf` (often `/run/opendkim/opendkim.sock`).

Publish the DKIM public key as a DNS TXT record - it's printed to
`/etc/opendkim/keys/example.com/mail.txt`. SPF/DMARC go in DNS as shown
above.

### Restart everything, then verify

None of the config edits above take effect until the services that read
them are restarted - this step is easy to skip because nothing errors if
you don't, it just quietly keeps running on the old config. Do this now,
before moving on to installing Mailux itself, rather than discovering
later that forwarding/the autoresponder "just don't work":

```bash
systemctl restart postfix dovecot opendkim
```

Then confirm Dovecot is actually going to deliver mail over LMTP with
Sieve active - the exact two things Mailux's own settings page checks
when you save forwarding/an autoresponder, so getting a clean result here
means that feature will work on the first try instead of needing to be
debugged after the fact:

```bash
postconf local_transport                    # lmtp:unix:private/dovecot-lmtp
doveconf -f protocol=lmtp -h mail_plugins    # must list "sieve"
doveconf -h plugin/sieve                     # must print a path, e.g. ~/.dovecot.sieve
doveconf -h auth_username_format             # must be "%n", not empty/"%Lu"
```

If any of these four don't look right, fix that now (re-check the
matching config file above, and restart again) rather than continuing on
to install Mailux - it'll work identically either way, but you'll spend
a lot less time debugging "it's not working" against a fully installed
app than against four config files you just edited. A missing
`auth_username_format` in particular won't show up as an error anywhere
in this checklist failing - it only surfaces once real mail tries to
deliver, as a `550 5.1.1 User doesn't exist: <account>@yourdomain` bounce
that has nothing obviously to do with its actual cause.

## Installing Mailux

```bash
git clone https://github.com/JadnK/Mailux.git /opt/mailux-src
cd /opt/mailux-src
sudo ./deploy/install.sh
```

The script:

1. checks for Node.js 20+;
2. creates an unprivileged `mailux-web` system user for the frontend;
3. copies `backend/` and `frontend/` into `/opt/mailux/`;
4. installs dependencies and builds both;
5. installs `backend/pam/mailux` to `/etc/pam.d/mailux`;
6. creates `/etc/mailux/backend.env` from the example, if it doesn't exist;
7. installs and reloads the two systemd units in `deploy/systemd/`.

Then:

```bash
sudoedit /etc/mailux/backend.env    # set MAIL_HOST, MAIL_HOST_IMAP, CORS_ORIGIN, ...
sudo systemctl enable --now mailux-backend mailux-frontend
journalctl -u mailux-backend -f
```

See [`docs/SECURITY.md`](SECURITY.md) for why the backend service runs as
root while the frontend does not.

### Updating

```bash
cd /opt/mailux-src
sudo ./deploy/reinstall.sh
```

`reinstall.sh` pulls the latest commit (if the checkout is clean),
re-syncs `backend/` and `frontend/` into `/opt/mailux`, rebuilds both,
re-copies `backend/pam/mailux` to `/etc/pam.d/mailux`, and restarts both
services. Unlike re-running `install.sh`, it doesn't touch the
`mailux-web` system user or `/etc/mailux/backend.env`, and it fails
loudly instead of doing a first install if `/opt/mailux` doesn't exist
yet.

## Reverse proxy / HTTPS for the web UI

The frontend talks to the backend over a **relative** path (`/api/...`),
not a hardcoded host - see [`frontend/src/api/mailClient.ts`](../frontend/src/api/mailClient.ts).
That's what makes Mailux work when you open it from any machine over the
web, not just from the server itself - but it also means the frontend and
backend **must be served from the same origin** (same domain, from the
browser's point of view). A reverse proxy is what makes that true: it puts
the static frontend (port 4173) and the API (port 5000, which already
mounts all of its routes under `/api` - see `backend/src/app.ts`) behind
one public hostname.

> If you skip this and open the frontend without a proxy in front of it (or
> point it straight at a different host/port than the backend), login will
> fail - the browser tries to reach `/api/login` on whatever origin served
> the page, and nothing is listening there. This is the exact issue behind
> the old hardcoded `http://localhost:5000/api` default, which only ever
> worked when the browser and backend were on the same machine.

### Option A: Nginx Proxy Manager

1. **Proxy Host** for your domain (e.g. `mail.example.com`):
   - Scheme `http`, Forward Hostname/IP `127.0.0.1`, Forward Port `4173`
     (the frontend)
   - SSL tab: request a Let's Encrypt certificate, enable **Force SSL** and
     **HTTP/2 Support**
2. On that same Proxy Host, open **Custom Locations** and add one:
   - Location: `/api`
   - Scheme `http`, Forward Hostname/IP `127.0.0.1`, Forward Port `5000`
     (the backend)
   - Don't add anything after the port and don't enable a "strip prefix"
     option - Nginx Proxy Manager forwards the full request path (including
     `/api`) to the backend unchanged, and the backend already expects
     requests under `/api` (it mounts its own routes there), so no
     rewriting is needed on either side.
3. Save. `https://mail.example.com/` now serves the frontend, and
   `https://mail.example.com/api/...` is proxied straight to the backend -
   exactly what `mailClient.ts`'s relative `/api` base URL expects.

`CORS_ORIGIN` in `/etc/mailux/backend.env` doesn't matter for this setup -
the browser only ever talks to one origin, so no CORS headers are needed at
all.

### Option B: plain nginx

```nginx
server {
    listen 443 ssl http2;
    server_name mail.example.com;

    ssl_certificate     /etc/letsencrypt/live/mail.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mail.example.com/privkey.pem;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:4173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

server {
    listen 80;
    server_name mail.example.com;
    return 301 https://$host$request_uri;
}
```

Note there is **no path after the port** in `proxy_pass http://127.0.0.1:5000;`.
That's deliberate: with no URI part, nginx forwards the request path
unchanged, so `/api/login` reaches the backend as `/api/login`. Writing
`proxy_pass http://127.0.0.1:5000/;` (trailing slash) would strip the
`/api` prefix and break every request.

### Option C: Caddy

```
mail.example.com {
    handle /api/* {
        reverse_proxy 127.0.0.1:5000
    }
    handle {
        reverse_proxy 127.0.0.1:4173
    }
}
```

Caddy provisions the Let's Encrypt certificate automatically.

### Running frontend and backend on different origins (not recommended)

If you really don't want a reverse proxy in front of both, you can serve
the frontend and backend from different hosts/ports. Set
`VITE_API_BASE_URL` to the backend's full URL (e.g.
`https://api.example.com`) at frontend **build** time, and set
`CORS_ORIGIN` in the backend's env to the frontend's exact origin. This
works, but you now have two origins, a manual CORS allowlist, and two
certificates to keep in sync - the same-origin reverse proxy setup above is
simpler and is what the rest of this guide assumes.

## Operating it

```bash
systemctl status mailux-backend mailux-frontend --no-pager
journalctl -u mailux-backend -f
journalctl -u mailux-frontend -f

systemctl restart postfix dovecot mailux-backend mailux-frontend
```

Mail queue:

```bash
postqueue -p
postqueue -f
```

## Troubleshooting

**Login works on `localhost` but fails ("Failed to fetch" / network error)
over the web**
The frontend and backend aren't being served from the same origin. See
[Reverse proxy / HTTPS for the web UI](#reverse-proxy--https-for-the-web-ui)
above - you need a proxy that serves the frontend at `/` and the backend at
`/api` under one hostname, unless you've deliberately set
`VITE_API_BASE_URL` and `CORS_ORIGIN` for a cross-origin setup.

**"Authentication failed" logging into Mailux**
Confirm PAM sees the account: `doveadm auth test <user> '<password>'`.
Check `journalctl -u mailux-backend` for the underlying PAM error.

**Mail arrives at Postfix but Maildir stays empty**
Check the queue (`postqueue -p`) and that the LMTP socket exists:
`ls -la /var/spool/postfix/private | grep dovecot-lmtp`. Remember the LMTP
transport path in `main.cf` usually needs to be **relative**
(`lmtp:unix:private/dovecot-lmtp`), not absolute, under a chrooted Postfix.

**Some mailboxes show new mail immediately, others don't**
Mailux has no fixed limit on how many messages it lists (it fetches
everything IMAP's `SEARCH ALL` returns for the open folder, every time)
and no background polling - a folder only reloads when you switch to it,
open it, or press the refresh button, so the most common cause is simply
that: reload the folder (or log out/in) before assuming mail is missing.
If a specific account's folder still doesn't pick up mail you can confirm
arrived (check `journalctl -u dovecot` or the Maildir's `new/` directory
on the server directly), that account's Dovecot index is the next thing
to check, not Mailux - rebuild it with
`doveadm force-resync -u <user> INBOX`, which is safe to run any time.

**TLS "self-signed certificate" errors**
Verify Postfix/Dovecot point at real, current Let's Encrypt certs:

```bash
openssl s_client -starttls smtp -connect mail.example.com:587 -servername mail.example.com
openssl s_client -connect mail.example.com:993 -servername mail.example.com
```

**Mailux backend won't start / user management fails**
It almost certainly isn't running as root. Check
`systemctl status mailux-backend` and confirm `User=root` in the unit file
(this is intentional - see `docs/SECURITY.md`).

## Security checklist

- [ ] SSH: keys only, password auth disabled
- [ ] Fail2ban for `sshd`, `postfix`, `dovecot`
- [ ] Mailux backend (`:5000`) and frontend (`:4173`) bound to `127.0.0.1`,
      reached only via the reverse proxy
- [ ] SPF/DKIM/DMARC configured and verified
- [ ] Reverse DNS (PTR) set for the server's IP
- [ ] Unattended security upgrades enabled (`unattended-upgrades`)
- [ ] `/etc/mailux/backend.env` is `chmod 600`, root-owned
