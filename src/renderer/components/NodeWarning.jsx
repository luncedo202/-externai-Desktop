import React from 'react';
import './NodeWarning.css';

function NodeWarning({ onDismiss }) {
  const handleDownload = async () => {
    if (window.electronAPI?.system?.openExternal) {
      await window.electronAPI.system.openExternal('https://nodejs.org/en/download/');
    } else {
      window.open('https://nodejs.org/en/download/', '_blank');
    }
  };

  return (
    <div className="node-warning-overlay">
      <div className="node-warning-modal">
        <div className="node-warning-icon">!</div>
        <h2>Node.js Not Found</h2>
        <p>
          ExternAI requires <strong>Node.js</strong> to run commands like <code>npm install</code>, 
          <code>npm run dev</code>, and to build your projects.
        </p>
        
        <div className="node-warning-steps">
          <h3>Quick Setup (2 minutes):</h3>
          <ol>
            <li>Click the button below to download Node.js</li>
            <li>Run the installer (click "Next" through all steps)</li>
            <li>Restart ExternAI</li>
          </ol>
        </div>

        <div className="node-warning-note">
          <strong>Tip:</strong> Choose the "LTS" (Long Term Support) version for best compatibility.
        </div>

        <div className="node-warning-actions">
          <button className="node-warning-download" onClick={handleDownload}>
            Download Node.js
          </button>
          <button className="node-warning-dismiss" onClick={onDismiss}>
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  );
}

export default NodeWarning;
