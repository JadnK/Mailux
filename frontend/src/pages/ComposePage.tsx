import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import LoginPage from './LoginPage';

const ComposePage: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    
    if (savedToken && savedUsername) {
      setToken(savedToken);
      setUsername(savedUsername);
    }
  }, []);

  const handleLogin = (newToken: string, newUsername: string) => {
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
  };

  if (!token || !username) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Layout token={token} onLogout={handleLogout} />
  );
};

export default ComposePage;