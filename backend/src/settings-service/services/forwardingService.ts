import fs from "fs";
import path from "path";
import { env } from "../../config/env.js";

const FORWARD_FILENAME = ".forward";

// A plain email address only - no local-part tricks, no whitespace. This
// matters because ".forward" files are interpreted by the system's local
// mail delivery agent (Postfix/sendmail-compatible local(8)) and support a
// pipe-to-program syntax ("|/some/command") and writing mail straight to
// an arbitrary file. This backend runs as root and is the one writing this
// file into another user's home directory on their behalf, so the address
// is validated strictly before it ever touches disk - it must look like a
// plain address and nothing else.
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const USERNAME_PATTERN = /^[a-z_][a-z0-9_-]{0,31}$/;

function assertSafeUsername(username: string): void {
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("Invalid username");
  }
}

function homeDir(username: string): string {
  assertSafeUsername(username);
  return path.join(env.mailBaseDir, username);
}

function forwardPath(username: string): string {
  return path.join(homeDir(username), FORWARD_FILENAME);
}

/** Reads back the plain forwarding address, if one is set - ignores the
 *  "\username" local-delivery line written alongside it (see below). */
export const getForwardingAddress = (username: string): string | null => {
  let content: string;

  try {
    content = fs.readFileSync(forwardPath(username), "utf8");
  } catch {
    return null;
  }

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.find((line) => EMAIL_PATTERN.test(line)) ?? null;
};

/**
 * Sets (or clears, when `address` is null/empty) this account's mail
 * forwarding. When set, mail is delivered to the forwarding address AND
 * kept locally - local(8) treats each non-comment line of a .forward file
 * as a separate delivery instruction, and "\username" is the documented
 * way to say "also deliver here normally", so forwarding never silently
 * makes mail disappear from the account it was configured on.
 */
export const setForwardingAddress = (username: string, address: string | null): void => {
  const filePath = forwardPath(username);

  if (!address || !address.trim()) {
    try {
      fs.unlinkSync(filePath);
    } catch (err: any) {
      if (err?.code !== "ENOENT") throw err;
    }
    return;
  }

  const trimmed = address.trim();
  if (!EMAIL_PATTERN.test(trimmed)) {
    throw new Error("Please enter a valid email address to forward to");
  }

  fs.writeFileSync(filePath, `${trimmed}\n\\${username}\n`, { mode: 0o600 });

  // Keep the file owned by the mailbox's own system user, matching every
  // other file under its home directory - local(8) delivery is more
  // predictable that way, and it means this root-written file doesn't
  // stand out as a permissions oddity in the user's own home.
  try {
    const stats = fs.statSync(homeDir(username));
    fs.chownSync(filePath, stats.uid, stats.gid);
  } catch (err) {
    console.error(`Could not chown ${filePath} to match its home directory:`, err);
  }
};
