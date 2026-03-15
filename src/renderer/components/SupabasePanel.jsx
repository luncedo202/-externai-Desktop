import React, { useState, useEffect } from 'react';
import {
  FiCheck, FiAlertCircle, FiLoader, FiCopy,
  FiTrash2, FiRefreshCw, FiExternalLink,
  FiChevronDown, FiChevronRight, FiDatabase,
  FiCode, FiLink, FiTable, FiX, FiZap,
  FiLock, FiHardDrive,
} from 'react-icons/fi';
import SupabaseService from '../services/SupabaseService';
import './SupabasePanel.css';

const SupabaseLogo = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 109 113" fill="none">
    <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint0_linear)"/>
    <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint1_linear)" fillOpacity="0.2"/>
    <path d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.04075L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z" fill="#3ECF8E"/>
    <defs>
      <linearGradient id="paint0_linear" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse">
        <stop stopColor="#249361"/>
        <stop offset="1" stopColor="#3ECF8E"/>
      </linearGradient>
      <linearGradient id="paint1_linear" x1="36.1558" y1="30.578" x2="54.4844" y2="65.0806" gradientUnits="userSpaceOnUse">
        <stop/>
        <stop offset="1" stopOpacity="0"/>
      </linearGradient>
    </defs>
  </svg>
);

