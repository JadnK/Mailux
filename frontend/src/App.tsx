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
  // Read once, synchronously, during the initial render - not in an effect,
  // which would cause an extra render pass and a visible flash of the login
  // screen before the saved session kicks in.
  const [session, setSession] = useState<Session | null>(() => readSavedSession());
  const [sessionExpired, setSessionExpired] = useState(false);

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

  if (!session) {
    return <LoginPanel onLogin={handleLogin} sessionExpired={sessionExpired} />;
  }

  // Every account is a real mailbox now, including admins (isAdmin - based
  // on system sudo/wheel membership, see the backend's requireAdmin) -
  // admin-only tools (user management, site settings) live inside MailShell
  // itself, behind a "Verwaltung" nav entry, instead of replacing the mail
  // client entirely the way the old root-only AdminShell used to.
  return <MailShell session={session} onLogout={handleLogout} />;
}
