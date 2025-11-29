import React, { useState } from 'react';
import Inbox from './Inbox';
import Sent from './Sent';
import SendMailForm from './SendMailForm';

interface LayoutProps {
  token: string;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ token, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMailSent = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab('sent');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-850 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-purple-400">Mailux</h1>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium rounded-md bg-purple-600 hover:bg-purple-700 text-white focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-850 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['inbox', 'sent', 'compose'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-purple-400 hover:border-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'inbox' && <Inbox token={token} key={`inbox-${refreshKey}`} />}
          {activeTab === 'sent' && <Sent token={token} key={`sent-${refreshKey}`} />}
          {activeTab === 'compose' && <SendMailForm token={token} onMailSent={handleMailSent} />}
        </div>
      </main>
    </div>
  );
};

export default Layout;
