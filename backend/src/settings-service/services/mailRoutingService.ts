import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
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

// Pigeonhole's Sieve compiler (the `dovecot-sieve` package's `sievec`)
// installs to different locations across distros - a plain $PATH lookup
// covers most, the Debian/Ubuntu package also drops a copy under
// /usr/lib/dovecot for systems that don't put it on PATH.
const SIEVEC_CANDIDATES = ["sievec", "/usr/bin/sievec", "/usr/lib/dovecot/sievec"];

/**
 * Syntax-checks a freshly written Sieve script with Pigeonhole's own
 * compiler, if it's installed. A script that fails to compile still gets
 * *written* (so the forwarding/vacation settings behind it aren't lost),
 * but Dovecot's LMTP delivery treats a broken script as if it didn't
 * exist and silently falls back to plain delivery - i.e. forwarding and
 * the autoresponder do nothing, with no error visible anywhere in Mailux.
 * Catching that here, right after writing the script, is the difference
 * between "why isn't this working" being answerable from the settings
 * page or only from Dovecot's own logs on the server.
 *
 * Returns an error message describing the problem, or null when the
 * script compiles cleanly (or no sievec binary could be found to check
 * with - in which case we quietly skip the check rather than treating a
 * missing compiler as a Sieve error).
 */
function checkSieveScript(filePath: string): string | null {
  for (const bin of SIEVEC_CANDIDATES) {
    try {
      execFileSync(bin, [filePath], { stdio: "pipe" });
      // Compiling also writes a .svbin cache next to the script - the same
      // file Dovecot itself would produce on first delivery, just created
      // a little earlier.
      return null;
    } catch (err: any) {
      if (err?.code === "ENOENT") continue; // not installed here - try the next candidate

      const stderr = err?.stderr ? err.stderr.toString().trim() : "";
      return stderr || err?.message || "Das Sieve-Skript konnte nicht kompiliert werden.";
    }
  }

  return null;
}

/**
 * Checks whether Dovecot's LMTP delivery is actually wired up for Sieve
 * at all - the two one-time manual steps in docs/DEPLOYMENT.md's
 * "Dovecot: Sieve" section (mail_plugins for the lmtp protocol, and the
 * plugin's own sieve path). If either was never done (easy to miss on a
 * manual install - there's no installer that does it for you), Mailux
 * happily keeps writing a perfectly valid .dovecot.sieve on every save,
 * and Dovecot never even looks at it: forwarding/the autoresponder do
 * nothing, with a valid script and no compile error either - this is a
 * more common real cause of "I did everything right and it still
 * doesn't work" than a broken script.
 *
 * Uses `doveconf` to ask Dovecot itself, the same way it would resolve
 * these settings for a real LMTP delivery, rather than trying to parse
 * config files by hand. Returns a problem description, or null when both
 * checks pass (or `doveconf` isn't reachable, in which case this is
 * skipped rather than treated as a failure).
 */
/** Runs `doveconf -h <args>`, returning the trimmed value, or null if the
 *  lookup itself failed (binary missing, setting unknown, etc.) - the
 *  caller decides what a failed/empty lookup means. */
