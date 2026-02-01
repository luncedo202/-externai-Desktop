import React, { useState, useEffect } from 'react';
import { FiGlobe, FiTrash2, FiExternalLink, FiCopy, FiRefreshCw, FiX } from 'react-icons/fi';
import PublishService from '../services/PublishService';
import './PublishedApps.css';

function PublishedApps({ onClose }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    setLoading(true);
    setError(null);
    
    const result = await PublishService.getMyApps();
    
    if (result.success) {
      setApps(result.apps);
    } else {
      setError(result.error || 'Failed to load apps');
    }
    
    setLoading(false);
  };

  const handleCopyUrl = async (url, appId) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(appId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOpenApp = (url) => {
    if (window.electronAPI?.shell?.openExternal) {
      window.electronAPI.shell.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleDeleteApp = async (appId) => {
    if (!confirm('Are you sure you want to unpublish this app? The URL will no longer work.')) {
      return;
    }

    setDeletingId(appId);
    
    const result = await PublishService.unpublishApp(appId);
    
    if (result.success) {
      setApps(apps.filter(app => app.appId !== appId));
    } else {
      alert('Failed to unpublish: ' + result.error);
    }
    
    setDeletingId(null);
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="published-apps-overlay">
      <div className="published-apps-modal">
        <div className="published-apps-header">
          <h2><FiGlobe /> My Published Apps</h2>
          <button className="close-button" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="published-apps-content">
          {loading ? (
            <div className="loading-state">
              <FiRefreshCw className="spinning" size={24} />
              <p>Loading your apps...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={loadApps}>Try Again</button>
            </div>
          ) : apps.length === 0 ? (
            <div className="empty-state">
              <FiGlobe size={48} />
              <h3>No Published Apps Yet</h3>
              <p>When you publish a project, it will appear here.</p>
              <p className="hint">Click the <strong>Publish</strong> button in the editor toolbar to get started!</p>
            </div>
          ) : (
            <div className="apps-list">
              {apps.map(app => (
                <div key={app.appId} className="app-card">
                  <div className="app-info">
                    <h3>{app.displayName}</h3>
                    <p className="app-url">{app.url}</p>
                    <div className="app-meta">
                      <span className="visits">{app.visits || 0} visits</span>
                      <span className="separator">•</span>
                      <span className="date">Updated {formatDate(app.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="app-actions">
                    <button 
                      className="action-button"
                      onClick={() => handleCopyUrl(app.url, app.appId)}
                      title="Copy URL"
                    >
                      {copiedId === app.appId ? '✓ Copied!' : <FiCopy size={16} />}
                    </button>
                    <button 
                      className="action-button"
                      onClick={() => handleOpenApp(app.url)}
                      title="Open in browser"
                    >
                      <FiExternalLink size={16} />
                    </button>
                    <button 
                      className="action-button danger"
                      onClick={() => handleDeleteApp(app.appId)}
                      disabled={deletingId === app.appId}
                      title="Unpublish"
                    >
                      {deletingId === app.appId ? (
                        <FiRefreshCw className="spinning" size={16} />
                      ) : (
                        <FiTrash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="published-apps-footer">
          <button className="refresh-button" onClick={loadApps} disabled={loading}>
            <FiRefreshCw className={loading ? 'spinning' : ''} size={16} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

export default PublishedApps;
