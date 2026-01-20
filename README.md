# Mailux

**Mailux** ist ein simples Web-UI + Backend, um Mails auf einem **eigenen** Server zu verwalten (Postfächer anlegen/löschen, Inbox/Sent lesen, Mails senden, Ordner verwalten).  
Als Mailserver setzt Mailux standardmäßig auf **Postfix** (SMTP) + **Dovecot** (IMAP/LMTP) und kann (optional, aber empfohlen) mit **SPF/DKIM/DMARC** betrieben werden. 

> Diese README ist bewusst „step-by-step“ für Ubuntu/Debian geschrieben (ohne Mailcow/Mailu), passend zu einem klassischen Postfix+Dovecot Setup.

---

## Inhaltsverzeichnis

- [Architektur](#architektur)
- [Ports](#ports)
- [DNS](#dns)
- [Installation: Postfix + Dovecot](#installation-postfix--dovecot)
- [Konfiguration: Postfix](#konfiguration-postfix)
- [Konfiguration: Dovecot](#konfiguration-dovecot)
- [TLS/SSL](#tlsssl)
- [DKIM (OpenDKIM) + SPF + DMARC](#dkim-opendkim--spf--dmarc)
- [Mail-User anlegen (ohne SSH-Login)](#mail-user-anlegen-ohne-ssh-login)
- [Start/Restart/Logs](#startrestartlogs)
- [Mailux App Deployment](#mailux-app-deployment)
- [Troubleshooting](#troubleshooting)
- [Security Checklist](#security-checklist)

---

## Architektur

- **Postfix**: SMTP Empfang (Port 25), Submission (Port 587)
- **Dovecot**: IMAP Zugriff (Port 993) + **LMTP** Zustellung von Postfix in Maildir
- **Maildir pro User**: `/home/<user>/Maildir/` (cur/new/tmp)
- **Mailux Backend**: Node/Express API (standardmäßig Port `5000`)
- **Mailux Frontend**: Web UI (typisch via Nginx/Container)
- Optional: **NGINX Proxy Manager** als Reverse Proxy + TLS für die Web-App

---

## Ports

Minimal (öffentlich):
- `25/tcp` SMTP eingehend (Postfix)
- `587/tcp` Submission (Postfix) – für Clients zum Senden
- `993/tcp` IMAPS (Dovecot)

Optional:
- `80/tcp` + `443/tcp` für Web UI / Reverse Proxy (z.B. Nginx Proxy Manager)
- **Backend Port 5000**: **nicht öffentlich** machen → nur `127.0.0.1:5000` + Reverse Proxy

---

## DNS

Für `jadenk.de` sieht ein typisches Setup so aus (Beispiel):

- `A` Record: `mail.jadenk.de -> <SERVER_IP>`
- `MX` Record: `jadenk.de -> mail.jadenk.de (prio 10)`
- `TXT` SPF: `v=spf1 ip4:<SERVER_IP> mx a -all`
- `TXT` DMARC: `_dmarc` z.B. `v=DMARC1; p=none; rua=mailto:postmaster@jadenk.de`
- `TXT` DKIM: `selector._domainkey` mit deinem Public Key

**Wichtig:** Reverse DNS (PTR) ist für Zustellbarkeit ebenfalls wichtig (bei deinem Hoster setzen).

---

# Installation: Postfix + Dovecot

> Alle Befehle als `root` oder via `sudo`.

```bash
apt update
apt install -y postfix postfix-pcre \
  dovecot-imapd dovecot-lmtpd dovecot-core \
  openssl
```

Während der Postfix-Installation:
- „Internet Site“
- System mail name: `mail.jadenk.de` (oder dein Hostname)

---

# Konfiguration: Postfix

## 1) Basis: `/etc/postfix/main.cf`

Öffnen:
```bash
nano /etc/postfix/main.cf
```

Setze/prüfe diese Kernwerte (anpassen an deine Domain/Hostname):

```cf
myhostname = mail.jadenk.de
mydomain = jadenk.de
myorigin = $mydomain

inet_interfaces = all
inet_protocols = all

mydestination = $myhostname, $mydomain, localhost.localdomain, localhost
```

### 2) Zustellung: Postfix → Dovecot via LMTP (Best Practice)

**Wichtig:** Wenn Postfix in chroot läuft, nutze den **relativen** Socket-Pfad:

```cf
mailbox_transport = lmtp:unix:private/dovecot-lmtp
local_transport   = lmtp:unix:private/dovecot-lmtp
virtual_transport = lmtp:unix:private/dovecot-lmtp
```

> Dadurch liefert Postfix lokal sauber in Dovecot/Maildir aus (statt Mbox oder Queue-Stau).

### 3) Submission (587) aktivieren (master.cf)

Öffne:
```bash
nano /etc/postfix/master.cf
```

Suche die `submission` Sektion und aktiviere sie (Kommentarzeichen entfernen). Typisch:

```cf
submission inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_client_restrictions=permit_sasl_authenticated,reject
  -o smtpd_sender_restrictions=permit_sasl_authenticated,reject
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
```

### 4) SASL Auth über Dovecot (für 587)

In `/etc/postfix/main.cf` ergänzen:

```cf
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_auth_enable = yes
smtpd_sasl_security_options = noanonymous
broken_sasl_auth_clients = yes
```

---

# Konfiguration: Dovecot

## 1) Protokolle: IMAP + LMTP

Datei:
```bash
nano /etc/dovecot/dovecot.conf
```

```conf
protocols = imap lmtp
```

## 2) Maildir Location

Datei:
```bash
nano /etc/dovecot/conf.d/10-mail.conf
```

Setze:

```conf
mail_location = maildir:~/Maildir
```

## 3) Auth

Die Standard-Auth für System-User reicht oft (PAM). In vielen Setups ist das Default.
Falls du es explizit prüfen willst:

```bash
grep -n "disable_plaintext_auth" /etc/dovecot/conf.d/10-auth.conf
```

Bei TLS (IMAPS) kann `disable_plaintext_auth = yes` bleiben.

## 4) Dovecot Sockets: auth + lmtp

Datei:
```bash
nano /etc/dovecot/conf.d/10-master.conf
```

### a) auth socket für Postfix (SASL)
Im `service auth` Block:

```conf
service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}
```

### b) LMTP socket für Zustellung
```conf
service lmtp {
  unix_listener /var/spool/postfix/private/dovecot-lmtp {
    mode = 0660
    user = postfix
    group = postfix
  }
}
```

---

# TLS/SSL

## Dovecot (IMAPS 993)

Datei:
```bash
nano /etc/dovecot/conf.d/10-ssl.conf
```

```conf
ssl = required
ssl_cert = </etc/letsencrypt/live/mail.jadenk.de/fullchain.pem
ssl_key  = </etc/letsencrypt/live/mail.jadenk.de/privkey.pem
```

## Postfix (SMTP/Submission)

In `/etc/postfix/main.cf`:

```cf
smtpd_tls_cert_file=/etc/letsencrypt/live/mail.jadenk.de/fullchain.pem
smtpd_tls_key_file=/etc/letsencrypt/live/mail.jadenk.de/privkey.pem
smtpd_tls_security_level=may

smtp_tls_security_level=may
smtp_tls_loglevel = 1
```

> Für Let’s Encrypt: `certbot` installieren und Zertifikat holen (Webserver oder DNS-Challenge).

---

# DKIM (OpenDKIM) + SPF + DMARC

## OpenDKIM installieren
```bash
apt install -y opendkim opendkim-tools
```

## Keys generieren (Beispiel: selector `2020`)
```bash
mkdir -p /etc/opendkim/keys/jadenk.de
cd /etc/opendkim/keys/jadenk.de
opendkim-genkey -s 2020 -d jadenk.de
chown opendkim:opendkim 2020.private
chmod 600 2020.private
```

## OpenDKIM konfigurieren
Typische Dateien (je nach Setup):

- `/etc/opendkim.conf`
- `/etc/opendkim/KeyTable`
- `/etc/opendkim/SigningTable`
- `/etc/opendkim/TrustedHosts`

Minimal-Beispiel:

**/etc/opendkim/KeyTable**
```txt
2020._domainkey.jadenk.de jadenk.de:2020:/etc/opendkim/keys/jadenk.de/2020.private
```

**/etc/opendkim/SigningTable**
```txt
*@jadenk.de 2020._domainkey.jadenk.de
```

**/etc/opendkim/TrustedHosts**
```txt
127.0.0.1
localhost
mail.jadenk.de
jadenk.de
```

Dann Postfix an OpenDKIM „milter“ hängen (in `/etc/postfix/main.cf`):

```cf
milter_default_action = accept
milter_protocol = 6
smtpd_milters = unix:/opendkim/opendkim.sock
non_smtpd_milters = $smtpd_milters
```

> Wo der Socket liegt hängt von deiner OpenDKIM Config ab. Auf Debian/Ubuntu ist das oft `/run/opendkim/opendkim.sock` oder ein Socket unter `/var/spool/postfix/…`. Prüfe `Socket` in `/etc/opendkim.conf`.

### DNS: DKIM TXT setzen
Den Public Key bekommst du aus:
```bash
cat /etc/opendkim/keys/jadenk.de/2020.txt
```

SPF/DMARC setzt du im DNS wie oben beschrieben.

---

# Mail-User anlegen (ohne SSH-Login)

Ein Mail-User ist bei diesem Setup meist ein Linux-User mit Maildir.

## User anlegen (ohne Shell)
```bash
useradd -m -s /usr/sbin/nologin info
passwd info
```

Maildir (wenn nicht automatisch vorhanden):
```bash
sudo -u info maildirmake.dovecot /home/info/Maildir
```

**Wichtig:** Keine SSH-Logins für Mailuser → `nologin` verhindert interaktive Logins.

---

# Start/Restart/Logs

## Services starten / neu starten
```bash
systemctl restart postfix
systemctl restart dovecot
systemctl restart opendkim
```

Status:
```bash
systemctl status postfix --no-pager
systemctl status dovecot --no-pager
```

Logs:
```bash
tail -f /var/log/mail.log
journalctl -u dovecot -f
journalctl -u postfix -f
```

Queue prüfen/flushen:
```bash
postqueue -p
postqueue -f
```

---

# Mailux App Deployment

> Der Repo besteht aus `frontend/` und `backend/` (TypeScript).

## 1) Repo klonen
```bash
cd /home/mailserver
git clone https://github.com/JadnK/Mailux.git
cd Mailux
```

## 2) Backend

Typisch:
```bash
cd backend
npm install
npm run build
```

Start (empfohlen via systemd statt `screen`):

Erstelle `/etc/systemd/system/mailux-backend.service`:

```ini
[Unit]
Description=Mailux Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/mailserver/Mailux/backend
Environment=NODE_ENV=production
# Optional: EnvironmentFile=/home/mailserver/Mailux/backend/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
```

Aktivieren:
```bash
systemctl daemon-reload
systemctl enable --now mailux-backend
```

## 3) Frontend

Im einfachsten Fall baust du das Frontend und servest es über Nginx/Container.  
Wenn du Docker Compose nutzt, starte es über:

```bash
docker compose up -d
```

## 4) HTTPS für die Web-App
Empfohlen: Reverse Proxy (z.B. Nginx Proxy Manager):
- `frontend` als Ziel (HTTP)
- `backend` als Ziel (HTTP 127.0.0.1:5000)
- TLS Termination am Proxy (Let’s Encrypt), „Force SSL“ aktiv

---

# Troubleshooting

## “Authentication failed” im IMAP (Backend)
- Prüfe ob Dovecot User `info` vs `info@domain` erwartet.
- Test:
  ```bash
  doveadm auth test info 'PASSWORT'
  ```

## Mails kommen an, aber Maildir bleibt leer
- Prüfe Postfix Queue:
  ```bash
  postqueue -p
  ```
- Prüfe ob LMTP socket existiert:
  ```bash
  ls -la /var/spool/postfix/private | grep dovecot-lmtp
  ```
- Postfix LMTP Pfad muss oft **relativ** sein:
  `lmtp:unix:private/dovecot-lmtp`

## TLS “self-signed certificate”
- Stelle sicher, dass Postfix/Dovecot auf echte LE-Zertifikate zeigen
- Test:
  ```bash
  openssl s_client -starttls smtp -connect mail.jadenk.de:587 -servername mail.jadenk.de
  openssl s_client -connect mail.jadenk.de:993 -servername mail.jadenk.de
  ```

## SSH “connection reset by peer” (CI/CD)
- Häufig Fail2Ban Ban.
- Status:
  ```bash
  fail2ban-client status sshd
  ```
- Entbannen:
  ```bash
  fail2ban-client set sshd unbanip <IP>
  ```

---

# Security Checklist

- [ ] SSH nur mit Keys, Passwortlogin aus
- [ ] Fail2Ban für `sshd`, `postfix`, `dovecot`
- [ ] Port `5000` nicht öffentlich (nur localhost + Reverse Proxy)
- [ ] SPF/DKIM/DMARC korrekt gesetzt
- [ ] PTR (Reverse DNS) setzen lassen
- [ ] Regelmäßige Updates (`unattended-upgrades`)
