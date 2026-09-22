import { promises as fs } from "fs";
import path from "path";
import { execFileSync, spawnSync } from "child_process";
import { env } from "../../config/env.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

export type SysUser = {
  username: string;
  uid: number;
  gid: number;
  comment: string;
  home: string;
  shell: string;
};

export interface UserSettings {
  username: string;
  name?: string;
  signature?: string;
  canReceiveMail?: boolean;
}

type PamModule =
  | {
      authenticate?: (
        username: string,
        password: string,
        cb: (err: Error | null) => void,
        options?: { serviceName?: string }
      ) => void;
    }
  | ((...args: any[]) => any);

const USERNAME_PATTERN = /^[a-z_][a-z0-9_-]{0,31}$/;

function assertValidUsername(username: string): void {
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("Invalid username");
  }
}

/**
 * Runs a privileged system command directly (no shell, no `sudo`).
 *
 * This process is meant to run as root via systemd (see docs/DEPLOYMENT.md),
 * so `sudo` is both unnecessary and risky here: a non-interactive systemd
 * service has no TTY, so a `sudo` call that unexpectedly needs a password
 * simply hangs. Using execFile (not exec) also means arguments are never
 * interpolated into a shell string, which rules out shell-injection via a
 * crafted username.
 */
function runPrivileged(command: string, args: string[]): void {
  execFileSync(command, args, { stdio: "pipe" });
}

