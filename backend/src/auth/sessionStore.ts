import { randomUUID } from "crypto";
import { env } from "../config/env.js";

/**
 * In-memory session store.
 *
 * Mailux talks to IMAP/SMTP on behalf of the logged-in user, so the backend
 * needs the user's mail password on every request. Earlier versions of this
 * app embedded that password inside a signed-but-unencrypted JWT and handed
 * it to the browser, where it sat in localStorage in plainly readable form
 * for up to 30 days. That is a real credential leak: a JWT's payload is
 * base64, not encryption.
 *
 * Instead, the client only ever sees an opaque, random session token. The
 * actual username/password pair stays on the server, in memory, and is
 * looked up per request. The trade-off is that sessions do not survive a
 * backend restart (users simply log in again) - a good trade for not
 * persisting plaintext mail passwords anywhere.
 */

export type SessionRecord = {
  username: string;
  password: string;
  createdAt: number;
  expiresAt: number;
};

const sessions = new Map<string, SessionRecord>();
const TTL_MS = env.sessionTtlHours * 60 * 60 * 1000;

export function createSession(username: string, password: string): string {
  const token = randomUUID();
  const now = Date.now();

  sessions.set(token, {
    username,
    password,
    createdAt: now,
    expiresAt: now + TTL_MS,
  });

  return token;
}

export function getSession(token: string): SessionRecord | null {
  const record = sessions.get(token);
  if (!record) return null;

  if (record.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }

  return record;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

/**
 * Destroys every other active session belonging to this username, keeping
 * only `keepToken` alive - called right after a self-service password
 * change so a token that leaked or was left behind before the change
 * (a shared/public computer, a stolen device, etc.) is cut off immediately
 * instead of continuing to work for up to the full session TTL.
 */
export function destroyOtherSessions(username: string, keepToken: string): void {
  for (const [token, record] of sessions) {
    if (record.username === username && token !== keepToken) {
      sessions.delete(token);
    }
  }
}

/**
 * Updates the password kept for an already-active session - used right
 * after a successful self-service password change, so the session that
 * just changed it keeps working (IMAP/SMTP calls use this password on
 * every request) instead of being silently logged out mid-session.
 */
export function updateSessionPassword(token: string, password: string): void {
  const record = sessions.get(token);
  if (record) record.password = password;
}

export function activeSessionCount(): number {
  return sessions.size;
}

function sweepExpiredSessions(): void {
  const now = Date.now();
  for (const [token, record] of sessions) {
    if (record.expiresAt < now) sessions.delete(token);
  }
}

// Keep memory bounded even if nobody ever calls getSession() on a stale token.
setInterval(sweepExpiredSessions, 60 * 60 * 1000).unref();
