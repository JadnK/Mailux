import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import InboxPage from './pages/InboxPage';
import SentPage from './pages/SentPage';
import ComposePage from './pages/ComposePage';
import './index.css';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<InboxPage />} />
        <Route path="/sent" element={<SentPage />} />
        <Route path="/compose" element={<ComposePage />} />
      </Routes>
    </Router>
  );
};

export default App;