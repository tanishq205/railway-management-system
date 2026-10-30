import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

// Automatically route /api requests to external backend URL if VITE_API_URL is configured
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
if (API_BASE) {
  const originalFetch = window.fetch;
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return originalFetch(`${API_BASE}${input}`, init);
    }
    return originalFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
