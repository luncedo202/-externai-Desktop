import React from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
import './Settings.css';

function Settings({ theme, onToggleTheme }) {
  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Settings</h2>
      </div>
      <div className="settings-content">
        <div className="settings-section">
          <h3>Appearance</h3>
          <div className="settings-item">
            <div className="settings-item-label">
              <span>Theme</span>
              <p className="settings-item-description">
                Choose between light and dark color themes
              </p>
            </div>
            <div className="settings-item-control">
              <button 
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => theme !== 'dark' && onToggleTheme()}
              >
                <FiMoon size={18} />
                <span>Dark</span>
              </button>
              <button 
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => theme !== 'light' && onToggleTheme()}
              >
                <FiSun size={18} />
                <span>Light</span>
              </button>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Editor</h3>
          <div className="settings-item">
            <div className="settings-item-label">
              <span>Font Size</span>
              <p className="settings-item-description">
                Control the font size in the editor
              </p>
            </div>
            <div className="settings-item-control">
              <span className="settings-value">14px</span>
            </div>
          </div>
          <div className="settings-item">
            <div className="settings-item-label">
              <span>Tab Size</span>
              <p className="settings-item-description">
                Number of spaces for indentation
              </p>
            </div>
            <div className="settings-item-control">
              <span className="settings-value">2</span>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>About</h3>
          <div className="settings-item">
            <div className="settings-item-label">
              <span>Version</span>
            </div>
            <div className="settings-item-control">
              <span className="settings-value">1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
