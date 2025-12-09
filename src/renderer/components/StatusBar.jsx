import React, { useState } from 'react';
import { FiGitBranch, FiAlertCircle, FiCheckCircle, FiUploadCloud } from 'react-icons/fi';
import VercelService from '../services/VercelService';
import './StatusBar.css';

function StatusBar({ activeFile, workspaceFolder, onDeployStart }) {
  const [deploying, setDeploying] = useState(false);

  const handleDeploy = async () => {
    if (!workspaceFolder) {
      alert('Please open a project folder first');
      return;
    }

    if (deploying) {
      return;
    }

    try {
      setDeploying(true);
      
      // Notify parent component to show AI assistant
      if (onDeployStart) {
        onDeployStart();
      }

      await VercelService.deployToVercel(workspaceFolder, (message) => {
        console.log('[Deploy]', message);
      });
    } catch (error) {
      console.error('[Deploy Error]', error);
      alert(`Deployment failed: ${error.message}`);
    } finally {
      setDeploying(false);
    }
  };

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
            <div 
              className={`status-item status-deploy ${deploying ? 'deploying' : ''}`}
              onClick={handleDeploy}
              title="Deploy to Vercel"
            >
              <FiUploadCloud size={14} />
              <span>{deploying ? 'Deploying...' : 'Deploy'}</span>
            </div>
          </>
        )}
      </div>
      <div className="status-right">
        {activeFile && (
          <>
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