function SupabasePanel({ workspaceFolder, onClose }) {
  const [view, setView] = useState('connect'); // connect | dashboard
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState(null);
  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesOpen, setTablesOpen] = useState(true);
  const [snippetTab, setSnippetTab] = useState('client');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    const saved = SupabaseService.load();
    if (saved) {
      setConnection(saved);
      setUrl(saved.url);
      setAnonKey(saved.anonKey);
      setView('dashboard');
    }
  }, []);

  useEffect(() => {
    if (view === 'dashboard' && connection) loadTables();
  }, [view, connection]);

  const loadTables = async () => {
    setTablesLoading(true);
    try {
      const list = await SupabaseService.fetchTables(connection.url, connection.anonKey);
      setTables(list);
    } catch { setTables([]); }
    finally { setTablesLoading(false); }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setError('');
    if (!url.trim() || !anonKey.trim()) { setError('Both fields are required.'); return; }
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
      setView('dashboard');
    } catch (err) {
      setError(err.message || 'Connection failed. Check your URL and Anon Key.');
    } finally { setLoading(false); }
  };

  const handleDisconnect = () => {
    SupabaseService.clear();
    setConnection(null); setTables([]); setUrl(''); setAnonKey('');
    setView('connect'); setError('');
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleSaveFile = async () => {
    if (!workspaceFolder) return;
    const code = SupabaseService.generateClientCode(connection.url, connection.anonKey);
    try {
      await window.electronAPI.fs.writeFile(`${workspaceFolder}/src/supabaseClient.js`, code);
      handleCopy(code, 'saved');
    } catch { handleCopy(code, 'client'); }
  };

  const clientCode = connection ? SupabaseService.generateClientCode(connection.url, connection.anonKey) : '';
  const envCode = connection ? SupabaseService.generateEnvCode(connection.url, connection.anonKey) : '';

  // ── CONNECT VIEW ────────────────────────────────────────────────────────────
  if (view === 'connect') {
    return (
      <div className="sbp-root">
        <button className="sbp-close" onClick={onClose} title="Close"><FiX size={16} /></button>

        <div className="sbp-connect-wrap">
          {/* Hero */}
          <div className="sbp-hero">
            <div className="sbp-hero-logo">
              <SupabaseLogo size={52} />
            </div>
            <h1 className="sbp-hero-title">
              <span>Supa</span><span className="sbp-hero-base">base</span>
            </h1>
            <p className="sbp-hero-tagline">The open-source Firebase alternative</p>
            <p className="sbp-hero-sub">
              Connect your Supabase project to get a full Postgres database,<br/>
              authentication, real-time subscriptions and storage.
            </p>
          </div>

          {/* Features row */}
          <div className="sbp-features">
            {[
              { icon: FiDatabase, label: 'Postgres DB' },
              { icon: FiLock, label: 'Auth & Users' },
              { icon: FiZap, label: 'Realtime' },
              { icon: FiHardDrive, label: 'Storage' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="sbp-feature-pill">
                <Icon size={13} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Form card */}
          <div className="sbp-card">
            <h2 className="sbp-card-title">Connect your project</h2>
            <p className="sbp-card-sub">Get your credentials from Supabase in 3 easy steps:</p>

            {/* Step-by-step guide */}
            <div className="sbp-guide">
              <div className="sbp-guide-step">
                <span className="sbp-guide-num">1</span>
                <span>Go to <strong>supabase.com/dashboard</strong> and sign in (or create free account)</span>
              </div>
              <div className="sbp-guide-step">
                <span className="sbp-guide-num">2</span>
                <span>Select your project (or click <strong>"New Project"</strong> if you don't have one)</span>
              </div>
              <div className="sbp-guide-step">
                <span className="sbp-guide-num">3</span>
                <span>Go to <strong>Settings → API</strong> tab and copy your <strong>URL</strong> and <strong>anon public key</strong> below</span>
              </div>
            </div>

            <form onSubmit={handleConnect} className="sbp-form">
              <div className="sbp-field">
                <label>Project URL <span style={{color: '#888', fontSize: '11px'}}>(from Settings → API → "Project URL")</span></label>
                <input
                  type="url"
                  placeholder="https://xxxxxxxxxxxx.supabase.co"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  autoComplete="off" spellCheck={false}
                />
              </div>
              <div className="sbp-field">
                <label>Anon / Public Key <span style={{color: '#888', fontSize: '11px'}}>(from Settings → API → "anon public")</span></label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                  value={anonKey}
                  onChange={e => setAnonKey(e.target.value)}
                  autoComplete="off" spellCheck={false}
                />
              </div>

              {error && (
                <div className="sbp-error">
                  <FiAlertCircle size={14} />{error}
                </div>
              )}

              <button className={`sbp-btn-primary ${loading ? 'loading' : ''}`} type="submit" disabled={loading}>
                {loading ? <><FiLoader size={14} className="sbp-spin" /> Verifying…</> : <><FiLink size={14} /> Connect to Supabase</>}
              </button>
            </form>
          </div>

          <a className="sbp-new-link" href="https://supabase.com/dashboard/new" target="_blank" rel="noreferrer">
            <FiExternalLink size={12} /> Don't have a project? Create one free →
          </a>
        </div>
      </div>
    );
  }

  // ── DASHBOARD VIEW ──────────────────────────────────────────────────────────
  return (
    <div className="sbp-root sbp-root--dashboard">
      <button className="sbp-close" onClick={onClose} title="Close"><FiX size={16} /></button>

      {/* Top bar */}
      <div className="sbp-topbar">
        <div className="sbp-topbar-brand">
          <SupabaseLogo size={28} />
          <span className="sbp-topbar-name">Supabase</span>
        </div>
        <div className="sbp-topbar-project">
          <span className="sbp-dot-live" />
          <span className="sbp-topbar-ref">{connection.projectRef}</span>
          <span className="sbp-topbar-url">{connection.url}</span>
        </div>
        <div className="sbp-topbar-actions">
          <button className="sbp-icon-btn" title="Refresh" onClick={loadTables}><FiRefreshCw size={14} /></button>
          <a className="sbp-icon-btn" href={`https://supabase.com/dashboard/project/${connection.projectRef}`} target="_blank" rel="noreferrer" title="Open Dashboard">
            <FiExternalLink size={14} />
          </a>
          <button className="sbp-icon-btn sbp-icon-btn--danger" title="Disconnect" onClick={handleDisconnect}><FiTrash2 size={14} /></button>
        </div>
      </div>

      {/* Dashboard body */}
      <div className="sbp-dashboard">

        {/* Left col */}
        <div className="sbp-col">
          {/* Tables card */}
          <div className="sbp-dash-card">
            <div className="sbp-dash-card-header">
              <button className="sbp-section-toggle" onClick={() => setTablesOpen(!tablesOpen)}>
                {tablesOpen ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                <FiTable size={14} />
                <span>Tables</span>
                {!tablesLoading && <span className="sbp-badge">{tables.length}</span>}
              </button>
            </div>
            {tablesOpen && (
              <div className="sbp-table-list">
                {tablesLoading ? (
                  <div className="sbp-list-state"><FiLoader size={12} className="sbp-spin" /> Loading tables…</div>
                ) : tables.length === 0 ? (
                  <div className="sbp-list-state">No tables found</div>
                ) : tables.map(t => (
                  <div key={t} className="sbp-table-row">
                    <FiDatabase size={12} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick links card */}
          <div className="sbp-dash-card">
            <div className="sbp-dash-card-header">
              <FiExternalLink size={14} /><span>Quick Links</span>
            </div>
            <div className="sbp-quick-links">
              {[
                { label: 'Table Editor', path: 'editor', icon: FiTable },
                { label: 'Authentication', path: 'auth/users', icon: FiLock },
                { label: 'Storage', path: 'storage/buckets', icon: FiHardDrive },
                { label: 'API Docs', path: 'api', icon: FiCode },
                { label: 'SQL Editor', path: 'sql/new', icon: FiDatabase },
              ].map(({ label, path, icon: Icon }) => (
                <a
                  key={label}
                  href={`https://supabase.com/dashboard/project/${connection.projectRef}/${path}`}
                  target="_blank" rel="noreferrer"
                  className="sbp-quick-link"
                >
                  <Icon size={13} />
                  <span>{label}</span>
                  <FiExternalLink size={10} className="sbp-ql-ext" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right col — code snippets */}
        <div className="sbp-col sbp-col--wide">
          <div className="sbp-dash-card sbp-dash-card--full">
            <div className="sbp-dash-card-header">
              <FiCode size={14} /><span>Code Snippets</span>
              <span className="sbp-header-sub">Add to your project</span>
            </div>

            <div className="sbp-snippet-tabs">
              {['client', 'env'].map(tab => (
                <button
                  key={tab}
                  className={`sbp-snippet-tab ${snippetTab === tab ? 'active' : ''}`}
                  onClick={() => setSnippetTab(tab)}
                >
                  {tab === 'client' ? 'supabaseClient.js' : '.env'}
                </button>
              ))}
            </div>

            <div className="sbp-snippet-box">
              <pre className="sbp-snippet-pre">{snippetTab === 'client' ? clientCode : envCode}</pre>
              <button
                className="sbp-copy-btn"
                onClick={() => handleCopy(snippetTab === 'client' ? clientCode : envCode, snippetTab)}
                title="Copy to clipboard"
              >
                {copied === snippetTab
                  ? <><FiCheck size={12} /> Copied!</>
                  : <><FiCopy size={12} /> Copy</>}
              </button>
            </div>

            {workspaceFolder && snippetTab === 'client' && (
              <button className="sbp-save-btn" onClick={handleSaveFile}>
                {copied === 'saved'
                  ? <><FiCheck size={13} /> Saved to src/supabaseClient.js</>
                  : <><FiZap size={13} /> Save to src/supabaseClient.js</>}
              </button>
            )}

            <div className="sbp-install-hint">
              <span>Install the client library:</span>
              <div className="sbp-install-cmd">
                <code>npm install @supabase/supabase-js</code>
                <button className="sbp-copy-mini" onClick={() => handleCopy('npm install @supabase/supabase-js', 'npm')}>
                  {copied === 'npm' ? <FiCheck size={11} /> : <FiCopy size={11} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupabasePanel;
