import { promises as fs } from "fs";
import path from "path";
import { createRequire } from "module";
// Lade das native PAM-Modul über CommonJS, funktioniert in ESM
const require = createRequire(import.meta.url);
const authenticate = require("authenticate-pam");
export default class UserService {
    constructor(options) {
        this.options = options;
        this.userSettingsStore = new Map();
        this.cacheTimestamp = null;
        if (!this.options)
            this.options = {};
        if (!this.options.minUid)
            this.options.minUid = 1000;
    }
    parsePasswdLine(line) {
        const parts = line.split(":");
        if (parts.length < 7)
            return null;
        const username = parts[0];
        const uid = Number(parts[2]);
        const gid = Number(parts[3]);
        const comment = parts[4] || "";
        const home = parts[5] || "";
        const shell = parts[6] || "";
        return { username, uid, gid, comment, home, shell };
    }
    async fileExists(p) {
        try {
            await fs.access(p);
            return true;
        }
        catch {
            return false;
        }
    }
    async hasMaildir(home) {
        if (!home)
            return false;
        const candidates = [
            path.join(home, "Maildir"),
            path.join(home, "Maildir", "cur"),
            path.join(home, "mail", "Maildir"),
        ];
        for (const c of candidates) {
            if (await this.fileExists(c))
                return true;
        }
        return false;
    }
    async readSystemUsers() {
        const passwdPath = "/etc/passwd";
        const content = await fs.readFile(passwdPath, "utf8");
        const lines = content.split("\n").filter(Boolean);
        const users = [];
        for (const line of lines) {
            const u = this.parsePasswdLine(line);
            if (!u)
                continue;
            if (u.uid >= (this.options?.minUid ?? 1000) && u.username !== "root") {
                users.push(u);
            }
        }
        return users;
    }
    /** --- Public API --- */
    async getAllUsersWithMaildir() {
        const sysUsers = await this.readSystemUsers();
        const results = [];
        await Promise.all(sysUsers.map(async (su) => {
            try {
                const has = await this.hasMaildir(su.home);
                if (!has)
                    return;
                if (!this.userSettingsStore.has(su.username)) {
                    this.userSettingsStore.set(su.username, {
                        username: su.username,
                        canReceiveMail: true,
                    });
                }
                const settings = this.userSettingsStore.get(su.username);
                results.push(settings);
            }
            catch (err) {
                console.warn(`UserService: error checking Maildir for ${su.username}`, err);
            }
        }));
        this.cacheTimestamp = Date.now();
        return results;
    }
    async getUser(username) {
        if (this.userSettingsStore.size === 0) {
            await this.getAllUsersWithMaildir();
        }
        return this.userSettingsStore.get(username) ?? null;
    }
    async updateUser(username, updates) {
        const existing = await this.getUser(username);
        if (!existing)
            return null;
        const merged = { ...existing, ...updates, username: existing.username };
        this.userSettingsStore.set(username, merged);
        return merged;
    }
    async deactivateUser(username) {
        const existing = await this.getUser(username);
        if (!existing)
            return false;
        existing.canReceiveMail = false;
        this.userSettingsStore.set(username, existing);
        return true;
    }
    async refreshCache() {
        const sysUsers = await this.readSystemUsers();
        const sysUsernames = new Set(sysUsers.map((u) => u.username));
        for (const key of Array.from(this.userSettingsStore.keys())) {
            if (!sysUsernames.has(key)) {
                this.userSettingsStore.delete(key);
            }
        }
        return this.getAllUsersWithMaildir();
    }
    getStoreSnapshot() {
        return Array.from(this.userSettingsStore.values());
    }
}
export const authenticateUser = (username, password, service = "login") => {
    return new Promise((resolve, reject) => {
        authenticate(service, username, password, (err) => {
            if (err)
                return reject(err);
            resolve(true);
        });
    });
};