/** Sets a system user's password via chpasswd's stdin, never via argv/echo. */
function setSystemPassword(username: string, password: string): void {
  const result = spawnSync("chpasswd", [], {
    input: `${username}:${password}\n`,
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(`chpasswd failed: ${result.stderr?.toString().trim() || "unknown error"}`);
  }
}

export default class UserService {
  private userSettingsStore: Map<string, UserSettings> = new Map();
  private cacheTimestamp: number | null = null;

  constructor(private options?: { minUid?: number }) {
    if (!this.options) this.options = {};
    if (!this.options.minUid) this.options.minUid = env.minUid;
  }

  private parsePasswdLine(line: string): SysUser | null {
    const parts = line.split(":");
    if (parts.length < 7) return null;

    const username = parts[0];
    const uid = Number(parts[2]);
    const gid = Number(parts[3]);
    const comment = parts[4] || "";
    const home = parts[5] || "";
    const shell = parts[6] || "";

    return { username, uid, gid, comment, home, shell };
  }

  private async fileExists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }

  private async hasMaildir(home: string): Promise<boolean> {
    if (!home) return false;

    const candidates = [
      path.join(home, "Maildir"),
      path.join(home, "Maildir", "cur"),
      path.join(home, "mail", "Maildir"),
    ];

    for (const candidate of candidates) {
      if (await this.fileExists(candidate)) {
        return true;
      }
    }

    return false;
  }

  private async readSystemUsers(): Promise<SysUser[]> {
    const passwdPath = "/etc/passwd";
    const content = await fs.readFile(passwdPath, "utf8");
    const lines = content.split("\n").filter(Boolean);

    const users: SysUser[] = [];

    for (const line of lines) {
      const user = this.parsePasswdLine(line);
      if (!user) continue;

      if (user.uid >= (this.options?.minUid ?? env.minUid) && user.username !== "root") {
        users.push(user);
      }
    }

    return users;
  }

  public async getAllUsersWithMaildir(): Promise<UserSettings[]> {
    const sysUsers = await this.readSystemUsers();
    const results: UserSettings[] = [];

    await Promise.all(
      sysUsers.map(async (sysUser) => {
        try {
          const hasMaildir = await this.hasMaildir(sysUser.home);
          if (!hasMaildir) return;

          if (!this.userSettingsStore.has(sysUser.username)) {
            this.userSettingsStore.set(sysUser.username, {
              username: sysUser.username,
              canReceiveMail: true,
            });
          }

          const settings = this.userSettingsStore.get(sysUser.username)!;
          results.push(settings);
        } catch (err) {
          console.warn(`UserService: error checking Maildir for ${sysUser.username}`, err);
        }
      })
    );

    this.cacheTimestamp = Date.now();
    return results;
  }

  public async getUser(username: string): Promise<UserSettings | null> {
    if (this.userSettingsStore.size === 0) {
      await this.getAllUsersWithMaildir();
    }

    return this.userSettingsStore.get(username) ?? null;
  }

  public async updateUser(
    username: string,
    updates: Partial<UserSettings>
  ): Promise<UserSettings | null> {
    const existing = await this.getUser(username);
    if (!existing) return null;

    const merged: UserSettings = {
      ...existing,
      ...updates,
      username: existing.username,
    };

    this.userSettingsStore.set(username, merged);
    return merged;
  }

  public async deleteUser(username: string): Promise<boolean> {
    assertValidUsername(username);

    if (username === "root") {
      throw new Error("Refusing to remove the root account");
    }

    try {
      runPrivileged("deluser", ["--remove-home", username]);
      this.userSettingsStore.delete(username);
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  public async refreshCache(): Promise<UserSettings[]> {
    const sysUsers = await this.readSystemUsers();
    const sysUsernames = new Set(sysUsers.map((u) => u.username));

    for (const key of Array.from(this.userSettingsStore.keys())) {
      if (!sysUsernames.has(key)) {
        this.userSettingsStore.delete(key);
      }
    }

    return this.getAllUsersWithMaildir();
  }

  public getStoreSnapshot(): UserSettings[] {
    return Array.from(this.userSettingsStore.values());
  }

  public async createUser(username: string, password: string): Promise<boolean> {
    assertValidUsername(username);

    try {
      const mailBase = env.mailBaseDir;
      const userHome = path.posix.join(mailBase, username);
      const mailDir = path.posix.join(userHome, "Maildir");

      runPrivileged("mkdir", ["-p", mailBase]);
      runPrivileged("useradd", ["-m", "-d", userHome, "-s", "/usr/sbin/nologin", username]);

      const folders = [
        `${mailDir}/cur`,
        `${mailDir}/new`,
        `${mailDir}/tmp`,

        `${mailDir}/.Sent/cur`,
        `${mailDir}/.Sent/new`,
        `${mailDir}/.Sent/tmp`,

        `${mailDir}/.Trash/cur`,
        `${mailDir}/.Trash/new`,
        `${mailDir}/.Trash/tmp`,

        `${mailDir}/.Drafts/cur`,
        `${mailDir}/.Drafts/new`,
        `${mailDir}/.Drafts/tmp`,
      ];

      for (const folder of folders) {
        runPrivileged("mkdir", ["-p", folder]);
      }

      runPrivileged("chown", ["-R", `${username}:${username}`, mailDir]);
      runPrivileged("chmod", ["-R", "700", mailDir]);
      setSystemPassword(username, password);

      this.userSettingsStore.set(username, {
        username,
        canReceiveMail: true,
      });

      return true;
    } catch (error) {
      console.error("Error creating user:", error);
      return false;
    }
  }
}

export const authenticateUser = (
  username: string,
  password: string,
  service: string = env.pamServiceName
): Promise<boolean> => {
  return new Promise<boolean>((resolve, reject) => {
    let pam: PamModule | null = null;

    try {
      pam = require("authenticate-pam") as PamModule;
    } catch (e: any) {
      console.error("authenticate-pam could not be required:", e?.message);
      return reject(new Error("authenticate-pam not available"));
    }

    const cb = (err: Error | null) => {
      if (err) {
        console.error(`PAM auth failed (user=${username}, service=${service}):`, err.message || err);
        return reject(err);
      }

      resolve(true);
    };

    try {
      if (pam && typeof (pam as any).authenticate === "function") {
        (pam as any).authenticate(username, password, cb, { serviceName: service });
        return;
      }

      if (typeof pam === "function") {
        (pam as any)(username, password, cb, { serviceName: service });
        return;
      }

      return reject(new Error("authenticate-pam: unexpected export shape"));
    } catch (err: any) {
      console.error("authenticate-pam invocation threw:", err?.message);
      return reject(err);
    }
  });
};
