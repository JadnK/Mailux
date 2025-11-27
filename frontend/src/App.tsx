import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import InboxPage from "./pages/InboxPage";
import ComposePage from "./pages/ComposePage";
import LoginPage from "./pages/LoginPage";
import SentPage from "./pages/SentPage";

export default function App() {
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    if (token && username) setUser({ username });
  }, []);

  const handleLogin = (loggedInUser: { username: string }) => setUser(loggedInUser);
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InboxPage username={user.username} />} />
        <Route path="/compose" element={<ComposePage />} />
        <Route path="/sent" element={<SentPage username={user.username} />} />
        <Route path="*" element={<div className="p-6 text-center text-gray-300">Page not found</div>} />
      </Routes>
    </BrowserRouter>
  );
}