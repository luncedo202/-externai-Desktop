import React, { useState, useEffect } from 'react';
import {
  FiX, FiExternalLink, FiLoader, FiCheck, FiAlertCircle,
  FiLock, FiUnlock, FiRefreshCw, FiTrash2, FiUploadCloud,
  FiChevronDown, FiChevronRight, FiGitCommit, FiGithub,
} from 'react-icons/fi';
import GitHubService from '../services/GitHubService';
import './GitHubPanel.css';

// ── GitHub Mark logo ──────────────────────────────────────────────────────────
const GitHubMark = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 98 96" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"/>
  </svg>
);

// ── Step pill for token guide ─────────────────────────────────────────────────
const Step = ({ n, text }) => (
  <div className="ghp-step">
    <span className="ghp-step-num">{n}</span>
    <span className="ghp-step-text">{text}</span>
  </div>
);

// ── Relative time helper ──────────────────────────────────────────────────────
function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
function GitHubPanel({ workspaceFolder, onClose }) {
  const [view, setView] = useState('connect'); // connect | dashboard
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);

  // connect form state
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  // save-to-github state
  const [projectName, setProjectName] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStep, setSaveStep] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savedRepo, setSavedRepo] = useState(null); // { name, url, owner }

  // repos section
  const [reposLoading, setReposLoading] = useState(false);
  const [reposOpen, setReposOpen] = useState(true);

  // ── On mount: restore session ──────────────────────────────────────────────
  useEffect(() => {
    const savedToken = GitHubService.loadToken();
    const savedUser = GitHubService.loadUser();
    const savedRepo = GitHubService.loadRepo();
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
      setSavedRepo(savedRepo);
      setView('dashboard');
    }
  }, []);

  // ── Pre-fill project name from workspace folder ────────────────────────────
  useEffect(() => {
    if (workspaceFolder && !projectName) {
      const name = workspaceFolder.split('/').pop() || 'my-project';
      setProjectName(name.replace(/[^a-zA-Z0-9._-]/g, '-'));
    }
  }, [workspaceFolder]);

  // ── Load repos when dashboard opens ───────────────────────────────────────
  useEffect(() => {
    if (view === 'dashboard' && token) loadRepos();
  }, [view]);

  const loadRepos = async () => {
    setReposLoading(true);
    try {
      const list = await GitHubService.getRepos(token);
      setRepos(list);
    } catch { setRepos([]); }
    finally { setReposLoading(false); }
  };

  // ── Connect ────────────────────────────────────────────────────────────────
  const handleConnect = async (e) => {
    e.preventDefault();
    if (!token.trim()) { setConnectError('Please paste your access token.'); return; }
    setConnecting(true);
    setConnectError('');
    try {
      const u = await GitHubService.getUser(token.trim());
      GitHubService.saveToken(token.trim());
      GitHubService.saveUser(u);
      setUser(u);
      const saved = GitHubService.loadRepo();
      setSavedRepo(saved);
      setView('dashboard');
    } catch (err) {
      setConnectError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const handleDisconnect = () => {
    GitHubService.clear();
    setUser(null); setToken(''); setRepos([]);
    setSavedRepo(null); setView('connect'); setConnectError('');
  };

  // ── Save to GitHub ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!workspaceFolder) { setSaveError('Open a project folder first.'); return; }
    setSaving(true); setSaveError(''); setSaveStep('');
    try {
      const result = await GitHubService.pushToGitHub({
        token,
        owner: user.login,
        repoName: projectName,
        isPrivate,
        workspaceFolder,
        onStep: setSaveStep,
      });
      setSavedRepo(GitHubService.loadRepo());
      setSaveStep('');
    } catch (err) {
      setSaveError(err.message);
      setSaveStep('');
    } finally {
      setSaving(false);
    }
  };

  // ── Push latest ───────────────────────────────────────────────────────────
  const handlePush = async () => {
    if (!workspaceFolder || !savedRepo) return;
    setSaving(true); setSaveError(''); setSaveStep('');
    try {
      await GitHubService.pushLatest({
        token,
        owner: savedRepo.owner,
        repoName: savedRepo.name,
        workspaceFolder,
        onStep: setSaveStep,
      });
      setSaveStep('');
    } catch (err) {
      setSaveError(err.message);
      setSaveStep('');
    } finally {
      setSaving(false);
    }
  };

  // ── CONNECT VIEW ──────────────────────────────────────────────────────────
  if (view === 'connect') {
    return (
      <div className="ghp-root">
        <button className="ghp-close" onClick={onClose}><FiX size={16} /></button>

        <div className="ghp-connect-wrap">
          {/* Hero */}
          <div className="ghp-hero">
            <div className="ghp-hero-logo">
              <GitHubMark size={52} />
            </div>
            <h1 className="ghp-hero-title">GitHub</h1>
            <p className="ghp-hero-sub">
              Back up your code online, share your projects with anyone,<br />
              and never lose your work — completely free.
            </p>
          </div>

          {/* No-account path */}
          <div className="ghp-card ghp-card--new">
            <div className="ghp-new-content">
              <div>
                <div className="ghp-card-label">New to GitHub?</div>
                <p className="ghp-card-desc">Create a free account in 2 minutes — no credit card needed.</p>
              </div>
              <a
                className="ghp-btn-ghost"
                href="https://github.com/signup"
                target="_blank"
                rel="noreferrer"
                onClick={e => { e.preventDefault(); window.electronAPI.shell.openExternal('https://github.com/signup'); }}
              >
                <GitHubMark size={15} />
                Create free account
                <FiExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Has-account path */}
          <div className="ghp-card">
            <h2 className="ghp-card-title">Already have GitHub? Connect it</h2>
            <p className="ghp-card-desc" style={{marginBottom: '16px'}}>Follow these steps to get your access token:</p>

            {/* Always-visible guide */}
            <div className="ghp-guide" style={{marginBottom: '16px'}}>
              <Step n="1" text='Go to github.com/settings/tokens → click "Generate new token (classic)"' />
              <Step n="2" text='Give it any name (e.g. "ExternAI") and tick the "repo" checkbox' />
              <Step n="3" text='Scroll down and click "Generate token" button' />
              <Step n="4" text='Copy the token that appears (starts with ghp_) and paste it below' />
              <a
                className="ghp-guide-link"
                href="https://github.com/settings/tokens/new?scopes=repo&description=ExternAI"
                target="_blank"
                rel="noreferrer"
                onClick={e => {
                  e.preventDefault();
                  window.electronAPI.shell.openExternal(
                    'https://github.com/settings/tokens/new?scopes=repo&description=ExternAI'
                  );
                }}
              >
                <FiExternalLink size={12} /> Click here to generate token on GitHub
              </a>
            </div>

            <form onSubmit={handleConnect} className="ghp-form">
              <div className="ghp-field">
                <label>Personal Access Token</label>
                <div className="ghp-token-row">
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </div>

              {connectError && (
                <div className="ghp-error">
                  <FiAlertCircle size={14} />{connectError}
                </div>
              )}

              <button className="ghp-btn-primary" type="submit" disabled={connecting}>
                {connecting
                  ? <><FiLoader size={14} className="ghp-spin" /> Connecting…</>
                  : <><GitHubMark size={14} /> Connect GitHub</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── DASHBOARD VIEW ────────────────────────────────────────────────────────
  return (
    <div className="ghp-root ghp-root--dashboard">
      <button className="ghp-close" onClick={onClose}><FiX size={16} /></button>

      {/* Top bar */}
      <div className="ghp-topbar">
        <div className="ghp-topbar-brand">
          <GitHubMark size={22} />
          <span className="ghp-topbar-name">GitHub</span>
        </div>
        {user && (
          <div className="ghp-topbar-user">
            <img className="ghp-avatar" src={user.avatar_url} alt={user.login} />
            <div className="ghp-topbar-info">
              <span className="ghp-topbar-displayname">{user.name || user.login}</span>
              <span className="ghp-topbar-username">@{user.login}</span>
            </div>
            <span className="ghp-badge-connected"><span className="ghp-dot-live" />Connected</span>
          </div>
        )}
        <div className="ghp-topbar-actions">
          <button className="ghp-icon-btn" title="Refresh projects" onClick={loadRepos}>
            <FiRefreshCw size={14} />
          </button>
          <a
            className="ghp-icon-btn"
            href={`https://github.com/${user?.login}`}
            target="_blank"
            rel="noreferrer"
            title="View GitHub profile"
            onClick={e => { e.preventDefault(); window.electronAPI.shell.openExternal(`https://github.com/${user?.login}`); }}
          >
            <FiExternalLink size={14} />
          </a>
          <button className="ghp-icon-btn ghp-icon-btn--danger" title="Disconnect" onClick={handleDisconnect}>
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="ghp-dashboard">

        {/* Left: save area */}
        <div className="ghp-col ghp-col--main">

          {/* Save to GitHub card */}
          <div className="ghp-dash-card">
            <div className="ghp-dash-card-header">
              <FiUploadCloud size={15} />
              <span>Save your project to GitHub</span>
            </div>

            {!workspaceFolder ? (
              <div className="ghp-no-folder">
                <span>Open a project folder first, then save it to GitHub.</span>
              </div>
            ) : savedRepo ? (
              /* Already saved — show push button */
              <div className="ghp-saved-state">
                <div className="ghp-saved-repo">
                  <FiCheck size={16} className="ghp-saved-check" />
                  <div>
                    <div className="ghp-saved-name">{savedRepo.name}</div>
                    <a
                      className="ghp-saved-url"
                      href={savedRepo.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => { e.preventDefault(); window.electronAPI.shell.openExternal(savedRepo.url); }}
                    >
                      {savedRepo.url.replace('https://', '')} <FiExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {saveStep && (
                  <div className="ghp-step-indicator">
                    <FiLoader size={13} className="ghp-spin" />
                    {saveStep}
                  </div>
                )}
                {saveError && (
                  <div className="ghp-error">
                    <FiAlertCircle size={13} />{saveError}
                  </div>
                )}

                <button
                  className="ghp-btn-push"
                  onClick={handlePush}
                  disabled={saving}
                >
                  {saving
                    ? <><FiLoader size={14} className="ghp-spin" />{saveStep || 'Working…'}</>
                    : <><FiGitCommit size={14} /> Push latest changes</>}
                </button>

                <button
                  className="ghp-btn-text"
                  onClick={() => { GitHubService.saveRepo(null); setSavedRepo(null); }}
                >
                  Save a different project
                </button>
              </div>
            ) : (
              /* Save form */
              <div className="ghp-save-form">
                <div className="ghp-field">
                  <label>Project name on GitHub</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value.replace(/[^a-zA-Z0-9._-]/g, '-'))}
                    placeholder="my-awesome-project"
                    spellCheck={false}
                  />
                </div>

                <div className="ghp-privacy-row">
                  <button
                    type="button"
                    className={`ghp-privacy-btn ${isPrivate ? 'active' : ''}`}
                    onClick={() => setIsPrivate(true)}
                  >
                    <FiLock size={13} /> Private
                  </button>
                  <button
                    type="button"
                    className={`ghp-privacy-btn ${!isPrivate ? 'active' : ''}`}
                    onClick={() => setIsPrivate(false)}
                  >
                    <FiUnlock size={13} /> Public
                  </button>
                  <span className="ghp-privacy-hint">
                    {isPrivate ? 'Only you can see it' : 'Anyone on the internet can view it'}
                  </span>
                </div>

                {saveStep && (
                  <div className="ghp-step-indicator">
                    <FiLoader size={13} className="ghp-spin" />
                    {saveStep}
                  </div>
                )}
                {saveError && (
                  <div className="ghp-error">
                    <FiAlertCircle size={13} />{saveError}
                  </div>
                )}

                <button
                  className="ghp-btn-primary"
                  onClick={handleSave}
                  disabled={saving || !projectName.trim()}
                >
                  {saving
                    ? <><FiLoader size={14} className="ghp-spin" />{saveStep || 'Working…'}</>
                    : <><FiUploadCloud size={14} /> Save to GitHub</>}
                </button>

                <p className="ghp-save-hint">
                  This will upload all files in your project folder to GitHub.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: repos */}
        <div className="ghp-col ghp-col--repos">
          <div className="ghp-dash-card">
            <div className="ghp-dash-card-header">
              <button className="ghp-section-toggle" onClick={() => setReposOpen(v => !v)}>
                {reposOpen ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
                <GitHubMark size={13} />
                Your projects
                {!reposLoading && repos.length > 0 && (
                  <span className="ghp-badge">{repos.length}</span>
                )}
              </button>
            </div>

            {reposOpen && (
              <div className="ghp-repo-list">
                {reposLoading ? (
                  <div className="ghp-list-state">
                    <FiLoader size={12} className="ghp-spin" /> Loading…
                  </div>
                ) : repos.length === 0 ? (
                  <div className="ghp-list-state">No projects found</div>
                ) : repos.map(repo => (
                  <a
                    key={repo.id}
                    className="ghp-repo-row"
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => { e.preventDefault(); window.electronAPI.shell.openExternal(repo.html_url); }}
                  >
                    <div className="ghp-repo-main">
                      <span className="ghp-repo-lock">
                        {repo.private ? <FiLock size={11} /> : <FiUnlock size={11} />}
                      </span>
                      <span className="ghp-repo-name">{repo.name}</span>
                    </div>
                    <div className="ghp-repo-meta">
                      <span className="ghp-repo-time">{relativeTime(repo.updated_at)}</span>
                      <FiExternalLink size={10} className="ghp-repo-ext" />
                    </div>
                  </a>
                ))}

                {repos.length > 0 && (
                  <a
                    className="ghp-all-link"
                    href={`https://github.com/${user?.login}?tab=repositories`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => {
                      e.preventDefault();
                      window.electronAPI.shell.openExternal(`https://github.com/${user?.login}?tab=repositories`);
                    }}
                  >
                    View all on GitHub <FiExternalLink size={11} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default GitHubPanel;
