import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Inbox from "./components/Inbox";
import SendMailForm from "./components/SendMailForm";

export default function App() {
  const username = (import.meta.env.VITE_USERNAME as string) || "jaden";

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-white shadow">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">Mailux</h1>
            <nav className="space-x-4">
              <Link to="/" className="text-sm hover:underline">Inbox</Link>
              <Link to="/compose" className="text-sm hover:underline">Compose</Link>
            </nav>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Inbox username={username} />} />
            <Route path="/compose" element={<SendMailForm />} />
            <Route path="*" element={<div>Page not found</div>} />
          </Routes>
        </main>

        <footer className="mt-12 py-4 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Mailux
        </footer>
      </div>
    </BrowserRouter>
  );
}