import React, { useState, useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import Terminal from './Terminal';
import OutputPanel from './panels/OutputPanel';
import ProblemsPanel from './panels/ProblemsPanel';
import DebugConsole from './panels/DebugConsole';
import './Panel.css';

function Panel({
  terminals,
  onNewTerminal,
  onCloseTerminal,
  workspaceFolder,
  outputLogs = [],
  diagnostics = [],
  debugLogs = [],
  onClearOutput,
  onClearDiagnostics,
  onClearDebug,
  theme,
  onUpdateTerminalStatus,
  onTerminalOutput,
  terminalRef
}) {
  const [activeTab, setActiveTab] = useState('terminal');
  const [activeTerminal, setActiveTerminal] = useState(null);
  const terminalRefs = useRef({});

  const handleCloseTerminal = (terminalId) => {
    if (onCloseTerminal) {
      onCloseTerminal(terminalId);
    }
    // If we're closing the active terminal, switch to another one
    if (activeTerminal === terminalId && terminals.length > 1) {
      const otherTerminal = terminals.find(t => t.id !== terminalId);
      if (otherTerminal) {
        setActiveTerminal(otherTerminal.id);
      }
    }
  };

  useEffect(() => {
    if (terminals.length > 0 && !activeTerminal) {
      setActiveTerminal(terminals[0].id);
    }
  }, [terminals, activeTerminal]);

  // Expose active terminal ref to parent
  useEffect(() => {
    if (terminalRef && activeTerminal && terminalRefs.current[activeTerminal]) {
      terminalRef.current = terminalRefs.current[activeTerminal];
    }
  }, [activeTerminal, terminalRef]);

  const handleTerminalOutput = (terminalId, output) => {
    if (onTerminalOutput) {
      onTerminalOutput(terminalId, output, output);
    }
  };

  const handleStatusChange = (terminalId, status) => {
    if (onUpdateTerminalStatus) {
      onUpdateTerminalStatus(terminalId, status);
    }
  };

  return (
    <div className="panel">
      <div className="panel-tabs">
        <div className="panel-tab-list">
          <button
            className={`panel-tab ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            Terminal
          </button>
          <button
            className={`panel-tab ${activeTab === 'output' ? 'active' : ''}`}
            onClick={() => setActiveTab('output')}
          >
            Output
          </button>
          <button
            className={`panel-tab ${activeTab === 'problems' ? 'active' : ''}`}
            onClick={() => setActiveTab('problems')}
          >
            Problems
          </button>
          <button
            className={`panel-tab ${activeTab === 'debug' ? 'active' : ''}`}
            onClick={() => setActiveTab('debug')}
          >
            Debug Console
          </button>
        </div>
        {activeTab === 'terminal' && (
          <div className="terminal-tabs">
            {terminals.map((terminal) => (
              <button
                key={terminal.id}
                className={`terminal-tab ${activeTerminal === terminal.id ? 'active' : ''}`}
                onClick={() => setActiveTerminal(terminal.id)}
              >
                {terminal.status && (
                  <span className={`terminal-status-dot ${terminal.status}`} />
                )}
                <span className="terminal-tab-name">{terminal.name}</span>
                <span
                  className="terminal-close-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTerminal(terminal.id);
                  }}
                >
                  <FiX size={14} />
                </span>
              </button>
            ))}
            <button className="new-terminal-button" onClick={onNewTerminal}>
              +
            </button>
          </div>
        )}
      </div>
      <div className="panel-content">
        {activeTab === 'terminal' && terminals.length > 0 && (
          <div className="terminals-container">
            {terminals.map((terminal) => (
              <div
                key={terminal.id}
                className={`terminal-instance ${activeTerminal === terminal.id ? 'active' : 'hidden'}`}
              >
                <Terminal
                  ref={(el) => terminalRefs.current[terminal.id] = el}
                  terminalId={terminal.id}
                  workspaceFolder={workspaceFolder}
                  onOutput={(output) => handleTerminalOutput(terminal.id, output)}
                  onStatusChange={(status) => handleStatusChange(terminal.id, status)}
                />
              </div>
            ))}
          </div>
        )}
        {activeTab === 'terminal' && terminals.length === 0 && (
          <div className="empty-panel">
            <p>No terminal opened</p>
            <button className="primary-button" onClick={onNewTerminal}>
              New Terminal
            </button>
          </div>
        )}
        {activeTab === 'output' && (
          <OutputPanel outputLogs={outputLogs} />
        )}
        {activeTab === 'problems' && (
          <ProblemsPanel diagnostics={diagnostics} />
        )}
        {activeTab === 'debug' && (
          <DebugConsole debugLogs={debugLogs} />
        )}
      </div>
    </div>
  );
}

export default Panel;
