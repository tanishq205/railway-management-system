import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div className="theme-toggle-group" role="group" aria-label="Color scheme theme picker">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
        title="Light Mode"
        aria-label="Light Mode"
      >
        <Sun size={14} />
      </button>

      <button
        type="button"
        onClick={() => setTheme('system')}
        className={`theme-toggle-btn ${theme === 'system' ? 'active' : ''}`}
        title={`System Default (${resolvedTheme})`}
        aria-label="System Default Theme"
      >
        <Monitor size={14} />
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
        title="Dark Mode"
        aria-label="Dark Mode"
      >
        <Moon size={14} />
      </button>
    </div>
  );
}
