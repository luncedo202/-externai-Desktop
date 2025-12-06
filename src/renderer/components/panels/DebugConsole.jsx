import React, { useState, useRef, useEffect } from 'react';
import './DebugConsole.css';

function DebugConsole({ debugLogs = [] }) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef(null);
  const outputRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [debugLogs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    // Add to history
    setHistory(prev => [...prev, input]);
    setHistoryIndex(-1);

    // Add input to logs
    const inputLog = {
      timestamp: new Date().toISOString(),
      message: `> ${input}`,
      level: 'input',
    };

    // Evaluate expression
    try {
      if (window.electronAPI?.debug?.evaluate) {
        const result = await window.electronAPI.debug.evaluate(input);
        
        const resultLog = {
          timestamp: new Date().toISOString(),
          message: result.success ? result.result : `Error: ${result.error}`,
          level: result.success ? 'log' : 'error',
          type: result.type,
        };

        // Log through IPC
        await window.electronAPI.debug.log(inputLog.message, inputLog.level);
        await window.electronAPI.debug.log(resultLog.message, resultLog.level);
      }
    } catch (error) {
      console.error('Debug evaluation error:', error);
    }

    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      }
    }
  };

  const handleClear = () => {
    // Clear debug logs
    if (window.electronAPI?.debug?.log) {
      window.electronAPI.debug.log('Console cleared', 'clear');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
  };

  const getLogClass = (level) => {
    switch (level) {
      case 'error':
        return 'debug-error';
      case 'warning':
        return 'debug-warning';
      case 'input':
        return 'debug-input';
      case 'clear':
        return 'debug-clear';
      default:
        return 'debug-log';
    }
  };

  return (
    <div className="debug-console">
      <div className="debug-toolbar">
        <div className="debug-info">
          <span>Debug Console</span>
        </div>
        <div className="debug-actions">
          <button
            className="icon-button"
            onClick={handleClear}
            title="Clear Console"
          >
            🗑
          </button>
        </div>
      </div>
      <div className="debug-content" ref={outputRef}>
        {debugLogs.length === 0 ? (
          <div className="empty-debug">
            <p>Debug Console</p>
            <small>Evaluate expressions, inspect variables, and view debug output</small>
            <div className="debug-examples">
              <p>Try these examples:</p>
              <code>2 + 2</code>
              <code>JSON.stringify({'{'}name: "test"{'}'}, null, 2)</code>
              <code>process.platform</code>
            </div>
          </div>
        ) : (
          <div className="debug-logs">
            {debugLogs.map((log, index) => (
              <div key={index} className={`debug-line ${getLogClass(log.level)}`}>
                <span className="debug-time">[{formatTime(log.timestamp)}]</span>
                <span className="debug-message">
                  {log.message}
                  {log.type && log.level !== 'input' && log.level !== 'error' && (
                    <span className="debug-type"> ({log.type})</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <form className="debug-input-area" onSubmit={handleSubmit}>
        <span className="debug-prompt">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Evaluate expression..."
          className="debug-input"
          autoComplete="off"
        />
      </form>
    </div>
  );
}

export default DebugConsole;
