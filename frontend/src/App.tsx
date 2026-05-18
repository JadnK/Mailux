import { useEffect, useState } from "react";
import { LoginPanel } from "./components/LoginPanel";
import { MailShell } from "./components/MailShell";
import type { Session } from "./types/mail";

function readSavedSession(): Session | null {
  try {
    const raw = localStorage.getItem("mailux.session");
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSession(readSavedSession());
  }, []);

  function handleLogout() {
    localStorage.removeItem("mailux.session");
    setSession(null);
  }

  if (!session) {
    return <LoginPanel onLogin={setSession} />;
  }

  return <MailShell session={session} onLogout={handleLogout} />;
}
