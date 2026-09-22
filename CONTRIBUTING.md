# Contributing to Mailux

Thanks for taking a look at Mailux. It's a small, personal-scale project, but
contributions and bug reports are welcome.

## Getting set up

You'll need Node.js 20+ (see `.nvmrc`) and, for the backend, a Linux host
with PAM development headers if you want `authenticate-pam` to build from
source (`libpam0g-dev` on Debian/Ubuntu).

```bash
# Backend
cd backend
cp .env.example .env   # fill in your mail server details
npm install
npm run dev             # tsx watch, on PORT (default 5000)

# Frontend, in another shell
cd frontend
npm install
npm run dev              # Vite dev server on :5173
```

The backend needs root to manage system users and authenticate via PAM
(see [`docs/SECURITY.md`](docs/SECURITY.md)). For day-to-day frontend/API
work against an existing mailbox you generally don't need root - it's only
required for the user-management endpoints and for creating new mailboxes.

## Before opening a PR

Run these in whichever package(s) you touched:

```bash
npm run lint
npm run build
```

Both must pass; CI runs the same checks. Please don't commit `node_modules/`,
`dist/`, or any `.env` file - the root `.gitignore` should already keep
these out, but double-check `git status` before committing.

## Commit style

Short, descriptive commit messages are preferred, ideally prefixed with the
area they touch, e.g. `fix(backend): ...`, `feat(frontend): ...`,
`docs: ...`, `chore: ...`.

## Reporting security issues

Please don't open a public issue for a security vulnerability - see
[`docs/SECURITY.md`](docs/SECURITY.md) for how to report it privately.
