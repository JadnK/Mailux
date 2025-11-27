import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
  username?: string;
}

const Layout: React.FC<Props> = ({ children, username }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800 shadow">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-purple-400">Mailux</h1>
          <nav className="space-x-4">
            <Link to="/" className="hover:underline text-gray-100">Inbox</Link>
            <Link to="/compose" className="hover:underline text-gray-100">Compose</Link>
            {username && <span className="ml-4 text-gray-400">Hi, {username}</span>}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      <footer className="mt-12 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Mailux
      </footer>
    </div>
  );
};

export default Layout;
