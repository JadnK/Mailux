import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import {
  createUser,
  deleteUser,
  getUsers,
  isRootUser,
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
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const root = isRootUser(session.username);

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
      await createUser(session, cleanUsername, password);
      setNotice(`User "${cleanUsername}" wurde erstellt.`);
      setUsername("");
      setPassword("");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "User konnte nicht erstellt werden");
    }
  }

  async function handleDeleteUser(targetUsername: string) {
    if (isRootUser(targetUsername)) {
      setError("Root kann nicht gelöscht werden.");
      return;
    }

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

  useEffect(() => {
    if (root) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  if (!root) {
    return (
      <main className="reader-panel">
        <div className="empty-reader">
          <h2>Kein Zugriff</h2>
          <p>User-Management ist nur verfügbar, wenn du als root angemeldet bist.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="reader-panel">
      <header className="reader-header">
        <div>
          <h1>User verwalten</h1>
          <p>Nur root kann Mail-User hinzufügen oder löschen.</p>
        </div>

        <button className="ghost-button" onClick={loadUsers}>
          Aktualisieren
        </button>
      </header>

      <article className="message-body">
        {(error || notice) && (
          <div className={error ? "inline-message error" : "inline-message"}>
            {error || notice}
          </div>
        )}

        <form className="compose-window user-create-form" onSubmit={handleCreateUser}>
          <header>
            <strong>Neuen User hinzufügen</strong>
          </header>

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
            users.map((user) => (
              <div className="user-row" key={user.username}>
                <div>
                  <strong>{user.username}</strong>
                  <p>Mail: {user.canReceiveMail ? "aktiv" : "inaktiv"}</p>
                </div>

                <button
                  className="danger-button"
                  disabled={isRootUser(user.username)}
                  onClick={() => handleDeleteUser(user.username)}
                  title={isRootUser(user.username) ? "Root kann nicht gelöscht werden" : "User löschen"}
                >
                  Löschen
                </button>
              </div>
            ))}
        </div>
      </article>
    </main>
  );
}