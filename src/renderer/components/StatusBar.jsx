import React from 'react';
import { FiGitBranch, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import './StatusBar.css';

function StatusBar({ activeFile, workspaceFolder, cursorPosition }) {
  return (
    <div className="status-bar">
      <div className="status-left">
        {workspaceFolder && (
          <>
            <div className="status-item">
              <FiGitBranch size={14} />
              <span>main</span>
            </div>
            <div className="status-item">
              <FiCheckCircle size={14} />
              <span>0</span>
            </div>
            <div className="status-item">
              <FiAlertCircle size={14} />
              <span>0</span>
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
