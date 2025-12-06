import React, { useState, useEffect } from 'react';
import { FiPlay, FiStopCircle, FiRefreshCw, FiSettings } from 'react-icons/fi';
import './RunDebug.css';

function RunDebug({ workspaceFolder, onRunCommand }) {
  const [configurations, setConfigurations] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Load package.json scripts if available
    if (workspaceFolder) {
      loadPackageScripts();
    }
  }, [workspaceFolder]);

  const loadPackageScripts = async () => {
    try {
      const packagePath = `${workspaceFolder}/package.json`;
      const result = await window.electronAPI.fs.readFile(packagePath);
      
      if (result.success && result.content) {
        const packageJson = JSON.parse(result.content);
        if (packageJson.scripts) {
          const configs = Object.entries(packageJson.scripts).map(([name, command]) => ({
            name,
            command: `npm run ${name}`,
            type: 'npm',
            description: command
          }));
          setConfigurations(configs);
          if (configs.length > 0 && !selectedConfig) {
            setSelectedConfig(configs[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load package.json scripts:', err);
    }
  };

  const handleRun = async () => {
    if (!selectedConfig || !workspaceFolder) return;
    
    setIsRunning(true);
    
    try {
      // Execute the command
      if (onRunCommand) {
        await onRunCommand(selectedConfig.command);
      } else {
        await window.electronAPI.terminalExecute(selectedConfig.command, workspaceFolder);
      }
    } catch (err) {
      console.error('Failed to run command:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    // TODO: Implement actual process stopping
  };

  return (
    <div className="run-debug">
      <div className="run-debug-header">
        <h3>RUN AND DEBUG</h3>
      </div>
      
      <div className="run-debug-content">
        {!workspaceFolder ? (
          <div className="run-debug-empty">
            <p>Open a folder to run and debug</p>
          </div>
        ) : configurations.length === 0 ? (
          <div className="run-debug-empty">
            <p>No configurations found</p>
            <button className="run-debug-reload" onClick={loadPackageScripts}>
              <FiRefreshCw size={14} />
              Reload Scripts
            </button>
          </div>
        ) : (
          <>
            <div className="run-debug-config">
              <select 
                value={selectedConfig?.name || ''} 
                onChange={(e) => {
                  const config = configurations.find(c => c.name === e.target.value);
                  setSelectedConfig(config);
                }}
                className="config-select"
              >
                {configurations.map(config => (
                  <option key={config.name} value={config.name}>
                    {config.name}
                  </option>
                ))}
              </select>
              
              <button 
                className="run-debug-settings"
                title="Configuration Settings"
              >
                <FiSettings size={16} />
              </button>
            </div>

            <div className="run-debug-actions">
              {!isRunning ? (
                <button 
                  className="run-button"
                  onClick={handleRun}
                  disabled={!selectedConfig}
                >
                  <FiPlay size={16} />
                  Start Debugging
                </button>
              ) : (
                <button 
                  className="stop-button"
                  onClick={handleStop}
                >
                  <FiStopCircle size={16} />
                  Stop
                </button>
              )}
            </div>

            {selectedConfig && (
              <div className="run-debug-info">
                <h4>Configuration</h4>
                <div className="config-details">
                  <div className="config-item">
                    <span className="config-label">Name:</span>
                    <span className="config-value">{selectedConfig.name}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">Type:</span>
                    <span className="config-value">{selectedConfig.type}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">Command:</span>
                    <span className="config-value">{selectedConfig.description}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default RunDebug;
