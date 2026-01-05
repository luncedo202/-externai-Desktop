import React from 'react';
import { FiGitBranch, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import './StatusBar.css';

function StatusBar({ activeFile, workspaceFolder, cursorPosition, onUpgradeClick }) {
  return (
    <div className="status-bar">
      <div className="status-left">
        {workspaceFolder && (
          <>
            <div className="status-item">
              <FiGitBranch size={14} />
              <span>main</span>
            </div>
            <div className="status-item upgrade-btn" onClick={onUpgradeClick}>
              <FiCheckCircle size={14} style={{ color: '#fbbf24' }} />
              <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>UPGRADE</span>
            </div>
          </>
        )}
      </div>
      <div className="status-right">
        {activeFile && (
          <>
            <div className="status-item">Ln {cursorPosition?.line || 1}, Col {cursorPosition?.column || 1}</div>
            <div className="status-item">{activeFile.language}</div>
            <div className="status-item">UTF-8</div>
            <div className="status-item">LF</div>
          </>
        )}
      </div>
    </div>
  );
}

export default StatusBar;
