import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
  username?: string;
  onLogout?: () => void;
}

const Layout: React.FC<Props> = ({ children, username, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <header className="bg-gray-800 shadow">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-purple-400">Mailux</h1>
          <nav className="flex items-center space-x-4">
            <Link to="/" className="hover:underline text-gray-100">Inbox</Link>
            <Link to="/compose" className="hover:underline text-gray-100">Compose</Link>
            <Link to="/sent" className="hover:underline text-gray-100">Sent</Link>
            
            {username && (
              <>
                <span className="ml-4 text-gray-400">Hi, {username}</span>
                {onLogout && (
                  <button onClick={onLogout} className="ml-2 text-sm text-purple-400 hover:underline">
                    Logout
                  </button>
                )}
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full">{children}</main>
      <footer className="mt-12 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Mailux
      </footer>
    </div>
  );
};

export default Layout;
