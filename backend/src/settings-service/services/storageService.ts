import { execFileSync } from "child_process";
import path from "path";
import { env } from "../../config/env.js";

const USERNAME_PATTERN = /^[a-z_][a-z0-9_-]{0,31}$/;

function assertSafeUsername(username: string): void {
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("Invalid username");
  }
}

/** How much disk space this account's Maildir actually uses, in bytes. */
export function getMailboxUsageBytes(username: string): number {
  assertSafeUsername(username);
  const maildir = path.join(env.mailBaseDir, username, "Maildir");

  try {
    const output = execFileSync("du", ["-sb", maildir], { encoding: "utf8" });
    const [sizeText] = output.trim().split(/\s+/);
    const bytes = Number(sizeText);
    return Number.isFinite(bytes) ? bytes : 0;
  } catch (err) {
    // Most likely cause: the Maildir doesn't exist yet (brand new
    // account, no mail received). Not an error worth surfacing.
    console.error(`Could not determine mailbox usage for ${username}:`, err);
    return 0;
  }
}
