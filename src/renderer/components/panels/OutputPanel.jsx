import React, { useState, useEffect, useRef } from 'react';
import './OutputPanel.css';

function OutputPanel({ outputLogs = [] }) {
  const [selectedChannel, setSelectedChannel] = useState('All');
  const [autoScroll, setAutoScroll] = useState(true);
  const outputRef = useRef(null);

  // Get unique channels
  const channels = ['All', ...new Set(outputLogs.map(log => log.channel).filter(Boolean))];

  // Filter logs by channel
  const filteredLogs = selectedChannel === 'All' 
    ? outputLogs 
    : outputLogs.filter(log => log.channel === selectedChannel);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const handleClear = () => {
    if (window.electronAPI?.output?.clear) {
      window.electronAPI.output.clear(selectedChannel === 'All' ? null : selectedChannel);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  const getLogClass = (type) => {
    switch (type) {
      case 'error':
        return 'log-error';
      case 'warning':
        return 'log-warning';
      case 'success':
        return 'log-success';
      default:
        return 'log-info';
    }
  };

  return (
    <div className="output-panel">
      <div className="output-toolbar">
        <div className="output-channels">
          <select 
            value={selectedChannel} 
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="channel-select"
          >
            {channels.map(channel => (
              <option key={channel} value={channel}>{channel}</option>
            ))}
          </select>
        </div>
        <div className="output-actions">
          <button 
            className={`icon-button ${autoScroll ? 'active' : ''}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title="Toggle Auto Scroll"
          >
            ⬇
          </button>
          <button 
            className="icon-button"
            onClick={handleClear}
            title="Clear Output"
          >
            🗑
          </button>
        </div>
      </div>
      <div className="output-content" ref={outputRef}>
        {filteredLogs.length === 0 ? (
          <div className="empty-output">
            <p>No output yet</p>
            <small>Output from tasks and commands will appear here</small>
          </div>
        ) : (
          <div className="output-logs">
            {filteredLogs.map((log, index) => (
              <div key={index} className={`output-line ${getLogClass(log.type)}`}>
                <span className="log-time">[{formatTime(log.timestamp)}]</span>
                {log.channel && <span className="log-channel">[{log.channel}]</span>}
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OutputPanel;
