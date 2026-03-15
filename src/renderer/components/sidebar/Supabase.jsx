import React, { useState, useEffect, useCallback } from 'react';
import {
  FiDatabase,
  FiCheck,
  FiAlertCircle,
  FiLoader,
  FiCopy,
  FiTrash2,
  FiRefreshCw,
  FiExternalLink,
  FiChevronDown,
  FiChevronRight,
  FiTable,
  FiCode,
  FiLink,
} from 'react-icons/fi';
import SupabaseService from '../../services/SupabaseService';
import './Supabase.css';

function Supabase({ workspaceFolder }) {
  const [step, setStep] = useState('connect'); // connect | connected
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState(null);
  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesOpen, setTablesOpen] = useState(true);
  const [snippetTab, setSnippetTab] = useState('client'); // client | env
  const [copied, setCopied] = useState('');

  // Load saved connection on mount
  useEffect(() => {
    const saved = SupabaseService.load();
    if (saved) {
      setConnection(saved);
      setUrl(saved.url);
      setAnonKey(saved.anonKey);
      setStep('connected');
    }
  }, []);

  // Fetch tables whenever we enter connected state
  useEffect(() => {
    if (step === 'connected' && connection) {
      loadTables();
    }
  }, [step, connection]);

  const loadTables = async () => {
    if (!connection) return;
    setTablesLoading(true);
    try {
      const list = await SupabaseService.fetchTables(connection.url, connection.anonKey);
      setTables(list);
    } catch {
      setTables([]);
    } finally {
      setTablesLoading(false);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setError('');
    if (!url.trim() || !anonKey.trim()) {
      setError('Both URL and Anon Key are required.');
      return;
    }
    setLoading(true);
    try {
      await SupabaseService.validate(url.trim(), anonKey.trim());
      const config = {
        url: url.trim().replace(/\/$/, ''),
        anonKey: anonKey.trim(),
        connectedAt: new Date().toISOString(),
        projectRef: url.trim().match(/https:\/\/([^.]+)/)?.[1] || 'project',
      };
      SupabaseService.save(config);
      setConnection(config);
      setStep('connected');
    } catch (err) {
      setError(err.message || 'Connection failed. Check your URL and Anon Key.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    SupabaseService.clear();
    setConnection(null);
    setTables([]);
    setUrl('');
    setAnonKey('');
    setStep('connect');
    setError('');
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleInstallSnippet = async () => {
    if (!workspaceFolder) return;
    const code = SupabaseService.generateClientCode(connection.url, connection.anonKey);
    try {
      await window.electronAPI.fs.writeFile(`${workspaceFolder}/src/supabaseClient.js`, code);
    } catch {
      // fallback: just copy
      handleCopy(code, 'install');
    }
  };

  // ── Render: Connect form ──────────────────────────────────────────────────
  if (step === 'connect') {
    return (
      <div className="supabase-panel">
        <div className="supabase-header">
          <div className="supabase-header-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M11.9 2L3 14.4h7.5L10.1 22l9.9-12.4H12L11.9 2z" fill="#3ECF8E"/>
            </svg>
          </div>
          <span>Supabase</span>
        </div>

        <div className="supabase-connect-body">
          <div className="supabase-hero">
            <div className="supabase-hero-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M11.9 2L3 14.4h7.5L10.1 22l9.9-12.4H12L11.9 2z" fill="#3ECF8E"/>
              </svg>
            </div>
            <p className="supabase-hero-title">Connect to Supabase</p>
            <p className="supabase-hero-sub">
              Add a Postgres database, auth, storage and more to your project.
            </p>
          </div>

          <form className="supabase-form" onSubmit={handleConnect}>
            <div className="supabase-field">
              <label>Project URL</label>
              <input
                type="url"
                placeholder="https://xxxx.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="supabase-field">
              <label>Anon / Public Key</label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <span className="supabase-field-hint">
                Found in Project Settings → API → Project API keys
              </span>
            </div>

            {error && (
              <div className="supabase-error">
                <FiAlertCircle size={13} />
                {error}
              </div>
            )}

            <button
              className={`supabase-connect-btn ${loading ? 'loading' : ''}`}
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <FiLoader size={14} className="spin" /> Connecting…
                </>
              ) : (
                <>
                  <FiLink size={14} /> Connect Project
                </>
              )}
            </button>
          </form>

          <a
            className="supabase-new-project-link"
            href="https://supabase.com/dashboard/new"
            target="_blank"
            rel="noreferrer"
          >
            <FiExternalLink size={12} /> Create a new Supabase project
          </a>
        </div>
      </div>
    );
  }

  // ── Render: Connected ────────────────────────────────────────────────────
  const clientCode = SupabaseService.generateClientCode(connection.url, connection.anonKey);
  const envCode = SupabaseService.generateEnvCode(connection.url, connection.anonKey);

  return (
    <div className="supabase-panel">
      <div className="supabase-header">
        <div className="supabase-header-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M11.9 2L3 14.4h7.5L10.1 22l9.9-12.4H12L11.9 2z" fill="#3ECF8E"/>
          </svg>
        </div>
        <span>Supabase</span>
      </div>

      {/* Connection badge */}
      <div className="supabase-connection-badge">
        <div className="supabase-badge-left">
          <span className="supabase-status-dot" />
          <div>
            <div className="supabase-project-ref">{connection.projectRef}</div>
            <div className="supabase-project-url">{connection.url}</div>
          </div>
        </div>
        <div className="supabase-badge-actions">
          <button title="Refresh tables" onClick={loadTables} className="supabase-icon-btn">
            <FiRefreshCw size={13} />
          </button>
          <button title="Disconnect" onClick={handleDisconnect} className="supabase-icon-btn danger">
            <FiTrash2 size={13} />
          </button>
        </div>
      </div>

      {/* Tables */}
      <div className="supabase-section">
        <button
          className="supabase-section-toggle"
          onClick={() => setTablesOpen(!tablesOpen)}
        >
          {tablesOpen ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
          <FiTable size={13} />
          <span>Tables</span>
          {!tablesLoading && (
            <span className="supabase-count">{tables.length}</span>
          )}
        </button>

        {tablesOpen && (
          <div className="supabase-table-list">
            {tablesLoading ? (
              <div className="supabase-list-loading">
                <FiLoader size={12} className="spin" /> Loading…
              </div>
            ) : tables.length === 0 ? (
              <div className="supabase-list-empty">No tables found</div>
            ) : (
              tables.map((t) => (
                <div key={t} className="supabase-table-row">
                  <FiDatabase size={12} />
                  <span>{t}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Code snippets */}
      <div className="supabase-section">
        <div className="supabase-section-label">
          <FiCode size={13} />
          <span>Code Snippets</span>
        </div>

        <div className="supabase-snippet-tabs">
          <button
            className={`supabase-snippet-tab ${snippetTab === 'client' ? 'active' : ''}`}
            onClick={() => setSnippetTab('client')}
          >
            supabaseClient.js
          </button>
          <button
            className={`supabase-snippet-tab ${snippetTab === 'env' ? 'active' : ''}`}
            onClick={() => setSnippetTab('env')}
          >
            .env
          </button>
        </div>

        <div className="supabase-snippet-box">
          <pre>{snippetTab === 'client' ? clientCode : envCode}</pre>
          <button
            className="supabase-copy-btn"
            onClick={() =>
              handleCopy(snippetTab === 'client' ? clientCode : envCode, snippetTab)
            }
            title="Copy"
          >
            {copied === snippetTab ? <FiCheck size={12} /> : <FiCopy size={12} />}
          </button>
        </div>

        {workspaceFolder && snippetTab === 'client' && (
          <button className="supabase-save-btn" onClick={handleInstallSnippet}>
            Save to src/supabaseClient.js
          </button>
        )}
      </div>

      {/* Quick links */}
      <div className="supabase-section">
        <div className="supabase-section-label">
          <FiExternalLink size={13} />
          <span>Quick Links</span>
        </div>
        <div className="supabase-links">
          {[
            { label: 'Dashboard', href: `https://supabase.com/dashboard/project/${connection.projectRef}` },
            { label: 'Table Editor', href: `https://supabase.com/dashboard/project/${connection.projectRef}/editor` },
            { label: 'Auth', href: `https://supabase.com/dashboard/project/${connection.projectRef}/auth/users` },
            { label: 'Storage', href: `https://supabase.com/dashboard/project/${connection.projectRef}/storage/buckets` },
            { label: 'API Docs', href: `https://supabase.com/dashboard/project/${connection.projectRef}/api` },
          ].map(({ label, href }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" className="supabase-link">
              {label} <FiExternalLink size={10} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Supabase;
