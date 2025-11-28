import { promises as fs } from "fs";
import path from "path";
import { createRequire } from "module";

// Lade das native PAM-Modul über CommonJS, funktioniert in ESM
const require = createRequire(import.meta.url);
const authenticate = require("authenticate-pam") as (
  service: string,
  username: string,
  password: string,
  callback: (err: Error | null) => void
) => void;

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
    for (const c of candidates) {
      if (await this.fileExists(c)) return true;
    }
    return false;
  }

  private async readSystemUsers(): Promise<SysUser[]> {
    const passwdPath = "/etc/passwd";
    const content = await fs.readFile(passwdPath, "utf8");
    const lines = content.split("\n").filter(Boolean);
    const users: SysUser[] = [];
    for (const line of lines) {
      const u = this.parsePasswdLine(line);
      if (!u) continue;
      if (u.uid >= (this.options?.minUid ?? 1000) && u.username !== "root") {
        users.push(u);
      }
    }
    return users;
  }

  /** --- Public API --- */
  public async getAllUsersWithMaildir(): Promise<UserSettings[]> {
    const sysUsers = await this.readSystemUsers();
    const results: UserSettings[] = [];

    await Promise.all(
      sysUsers.map(async (su) => {
        try {
          const has = await this.hasMaildir(su.home);
          if (!has) return;
          if (!this.userSettingsStore.has(su.username)) {
            this.userSettingsStore.set(su.username, {
              username: su.username,
              canReceiveMail: true,
            });
          }
          const settings = this.userSettingsStore.get(su.username)!;
          results.push(settings);
        } catch (err) {
          console.warn(`UserService: error checking Maildir for ${su.username}`, err);
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

  public async updateUser(username: string, updates: Partial<UserSettings>): Promise<UserSettings | null> {
    const existing = await this.getUser(username);
    if (!existing) return null;
    const merged: UserSettings = { ...existing, ...updates, username: existing.username };
    this.userSettingsStore.set(username, merged);
    return merged;
  }

  public async deactivateUser(username: string): Promise<boolean> {
    const existing = await this.getUser(username);
    if (!existing) return false;
    existing.canReceiveMail = false;
    this.userSettingsStore.set(username, existing);
    return true;
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
}

export const authenticateUser = (username: string, password: string, service = "login"): Promise<boolean> => {
  return new Promise<boolean>((resolve, reject) => {
    authenticate(service, username, password, (err: Error | null) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
};
