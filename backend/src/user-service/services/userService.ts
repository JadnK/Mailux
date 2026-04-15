import { promises as fs } from "fs";
import path from "path";
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
  profilePicture?: string;
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

export default class UserService {
  private userSettingsStore: Map<string, UserSettings> = new Map();
  private cacheTimestamp: number | null = null;

  constructor(private options?: { minUid?: number }) {
    if (!this.options) this.options = {};
    if (!this.options.minUid) this.options.minUid = 1000;
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

      if (user.uid >= (this.options?.minUid ?? 1000) && user.username !== "root") {
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
    try {
      const { execSync } = require("child_process");

      execSync(`sudo deluser --remove-home "${username}"`, { stdio: "pipe" });
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
    try {
      const { execSync } = require("child_process");

      execSync(`sudo useradd -m -s /usr/sbin/nologin "${username}"`, { stdio: "pipe" });
      execSync(
        `sudo bash -c "mkdir -p /home/${username}/Maildir/{cur,new,tmp} /home/${username}/Maildir/.{Sent,Trash,Drafts}/{cur,new,tmp}"`,
        { stdio: "pipe" }
      );
      execSync(`sudo chown -R ${username}:${username} /home/${username}/Maildir`, {
        stdio: "pipe",
      });
      execSync(`sudo chmod -R 700 /home/${username}/Maildir`, { stdio: "pipe" });
      execSync(`echo "${username}:${password}" | sudo chpasswd`, { stdio: "pipe" });

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
  service = "login"
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
        console.error(
          `PAM auth failed (user=${username}, service=${service}):`,
          err.message || err
        );
        return reject(err);
      }

      resolve(true);
    };

    try {
      if (pam && typeof (pam as any).authenticate === "function") {
        (pam as any).authenticate(username, password, cb, {
          serviceName: service,
        });
        return;
      }

      if (typeof pam === "function") {
        (pam as any)(username, password, cb, {
          serviceName: service,
        });
        return;
      }

      return reject(new Error("authenticate-pam: unexpected export shape"));
    } catch (err: any) {
      console.error("authenticate-pam invocation threw:", err?.message);
      return reject(err);
    }
  });
};