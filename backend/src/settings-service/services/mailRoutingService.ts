import fs from "fs";
import path from "path";
import { env } from "../../config/env.js";

/**
 * Server-side mail forwarding and out-of-office auto-replies.
 *
 * This deployment delivers mail straight to Dovecot over LMTP
 * (`local_transport = lmtp:unix:private/dovecot-lmtp` - see
 * docs/DEPLOYMENT.md), never through Postfix's own local(8) delivery
 * agent. That matters: a classic `~/.forward` file is a local(8)
 * convention and is never consulted here, so an earlier version of this
 * feature that only wrote `.forward` silently did nothing. The correct
 * per-user hook for Dovecot LMTP delivery is a Sieve script
 * (~/.dovecot.sieve, via the Pigeonhole plugin - apt package
 * `dovecot-sieve`, see docs/DEPLOYMENT.md for the one-time server config).
 *
 * Sieve is also a strictly safer place for this than `.forward` would
 * have been: it has no generic "run a program" primitive (we never
 * `require` the extprograms/pipe extension), so unlike a `.forward` pipe
 * command, a forwarding address here can never become command execution -
 * the address is validated as a defense-in-depth measure, not because
 * the file format allows it to do anything else.
 */

const SIEVE_FILENAME = ".dovecot.sieve";

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

function sievePath(username: string): string {
  return path.join(homeDir(username), SIEVE_FILENAME);
}

export function isValidForwardingAddress(address: string): boolean {
  return EMAIL_PATTERN.test(address.trim());
}

/** Escapes a value for embedding inside a Sieve quoted-string literal. */
function sieveString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export type MailRoutingSettings = {
  forwardingAddress: string | null;
  vacationMode: boolean;
  vacationMessage?: string;
};

const DEFAULT_VACATION_MESSAGE =
  "Ich bin aktuell nicht erreichbar und melde mich, sobald ich wieder da bin.";

/**
 * (Re)generates this account's Sieve script from its current settings, or
 * removes it entirely when neither forwarding nor an autoresponder is
 * configured (plain local delivery, Dovecot's default with no script).
 */
export function syncMailRouting(username: string, settings: MailRoutingSettings): void {
  const filePath = sievePath(username);
  const requires = new Set<string>();
  const actions: string[] = [];

  if (settings.forwardingAddress) {
    const address = settings.forwardingAddress.trim();
    if (!isValidForwardingAddress(address)) {
      throw new Error("Ungültige Weiterleitungs-Adresse");
    }
    requires.add("copy");
    // :copy keeps the implicit "deliver here too" - forwarding is always
    // additive, mail never disappears from the account it's set up on.
    actions.push(`redirect :copy ${sieveString(address)};`);
  }

  if (settings.vacationMode) {
    const message = (settings.vacationMessage?.trim() || DEFAULT_VACATION_MESSAGE).slice(0, 20000);
    requires.add("vacation");
    actions.push(
      [
        "vacation",
        "    :days 1",
        `    :subject ${sieveString("Automatische Antwort: Abwesenheit")}`,
        `    ${sieveString(message)};`,
      ].join("\n")
    );
  }

  if (actions.length === 0) {
    try {
      fs.unlinkSync(filePath);
    } catch (err: any) {
      if (err?.code !== "ENOENT") throw err;
    }
    return;
  }

  // Explicit for clarity, even though both actions above already leave
  // the implicit keep in place on their own.
  actions.push("keep;");

  const requireLine = `require [${Array.from(requires)
    .map((name) => `"${name}"`)
    .join(", ")}];`;

  const script = `${requireLine}\n\n${actions.join("\n\n")}\n`;

  fs.writeFileSync(filePath, script, { mode: 0o600 });

  // Dovecot's LMTP process runs the script as the mailbox's own system
  // user, so it needs to be able to read it (and later write its compiled
  // .svbin cache next to it) - keep it owned like everything else in that
  // home directory.
  try {
    const stats = fs.statSync(homeDir(username));
    fs.chownSync(filePath, stats.uid, stats.gid);
  } catch (err) {
    console.error(`Could not chown ${filePath} to match its home directory:`, err);
  }
}
