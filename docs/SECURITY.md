# Security model

Mailux manages real Linux system accounts and real mailboxes, so it's worth
being explicit about the trust model instead of leaving it implicit.

## Why the backend runs as root

The backend shells out to `useradd`, `deluser` and `chpasswd`, reads
`/etc/passwd`, and authenticates users via PAM (`authenticate-pam`). All of
that requires root on a standard Linux system - there is no meaningful way
to run the *user management* half of Mailux as an unprivileged user.

Because of that, `mailux-backend.service` (see `deploy/systemd/`) runs as
`root` by design. Two things follow from that:

- **Treat the backend host like any other root-accessible service.** Put it
  behind a reverse proxy, keep `PORT` (default 5000) bound to `127.0.0.1`
  only, and don't expose it directly to the internet.
- **The frontend does *not* need root** and its systemd unit runs as a
  dedicated `mailux-web` system user with `ProtectSystem=strict`.

Privileged commands are run via `execFile`/`spawnSync` with explicit
argument arrays (never a shell string), and usernames are validated against
`^[a-z_][a-z0-9_-]{0,31}$` before being used in any of them. Passwords are
piped to `chpasswd` on stdin, never placed on a command line, so they never
show up in `ps`/`/proc/<pid>/cmdline`.

## How login sessions work

IMAP/SMTP have no concept of "log in once, reuse a token" - every mail
operation needs the user's actual mailbox password. That creates an
inherent tension: the backend has to hold onto that password for the
duration of a session.

An earlier version of this app resolved that by putting the username and
password inside a JWT and handing it to the browser. That is **not** safe:
a JWT's payload is base64-encoded, not encrypted, so the "token" sitting in
`localStorage` for up to 30 days was a plaintext-readable copy of the mail
password, exposed to anything that can read that origin's storage (e.g. an
XSS bug, a browser extension, physical device access).

Mailux now uses server-side sessions instead:

- On login, the backend authenticates via PAM and stores
  `{ username, password }` in an in-memory `Map`, keyed by a random
  `crypto.randomUUID()` token.
- Only that opaque token is sent to the browser and used as the bearer
  token on subsequent requests.
- The backend looks up the session server-side to get the mail credentials
  it needs for IMAP/SMTP.
- Sessions expire after `SESSION_TTL_HOURS` (default 30 days) and are
  swept periodically; they are **not** persisted to disk, so a backend
  restart logs everyone out. That's a deliberate trade-off: it keeps mail
  passwords out of any file or database.

## Known limitation: `imap-simple` / `node-imap`

The IMAP client stack (`imap-simple` → `node-imap` → `utf7` → `semver`)
pulls in a transitively vulnerable, unmaintained copy of `semver`
([GHSA-c2qf-rxjj-qqgw](https://github.com/advisories/GHSA-c2qf-rxjj-qqgw)),
a regular-expression denial-of-service issue. `npm audit fix --force`
"fixes" this by downgrading `imap-simple` to an even older major version,
which is worse, not better, so it's intentionally left as-is.

Impact is limited to a potential hang while parsing a crafted version
string; it does not allow remote code execution or data exfiltration. The
long-term fix is migrating the IMAP layer to
[`imapflow`](https://github.com/postalsys/imapflow), which is actively
maintained - tracked as a follow-up rather than done in this pass, since it
touches every IMAP call site and needs testing against a real Dovecot
server.

## Reporting a vulnerability

This is a small personal project without a formal disclosure program.
Please open a private report via GitHub's "Report a vulnerability" flow on
the repository's Security tab, or reach out to the maintainer directly,
rather than filing a public issue.
