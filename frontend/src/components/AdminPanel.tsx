import { useState } from "react";

import { GlobalSettingsPanel } from "./GlobalSettingsPanel";
import { UserManagementPanel } from "./UserManagementPanel";
import type { Session } from "../types/mail";

type AdminPanelProps = {
  session: Session;
};

/**
 * Admin tools, reached from the "Verwaltung" sidebar entry that only shows
 * up for accounts with sudo (see MailShell) - unlike the old root-only
 * AdminShell, this lives inside the normal mail client instead of
 * replacing it, because an admin account is a real mailbox too now.
 */
export function AdminPanel({ session }: AdminPanelProps) {
  const [tab, setTab] = useState<"users" | "settings">("users");

  return (
    <main className="reader-panel">
      <header className="reader-header">
        <div>
          <h1>Verwaltung</h1>
          <p>Nutzer verwalten und server­weite Einstellungen - sichtbar, weil dieser Account Admin-Rechte (sudo) hat.</p>
        </div>
      </header>

      <div className="admin-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "users"}
          className={`admin-tab ${tab === "users" ? "active" : ""}`}
          onClick={() => setTab("users")}
        >
          Nutzer
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "settings"}
          className={`admin-tab ${tab === "settings" ? "active" : ""}`}
          onClick={() => setTab("settings")}
        >
          Server-Einstellungen
        </button>
      </div>

      <article className="message-body settings-body">
        {tab === "users" ? (
          <UserManagementPanel session={session} />
        ) : (
          <GlobalSettingsPanel session={session} />
        )}
      </article>
    </main>
  );
}
