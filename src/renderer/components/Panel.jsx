import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { FiX } from 'react-icons/fi';
import '@xterm/xterm/css/xterm.css';
import OutputPanel from './panels/OutputPanel';
import ProblemsPanel from './panels/ProblemsPanel';
import DebugConsole from './panels/DebugConsole';
import './Panel.css';

const Panel = forwardRef(({ 
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
}, ref) => {
  const [activeTab, setActiveTab] = useState('terminal');
  const [activeTerminal, setActiveTerminal] = useState(null);
  const terminalRefsMap = useRef({});
  const terminalInstances = useRef({});
  const fitAddons = useRef({});
  const backendTerminalIds = useRef({}); // Store backend terminal IDs
  const terminalOutputBuffers = useRef({}); // Store output per terminal

  // Expose executeCommand method via ref for AI to use
  useImperativeHandle(ref, () => ({
    executeCommand: (command) => {
      if (!activeTerminal) {
        console.warn('[Panel] No active terminal for command execution');
        return;
      }
      
      const backendId = backendTerminalIds.current[activeTerminal];
      if (!backendId) {
        console.warn('[Panel] No backend terminal ID for active terminal');
        return;
      }
      
      // Write command + newline to the terminal
      window.electronAPI.terminal.write(backendId, command + '\n');
      console.log('[Panel] Executed command:', command);
    },
    getTerminalOutput: () => {
      if (!activeTerminal) return '';
      return terminalOutputBuffers.current[activeTerminal] || '';
    }
  }), [activeTerminal]);

  // Also expose via terminalRef prop if provided (initial setup)
  useEffect(() => {
    if (terminalRef && !terminalRef.current) {
      terminalRef.current = {
        executeCommand: (command) => {
          console.warn('[Panel] Terminal not yet initialized, command queued');
        },
        getTerminalOutput: () => ''
      };
    }
  }, [terminalRef]);

  const handleCloseTerminal = async (terminalId) => {
    // Close the terminal in the backend
    const backendId = backendTerminalIds.current[terminalId];
    if (backendId) {
      try {
        await window.electronAPI.terminal.kill(backendId);
      } catch (error) {
        console.error('Error killing terminal:', error);
      }
    }
    
    // Cleanup refs
    if (terminalInstances.current[terminalId]) {
      terminalInstances.current[terminalId].dispose();
      delete terminalInstances.current[terminalId];
    }
    delete terminalRefsMap.current[terminalId];
    delete fitAddons.current[terminalId];
    delete backendTerminalIds.current[terminalId];
    delete terminalOutputBuffers.current[terminalId];
    
    // Close in parent component
    if (onCloseTerminal) {
      onCloseTerminal(terminalId);
    }
  };

  useEffect(() => {
    if (terminals.length > 0 && !activeTerminal) {
      setActiveTerminal(terminals[0].id);
    }
  }, [terminals, activeTerminal]);

  useEffect(() => {
    const initTerminal = async (terminalId) => {
      const container = terminalRefsMap.current[terminalId];
      if (!container || terminalInstances.current[terminalId]) return;

      // Initialize output buffer
      terminalOutputBuffers.current[terminalId] = '';

      const term = new XTerm({
        cursorBlink: true,
        fontSize: 12,
        fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
        theme: theme === 'light' ? {
          background: '#ffffff',
          foreground: '#3b3b3b',
          cursor: '#3b3b3b',
          selection: '#add6ff',
          black: '#000000',
          red: '#c5221f',
          green: '#1e8e3e',
          yellow: '#f57c00',
          blue: '#1967d2',
          magenta: '#a142f4',
          cyan: '#00acc1',
          white: '#5f6368',
          brightBlack: '#80868b',
          brightRed: '#ea4335',
          brightGreen: '#34a853',
          brightYellow: '#fbbc04',
          brightBlue: '#4285f4',
          brightMagenta: '#c678dd',
          brightCyan: '#00bcd4',
          brightWhite: '#3b3b3b',
        } : {
          background: '#1e1e1e',
          foreground: '#cccccc',
          cursor: '#ffffff',
          selection: '#264f78',
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(container);
      fitAddon.fit();

      terminalInstances.current[terminalId] = term;
      fitAddons.current[terminalId] = fitAddon;

      // Create terminal backend
      const result = await window.electronAPI.terminal.create(workspaceFolder);
      
      if (!result.success) {
        // Show error message in terminal
        term.writeln('\x1b[1;31mTerminal Error:\x1b[0m ' + result.error);
        term.writeln('\x1b[33mPlease run:\x1b[0m npm rebuild node-pty');
        term.writeln('');
        term.writeln('The app will work without terminal, but you won\'t be able to run commands.');
        return;
      }
      
      if (result.success) {
        // Store the backend terminal ID
        backendTerminalIds.current[terminalId] = result.terminalId;
        
        // Update terminalRef with the now-available backend ID
        if (terminalRef) {
          terminalRef.current = {
            executeCommand: (command) => {
              const backendId = backendTerminalIds.current[activeTerminal];
              if (!backendId) {
                console.warn('[Panel] No backend terminal ID for command execution');
                return;
              }
              window.electronAPI.terminal.write(backendId, command + '\n');
              console.log('[Panel] Executed command via terminalRef:', command);
            },
            getTerminalOutput: () => {
              return terminalOutputBuffers.current[activeTerminal] || '';
            }
          };
        }
        
        // Handle terminal input from user
        term.onData((data) => {
          window.electronAPI.terminal.write(result.terminalId, data);
        });

        // Handle terminal data from backend (node-pty)
        window.electronAPI.terminal.onData((id, data) => {
          if (id === result.terminalId) {
            term.write(data);
            
            // Store output in buffer (keep last ~50KB)
            terminalOutputBuffers.current[terminalId] = 
              (terminalOutputBuffers.current[terminalId] || '') + data;
            if (terminalOutputBuffers.current[terminalId].length > 50000) {
              terminalOutputBuffers.current[terminalId] = 
                terminalOutputBuffers.current[terminalId].slice(-40000);
            }
            
            // Notify parent of terminal output for AI auto-fix
            if (onTerminalOutput) {
              onTerminalOutput(terminalId, data, terminalOutputBuffers.current[terminalId]);
            }
            
            // Detect command completion status for terminal tab indicators
            if (onUpdateTerminalStatus) {
              // Check for common error patterns
              const hasError = /error|Error|ERROR|failed|Failed|FAILED|npm ERR!|ENOENT|EACCES|command not found/.test(data);
              const hasSuccess = /✓|success|Success|SUCCESS|Done|Compiled successfully|webpack compiled|Ready in|Server running/.test(data);
              
              if (hasError) {
                onUpdateTerminalStatus(terminalId, 'error');
              } else if (hasSuccess) {
                onUpdateTerminalStatus(terminalId, 'success');
              }
            }
          }
        });

        // Handle terminal resize
        const resizeObserver = new ResizeObserver(() => {
          fitAddon.fit();
          window.electronAPI.terminal.resize(
            result.terminalId,
            term.cols,
            term.rows
          );
        });
        resizeObserver.observe(container);
      }
    };

    if (activeTerminal && terminalRefsMap.current[activeTerminal]) {
      initTerminal(activeTerminal);
    }
  }, [activeTerminal, workspaceFolder, theme, onTerminalOutput, onUpdateTerminalStatus]);

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
                className={`terminal-tab ${activeTerminal === terminal.id ? 'active' : ''} ${terminal.status || ''}`}
                onClick={() => setActiveTerminal(terminal.id)}
              >
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
                ref={(el) => (terminalRefsMap.current[terminal.id] = el)}
                className={`terminal-instance ${activeTerminal === terminal.id ? 'active' : 'hidden'}`}
                data-terminal-id={backendTerminalIds.current[terminal.id] || ''}
              />
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
});

Panel.displayName = 'Panel';

export default Panel;
