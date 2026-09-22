import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. Copy backend/.env.example to backend/.env and fill it in.`
    );
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

const nodeEnv = optionalEnv("NODE_ENV", "development");

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: Number(optionalEnv("PORT", "5000")),
  corsOrigin: optionalEnv("CORS_ORIGIN", "*"),
  mailDomain: optionalEnv("MAIL_DOMAIN", "localhost"),

  smtp: {
    host: requireEnv("MAIL_HOST"),
    port: Number(optionalEnv("MAIL_PORT", "587")),
  },

  imap: {
    host: requireEnv("MAIL_HOST_IMAP"),
    port: Number(optionalEnv("MAIL_IMAP_PORT", "993")),
  },

  /** How long a login session stays valid, in hours. Sessions live in memory only. */
  sessionTtlHours: Number(optionalEnv("SESSION_TTL_HOURS", "720")),

  /** Lowest UID considered a "mail user" when scanning /etc/passwd. */
  minUid: Number(optionalEnv("MAILUX_MIN_UID", "1000")),

  /** Base directory new mailboxes are created under. */
  mailBaseDir: optionalEnv("MAILUX_MAIL_BASE_DIR", "/mailuser"),

  /** PAM service name; must match the installed /etc/pam.d/<name> file. */
  pamServiceName: optionalEnv("MAILUX_PAM_SERVICE", "mailux"),
};
