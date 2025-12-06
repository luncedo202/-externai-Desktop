import React, { useState } from 'react';
import './ProblemsPanel.css';

function ProblemsPanel({ diagnostics = [] }) {
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [groupByFile, setGroupByFile] = useState(true);

  // Count diagnostics by severity
  const counts = {
    error: diagnostics.filter(d => d.severity === 'error').length,
    warning: diagnostics.filter(d => d.severity === 'warning').length,
    info: diagnostics.filter(d => d.severity === 'info').length,
  };

  // Filter diagnostics
  const filteredDiagnostics = filterSeverity === 'all'
    ? diagnostics
    : diagnostics.filter(d => d.severity === filterSeverity);

  // Group diagnostics by file
  const groupedDiagnostics = groupByFile
    ? filteredDiagnostics.reduce((acc, diag) => {
        const file = diag.file || 'Unknown';
        if (!acc[file]) acc[file] = [];
        acc[file].push(diag);
        return acc;
      }, {})
    : { 'All Files': filteredDiagnostics };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  };

  const handleDiagnosticClick = (diagnostic) => {
    // TODO: Open file and jump to line
    console.log('Open diagnostic:', diagnostic);
  };

  const handleClear = () => {
    if (window.electronAPI?.diagnostics?.clear) {
      window.electronAPI.diagnostics.clear(null);
    }
  };

  return (
    <div className="problems-panel">
      <div className="problems-toolbar">
        <div className="problems-stats">
          <button
            className={`stat-button ${filterSeverity === 'all' ? 'active' : ''}`}
            onClick={() => setFilterSeverity('all')}
          >
            All ({diagnostics.length})
          </button>
          <button
            className={`stat-button error ${filterSeverity === 'error' ? 'active' : ''}`}
            onClick={() => setFilterSeverity('error')}
          >
            ❌ {counts.error}
          </button>
          <button
            className={`stat-button warning ${filterSeverity === 'warning' ? 'active' : ''}`}
            onClick={() => setFilterSeverity('warning')}
          >
            ⚠️ {counts.warning}
          </button>
          <button
            className={`stat-button info ${filterSeverity === 'info' ? 'active' : ''}`}
            onClick={() => setFilterSeverity('info')}
          >
            ℹ️ {counts.info}
          </button>
        </div>
        <div className="problems-actions">
          <button
            className={`icon-button ${groupByFile ? 'active' : ''}`}
            onClick={() => setGroupByFile(!groupByFile)}
            title="Group by File"
          >
            📁
          </button>
          <button
            className="icon-button"
            onClick={handleClear}
            title="Clear Problems"
          >
            🗑
          </button>
        </div>
      </div>
      <div className="problems-content">
        {filteredDiagnostics.length === 0 ? (
          <div className="empty-problems">
            <p>✓ No problems detected</p>
            <small>Problems will appear here as you work</small>
          </div>
        ) : (
          <div className="problems-list">
            {Object.entries(groupedDiagnostics).map(([file, diags]) => (
              <div key={file} className="problem-group">
                {groupByFile && (
                  <div className="problem-file-header">
                    <span className="file-name">{file}</span>
                    <span className="file-count">{diags.length} problem{diags.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {diags.map((diagnostic, index) => (
                  <div
                    key={index}
                    className={`problem-item ${diagnostic.severity}`}
                    onClick={() => handleDiagnosticClick(diagnostic)}
                  >
                    <span className="problem-icon">{getSeverityIcon(diagnostic.severity)}</span>
                    <div className="problem-details">
                      <div className="problem-message">{diagnostic.message}</div>
                      <div className="problem-location">
                        {!groupByFile && <span className="problem-file">{diagnostic.file}</span>}
                        <span className="problem-position">
                          Line {diagnostic.line}, Col {diagnostic.column}
                        </span>
                        {diagnostic.source && (
                          <span className="problem-source">[{diagnostic.source}]</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProblemsPanel;
