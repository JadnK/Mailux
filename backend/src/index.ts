import app from "./app.js";
import { env } from "./config/env.js";

if (typeof process.getuid === "function" && process.getuid() !== 0) {
  console.warn(
    "Mailux is not running as root. User management (useradd/chpasswd/deluser) " +
      "and PAM authentication will fail without root privileges. " +
      "See docs/DEPLOYMENT.md for the systemd setup."
  );
}

app.listen(env.port, () => {
  console.log(`Mailux backend listening on port ${env.port} (${env.nodeEnv})`);
});
