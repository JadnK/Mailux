import type { FormEvent } from "react";
import { useState } from "react";
import { login } from "../api/mailClient";
import type { Session } from "../types/mail";

type LoginPanelProps = {
  onLogin: (session: Session) => void;
};

export function LoginPanel({ onLogin }: LoginPanelProps) {
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsBusy(true);

    try {
      const session = await login(username, password);
      localStorage.setItem("mailux.session", JSON.stringify(session));
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login fehlgeschlagen");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="brand-mark">M</div>
        <h1>Mailux</h1>
        <p>Schlichtes Webmail für deinen eigenen Mailserver.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Benutzer
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="root"
            />
          </label>

          <label>
            Passwort
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button className="primary-button" disabled={isBusy}>
            {isBusy ? "Anmelden…" : "Anmelden"}
          </button>
        </form>
      </section>
    </main>
  );
}
