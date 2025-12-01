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

  public async createUser(username: string, password: string): Promise<boolean> {
    try {
      const { execSync } = require('child_process');
      
      execSync(`sudo useradd -m -s /bin/bash "${username}"`, { stdio: 'pipe' });
      execSync(`sudo bash -c "mkdir -p /home/${username}/Maildir/{cur,new,tmp}"`);
      execSync(`sudo chown -R ${username}:${username} /home/${username}/Maildir`, { stdio: 'pipe' });
      execSync(`sudo chmod -R 700 /home/${username}/Maildir`, { stdio: 'pipe' });
      
      execSync(`echo "${username}:${password}" | sudo chpasswd`, { stdio: 'pipe' });
      
      this.userSettingsStore.set(username, {
        username,
        canReceiveMail: true,
      });
      
      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      return false;
    }
  }
}
type PamModule = {
  authenticate?: (username: string, password: string, cb: (err: Error | null) => void) => void;
} | ((...args: any[]) => any);

export const authenticateUser = (username: string, password: string, service = "login"): Promise<boolean> => {
  return new Promise<boolean>((resolve, reject) => {
    let pam: PamModule | null = null;
    try {
      pam = require("authenticate-pam") as PamModule;
    } catch (e: any) {
      console.error("authenticate-pam could not be required:", e && e.message);
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
        try {
          (pam as any).authenticate(username, password, cb);
          return;
        } catch (e) {
          try {
            (pam as any).authenticate(service, username, password, cb);
            return;
          } catch (e2) {
            console.error("authenticate-pam.authenticate calls failed:", e2 && (e2 as Error).message);
            return reject(e2);
          }
        }
      }

      if (typeof pam === "function") {
        try {
          (pam as any)(username, password, cb);
          return;
        } catch (e) {
          try {
            (pam as any)(service, username, password, cb);
            return;
          } catch (e2) {
            console.error("authenticate-pam direct-call attempts failed:", e2 && (e2 as Error).message);
            return reject(e2);
          }
        }
      }

      return reject(new Error("authenticate-pam: unexpected export shape"));
    } catch (outerErr) {
      console.error("authenticate-pam invocation threw:", outerErr && (outerErr as Error).message);
      return reject(outerErr as Error);
    }
  });
};
