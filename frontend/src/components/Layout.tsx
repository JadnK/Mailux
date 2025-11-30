import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Inbox from './Inbox';
import Sent from './Sent';
import SendMailForm from './SendMailForm';
import Settings from './Settings';

interface LayoutProps {
  token: string;
  username?: string;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ token, username, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Inbox', href: '/', icon: '📥' },
    { name: 'Sent', href: '/sent', icon: '📤' },
    { name: 'Compose', href: '/compose', icon: '✏️' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className={`sidebar sidebar-mobile ${sidebarOpen ? 'open' : ''} lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-gray-850">
            <h1 className="text-2xl font-bold text-purple-400">Mailux</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-link ${isActive(item.href) ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="user-avatar">
                  <span className="text-white text-sm font-medium">
                    {username ? username.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-300">
                    {username || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">Online</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Mobile Header */}
        <div className="lg:hidden header">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-300 hover:text-purple-400 focus:outline-none focus:text-purple-400"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-purple-400">Mailux</h1>
            <button
              onClick={onLogout}
              className="text-sm text-gray-300 hover:text-purple-400"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between h-16 px-6 header">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-300">
              {navigation.find(item => isActive(item.href))?.name || 'Mailux'}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="user-avatar">
                <span className="text-white text-sm font-medium">
                  {username ? username.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <span className="ml-2 text-sm text-gray-300">
                {username || 'User'}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="btn-primary"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              {location.pathname === '/' && <Inbox token={token} />}
              {location.pathname === '/sent' && <Sent token={token} />}
              {location.pathname === '/compose' && username && <SendMailForm token={token} username={username}/>}
              {location.pathname === '/settings' && username && <Settings token={token} username={username} />}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;