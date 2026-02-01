import React from 'react';
import './NodeWarningModal.css';

function NodeWarningModal({ isOpen, onClose, onDownload }) {
  if (!isOpen) return null;

  return (
    <div className="node-warning-overlay" onClick={onClose}>
      <div className="node-warning-modal" onClick={(e) => e.stopPropagation()}>
        <div className="node-warning-header">
          <div className="node-warning-icon">⚠️</div>
          <h2>Node.js Required to Continue</h2>
        </div>
        
        <div className="node-warning-content">
          <p className="node-warning-main">
            <strong>ExternAI requires Node.js to function properly.</strong>
          </p>
          
          <p className="node-warning-description">
            ExternAI is a powerful development environment that helps you build applications with AI assistance. 
            To run commands, install packages, and execute your code, Node.js must be installed on your system.
          </p>
          
          <div className="node-warning-features">
            <h3>Why Node.js is Essential:</h3>
            <ul>
              <li>✓ <strong>Terminal Commands</strong> - Execute npm, node, and other development tools</li>
              <li>✓ <strong>Package Management</strong> - Install and manage dependencies for your projects</li>
              <li>✓ <strong>Build & Run Projects</strong> - Compile and run your applications</li>
              <li>✓ <strong>AI Code Execution</strong> - Let the AI install packages and run commands for you</li>
            </ul>
          </div>
          
          <div className="node-warning-steps">
            <h3>Installation Steps:</h3>
            <ol>
              <li>Click <strong>"Download Node.js"</strong> below</li>
              <li>Download the installer for your operating system</li>
              <li>Run the installer and follow the setup wizard</li>
              <li><strong>Restart ExternAI</strong> after installation completes</li>
            </ol>
          </div>
          
          <div className="node-warning-note">
            <p>
              <strong>⚠️ Important:</strong> After installing Node.js, you <strong>must restart ExternAI</strong> for the changes to take effect.
            </p>
          </div>
        </div>
        
        <div className="node-warning-actions">
          <button className="btn-secondary" onClick={onClose}>
            Later
          </button>
          <button className="btn-primary" onClick={onDownload}>
            Download Node.js →
          </button>
        </div>
      </div>
    </div>
  );
}

export default NodeWarningModal;
