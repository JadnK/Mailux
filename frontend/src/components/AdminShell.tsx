import { useState } from "react";

import { GlobalSettingsPanel } from "./GlobalSettingsPanel";
import { UserManagementPanel } from "./UserManagementPanel";
import type { Session } from "../types/mail";
import { initialsOf } from "../utils/text";

type AdminShellProps = {
  session: Session;
  onLogout: () => void;
};

/**
 * The entire logged-in view for the root account. root is an
 * administrator, not a mailbox owner in the UI's eyes - it never sees
 * folders, compose, or anyone's mail here, only the two things it's
 * actually meant to manage: mail users and site-wide settings. See
 * MailShell for the (unprivileged) mail client every other account gets.
 */
export function AdminShell({ session, onLogout }: AdminShellProps) {
  const [activeView, setActiveView] = useState<"users" | "settings">("users");

  return (
    <div className="mail-app admin-app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="account-block">
            <div className="product-name">Mailux</div>
            <div className="account-line">
              <span className="account-avatar">{initialsOf(session.username)}</span>
              <span>{session.username}</span>
              <span className="root-pill">root</span>
            </div>
          </div>
          <button className="icon-button" onClick={onLogout} title="Abmelden" aria-label="Abmelden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </div>

        <p className="admin-sidebar-label">Administration</p>

        <nav className="folder-list admin-nav">
          <button
            className={`folder-button ${activeView === "users" ? "active" : ""}`}
            onClick={() => setActiveView("users")}
          >
            <span className="folder-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Nutzer verwalten
            </span>
          </button>

          <button
            className={`folder-button ${activeView === "settings" ? "active" : ""}`}
            onClick={() => setActiveView("settings")}
          >
            <span className="folder-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Server-Einstellungen
            </span>
          </button>
        </nav>
      </aside>

      {activeView === "users" ? (
        <UserManagementPanel session={session} />
      ) : (
        <GlobalSettingsPanel session={session} />
      )}
    </div>
  );
}
