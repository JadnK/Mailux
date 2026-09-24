import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import {
  createUser,
  deleteUser,
  getUsers,
  setUserAdmin,
  type ManagedUser,
} from "../api/mailClient";
import type { Session } from "../types/mail";

type UserManagementPanelProps = {
  session: Session;
};

export function UserManagementPanel({ session }: UserManagementPanelProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [grantAdmin, setGrantAdmin] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAdminChange, setPendingAdminChange] = useState<string | null>(null);

  async function loadUsers() {
    setIsLoading(true);
    setError("");
    setNotice("");

    try {
      const data = await getUsers(session);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "User konnten nicht geladen werden");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanUsername = username.trim();

    setError("");
    setNotice("");

    if (!cleanUsername || !password) {
      setError("Username und Passwort sind Pflicht.");
      return;
    }

    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen haben.");
      return;
    }

    try {
      await createUser(session, cleanUsername, password, grantAdmin);
      setNotice(`User "${cleanUsername}" wurde erstellt.`);
      setUsername("");
      setPassword("");
      setGrantAdmin(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "User konnte nicht erstellt werden");
    }
  }

  async function handleDeleteUser(targetUsername: string) {
    const confirmed = window.confirm(
      `User "${targetUsername}" wirklich löschen? Das entfernt auch das Home-Verzeichnis/Maildir.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await deleteUser(session, targetUsername);
      setNotice(`User "${targetUsername}" wurde gelöscht.`);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "User konnte nicht gelöscht werden");
    }
  }

  async function handleToggleAdmin(user: ManagedUser) {
    setError("");
    setNotice("");
    setPendingAdminChange(user.username);

    try {
      await setUserAdmin(session, user.username, !user.isAdmin);
      setNotice(
        user.isAdmin
          ? `"${user.username}" ist jetzt kein Admin mehr.`
          : `"${user.username}" ist jetzt Admin.`
      );
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin-Status konnte nicht geändert werden");
    } finally {
      setPendingAdminChange(null);
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-section">
      {(error || notice) && (
        <div
          className={error ? "inline-message error" : "inline-message"}
          role="status"
          aria-live="polite"
        >
          {error || notice}
        </div>
      )}

      <form className="compose-window user-create-form" onSubmit={handleCreateUser}>
        <header>
          <strong>Neuen User hinzufügen</strong>
        </header>

        <div className="compose-body">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            required
          />

          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Passwort, min. 8 Zeichen"
            type="password"
            required
          />

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={grantAdmin}
              onChange={(event) => setGrantAdmin(event.target.checked)}
            />
            Admin-Rechte geben (sudo) - kann dann auch andere User verwalten
          </label>
        </div>

        <footer>
          <button className="primary-button" type="submit">
            User erstellen
          </button>
        </footer>
      </form>

      <div className="user-list">
        <h2>Bestehende User</h2>

        {isLoading && <p>Lade User…</p>}

        {!isLoading && users.length === 0 && <p>Keine User gefunden.</p>}

        {!isLoading &&
          users.map((user) => {
            const isSelf = user.username === session.username;
            return (
              <div className="user-row" key={user.username}>
                <div>
                  <strong>
                    {user.username}
                    {user.isAdmin && <span className="admin-pill">Admin</span>}
                    {isSelf && <span className="self-pill">Du</span>}
                  </strong>
                  <p>Mail: {user.canReceiveMail ? "aktiv" : "inaktiv"}</p>
                </div>

                <div className="user-row-actions">
                  <button
                    className="ghost-button"
                    disabled={pendingAdminChange === user.username || (isSelf && user.isAdmin)}
                    onClick={() => handleToggleAdmin(user)}
                    title={
                      isSelf && user.isAdmin
                        ? "Du kannst dir nicht selbst die Admin-Rechte entziehen"
                        : undefined
                    }
                  >
                    {pendingAdminChange === user.username
                      ? "…"
                      : user.isAdmin
                        ? "Admin entziehen"
                        : "Admin machen"}
                  </button>

                  <button
                    className="danger-button"
                    disabled={isSelf}
                    onClick={() => handleDeleteUser(user.username)}
                    title={isSelf ? "Du kannst dich nicht selbst löschen" : "User löschen"}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
