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
  dovecot-imapd dovecot-lmtpd dovecot-core \
  openssl
```

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
git pull
sudo ./deploy/install.sh
sudo systemctl restart mailux-backend mailux-frontend
```

## Reverse proxy / HTTPS for the web UI

Point a reverse proxy (nginx, Caddy, Nginx Proxy Manager, ...) at:

- frontend: `http://127.0.0.1:4173`
- backend: `http://127.0.0.1:5000` (mount under `/api`, or set
  `VITE_API_BASE_URL` at frontend build time to point at wherever you
  expose it)

Terminate TLS at the proxy (Let's Encrypt) and force HTTPS.

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

**"Authentication failed" logging into Mailux**
Confirm PAM sees the account: `doveadm auth test <user> '<password>'`.
Check `journalctl -u mailux-backend` for the underlying PAM error.

**Mail arrives at Postfix but Maildir stays empty**
Check the queue (`postqueue -p`) and that the LMTP socket exists:
`ls -la /var/spool/postfix/private | grep dovecot-lmtp`. Remember the LMTP
transport path in `main.cf` usually needs to be **relative**
(`lmtp:unix:private/dovecot-lmtp`), not absolute, under a chrooted Postfix.

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