function queryDoveconf(args: string[]): string | null {
  try {
    return execFileSync("doveconf", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

function checkDovecotSieveConfigured(): string | null {
  const mailPlugins = queryDoveconf(["-f", "protocol=lmtp", "-h", "mail_plugins"]);
  if (mailPlugins === null) {
    // doveconf isn't on PATH, or couldn't be run at all (e.g. this isn't
    // actually running on the mail server) - can't check, so don't
    // pretend to have an answer either way.
    return null;
  }

  // Where Dovecot exposes a plugin setting through `doveconf -h` varies by
  // version: newer installs answer under "plugin/<name>", but a bare
  // "<name>" can come back empty even with a correct `plugin { sieve = ... }`
  // in place - confirmed against a real 2.3-era server, where `-h sieve`
  // was empty and `-h plugin/sieve` correctly returned the configured path.
  // Try the namespaced form first, since that's the one that's actually
  // reliable, and fall back to the bare name for whatever Dovecot version
  // still wants it that way.
  const sievePluginPath = queryDoveconf(["-h", "plugin/sieve"]) || queryDoveconf(["-h", "sieve"]) || "";

  const problems: string[] = [];
  if (!/(^|\s)sieve(\s|$)/.test(mailPlugins)) {
    problems.push(
      'das Sieve-Plugin ist in Dovecots LMTP-Konfiguration nicht aktiviert (mail_plugins in ' +
        '/etc/dovecot/conf.d/20-lmtp.conf sollte "sieve" enthalten - aktuell: ' +
        `${mailPlugins ? `"${mailPlugins}"` : "leer"})`
    );
  }
  if (!sievePluginPath) {
    problems.push(
      "kein Sieve-Skriptpfad konfiguriert (plugin { sieve = ~/.dovecot.sieve } fehlt in " +
        "/etc/dovecot/conf.d/90-sieve.conf)"
    );
  }

  if (problems.length === 0) return null;

  return (
    `Dovecot ist auf diesem Server nicht für Sieve eingerichtet: ${problems.join("; ")}. ` +
    'Siehe docs/DEPLOYMENT.md, Abschnitt "Dovecot: Sieve (server-side forwarding + autoresponder)".'
  );
}

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
  vacationSubject?: string;
  vacationMessage?: string;
  /** "YYYY-MM-DD" (server's local date), or unset/null for no bound on
   *  that side. When set, the autoresponder only fires on/after (or
   *  on/before) that date - a normal "away from X to Y" window. */
  vacationStart?: string | null;
  vacationEnd?: string | null;
};

const DEFAULT_VACATION_SUBJECT = "Automatische Antwort";
const DEFAULT_VACATION_MESSAGE =
  "Ich bin aktuell nicht erreichbar und melde mich, sobald ich wieder da bin.";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidSieveDate(value: string): boolean {
  return ISO_DATE_PATTERN.test(value);
}

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
    const subject = (settings.vacationSubject?.trim() || DEFAULT_VACATION_SUBJECT).slice(0, 200);
    const message = (settings.vacationMessage?.trim() || DEFAULT_VACATION_MESSAGE).slice(0, 20000);
    requires.add("vacation");

    const vacationAction = [
      "vacation",
      "    :days 1",
      `    :subject ${sieveString(subject)}`,
      `    ${sieveString(message)};`,
    ].join("\n");

    // Optional "from X to Y" window: :value "ge"/"le" needs the
    // relational extension, and currentdate needs the date extension.
    const dateConditions: string[] = [];

    if (settings.vacationStart && isValidSieveDate(settings.vacationStart)) {
      requires.add("date");
      requires.add("relational");
      dateConditions.push(`currentdate :value "ge" "date" ${sieveString(settings.vacationStart)}`);
    }

    if (settings.vacationEnd && isValidSieveDate(settings.vacationEnd)) {
      requires.add("date");
      requires.add("relational");
      dateConditions.push(`currentdate :value "le" "date" ${sieveString(settings.vacationEnd)}`);
    }

    if (dateConditions.length === 0) {
      actions.push(vacationAction);
    } else if (dateConditions.length === 1) {
      actions.push(`if ${dateConditions[0]} {\n  ${vacationAction}\n}`);
    } else {
      actions.push(`if allof(${dateConditions.join(", ")}) {\n  ${vacationAction}\n}`);
    }
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

  // Checked in this order on purpose: a missing Dovecot config is the
  // more fundamental problem (nothing about the script's own content can
  // fix it), and there's no reason to bother the user with a compile
  // error for a script Dovecot isn't even going to load in the first
  // place.
  const configProblem = checkDovecotSieveConfigured();
  if (configProblem) {
    throw new Error(`Gespeichert, aber noch nicht aktiv: ${configProblem}`);
  }

  const sieveError = checkSieveScript(filePath);
  if (sieveError) {
    throw new Error(
      `Gespeichert, aber das Sieve-Skript ist fehlerhaft und wird von Dovecot ignoriert - ` +
        `Weiterleitung/Autoresponder sind dadurch inaktiv: ${sieveError}`
    );
  }
}
