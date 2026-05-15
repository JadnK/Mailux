import React, { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Inbox, { type InboxRef } from './Inbox';
import Sent, { type SentRef } from './Sent';
import SendMailForm from './SendMailForm';
import Settings from './Settings';
import UserManagementModal from './UserManagementModal';

interface LayoutProps {
  token: string;
  username?: string;
  onLogout: () => void;
  onUserSwitch: (newToken: string, newUsername: string) => void;
}

const navigation = [
  { name: 'Inbox', href: '/', icon: '✉️', hint: 'Empfangen' },
  { name: 'Sent', href: '/sent', icon: '📤', hint: 'Gesendet' },
  { name: 'Compose', href: '/compose', icon: '✍️', hint: 'Neue Mail' },
  { name: 'Settings', href: '/settings', icon: '⚙️', hint: 'Profil' },
];

const Layout: React.FC<LayoutProps> = ({ token, username, onLogout, onUserSwitch }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [updating, setUpdating] = useState(false);
  const inboxRef = useRef<InboxRef>(null);
  const sentRef = useRef<SentRef>(null);
  const location = useLocation();

  const activeItem = navigation.find((item) => item.href === location.pathname) ?? navigation[0];
  const showUpdateButton = location.pathname === '/' || location.pathname === '/sent';

  const handleUpdate = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      if (location.pathname === '/') await inboxRef.current?.fetchMails();
      if (location.pathname === '/sent') await sentRef.current?.fetchMails();
    } finally {
      setUpdating(false);
    }
  };

  const sidebar = (
    <aside className="flex h-full flex-col overflow-hidden rounded-none border-r border-white/10 bg-slate-950/80 backdrop-blur-2xl lg:rounded-[2rem] lg:border lg:bg-slate-950/55">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-300 text-xl font-black text-white shadow-lg shadow-violet-950/50">M</div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">Mailux</h1>
            <p className="text-xs font-medium text-slate-400">Private Mail Console</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4">
        {navigation.map((item) => {
          const active = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3 transition ${active ? 'bg-white/[0.10] text-white shadow-lg shadow-black/20 ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-lg transition group-hover:bg-white/[0.10]">{item.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{item.name}</span>
                <span className="block text-xs text-slate-500">{item.hint}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <button type="button" onClick={() => setShowUserManagement(true)} className="mx-card-soft flex w-full items-center gap-3 p-3 text-left hover:bg-white/[0.07]">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-500 text-sm font-black text-white">
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{username || 'User'}</p>
            <p className="text-xs text-slate-400">Accounts verwalten</p>
          </div>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="mx-shell p-0 lg:p-4">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 gap-4 lg:grid-cols-[300px_1fr] lg:min-h-[calc(100vh-2rem)]">
        <div className="hidden lg:block">{sidebar}</div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} aria-label="Close menu" />
            <div className="relative h-full w-[84vw] max-w-sm p-3">{sidebar}</div>
          </div>
        )}

        <main className="min-w-0 lg:rounded-[2rem] lg:border lg:border-white/10 lg:bg-white/[0.035] lg:backdrop-blur-sm">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/75 px-4 py-4 backdrop-blur-2xl lg:rounded-t-[2rem] lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" onClick={() => setSidebarOpen(true)} className="mx-btn-secondary !px-3 lg:hidden" aria-label="Open menu">☰</button>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">{activeItem.hint}</p>
                  <h2 className="mt-1 truncate text-2xl font-black tracking-tight text-white">{activeItem.name}</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showUpdateButton && <button type="button" onClick={handleUpdate} disabled={updating} className="mx-btn-secondary">{updating ? 'Updating…' : 'Update'}</button>}
                <button type="button" onClick={onLogout} className="mx-btn-danger">Logout</button>
              </div>
            </div>
          </header>

          <section className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {location.pathname === '/' && <Inbox ref={inboxRef} token={token} />}
            {location.pathname === '/sent' && <Sent ref={sentRef} token={token} />}
            {location.pathname === '/compose' && username && <SendMailForm token={token} username={username} />}
            {location.pathname === '/settings' && username && <Settings token={token} username={username} />}
          </section>
        </main>
      </div>

      <UserManagementModal
        isOpen={showUserManagement}
        onClose={() => setShowUserManagement(false)}
        currentToken={token}
        onUserSwitch={onUserSwitch}
        currentUsername={username || ''}
      />
    </div>
  );
};

export default Layout;
