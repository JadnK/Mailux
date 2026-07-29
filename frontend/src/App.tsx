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
  const [sessionExpired, setSessionExpired] = useState(false);
  const [checkedStorage, setCheckedStorage] = useState(false);

  useEffect(() => {
    setSession(readSavedSession());
    setCheckedStorage(true);
  }, []);

  useEffect(() => {
    function handleExpired() {
      localStorage.removeItem("mailux.session");
      setSession(null);
      setSessionExpired(true);
    }

    window.addEventListener("mailux:session-expired", handleExpired);
    return () => window.removeEventListener("mailux:session-expired", handleExpired);
  }, []);

  function handleLogin(nextSession: Session) {
    setSessionExpired(false);
    setSession(nextSession);
  }

  function handleLogout() {
    localStorage.removeItem("mailux.session");
    setSession(null);
  }

  if (!checkedStorage) {
    return <div className="boot-screen" />;
  }

  if (!session) {
    return <LoginPanel onLogin={handleLogin} sessionExpired={sessionExpired} />;
  }

  return <MailShell session={session} onLogout={handleLogout} />;
}
