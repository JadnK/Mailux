import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import InboxPage from "./pages/InboxPage";
import SendMailForm from "./components/SendMailForm";
import LoginPage from "./pages/LoginPage";

export default function App() {
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  if (!user) {
    return <LoginPage onLogin={(u: { username: string }) => setUser(u)} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <Routes>
          <Route path="/" element={<InboxPage username={user.username} />} />
          <Route path="/compose" element={<SendMailForm />} />
          <Route path="*" element={<div className="p-6 text-center">Page not found</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
