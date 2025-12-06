import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiCheck, FiGitCommit, FiGitBranch, FiUpload, FiDownload, FiPlus } from 'react-icons/fi';
import './SourceControl.css';

function SourceControl({ workspaceFolder }) {
  const [status, setStatus] = useState(null);
  const [changes, setChanges] = useState([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [isRepo, setIsRepo] = useState(false);

  useEffect(() => {
    if (workspaceFolder) {
      checkGitRepo();
    }
  }, [workspaceFolder]);

  const checkGitRepo = async () => {
    if (!workspaceFolder) return;
    
    try {
      const result = await window.electronAPI.terminalExecute('git rev-parse --git-dir', workspaceFolder);
      setIsRepo(result.success);
      
      if (result.success) {
        await loadGitStatus();
        await loadBranches();
      }
    } catch (err) {
      setIsRepo(false);
    }
  };

  const loadGitStatus = async () => {
    if (!workspaceFolder) return;
    
    setLoading(true);
    try {
      const result = await window.electronAPI.terminalExecute('git status --porcelain', workspaceFolder);
      
      if (result.success) {
        const lines = result.stdout.split('\n').filter(line => line.trim());
        const parsedChanges = lines.map(line => {
          const status = line.substring(0, 2);
          const file = line.substring(3);
          return {
            file,
            status: parseStatus(status),
            staged: status[0] !== ' ' && status[0] !== '?'
          };
        });
        setChanges(parsedChanges);
      }
    } catch (err) {
      console.error('Failed to load git status:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    if (!workspaceFolder) return;
    
    try {
      // Get current branch
      const currentResult = await window.electronAPI.terminalExecute('git branch --show-current', workspaceFolder);
      if (currentResult.success) {
        setCurrentBranch(currentResult.stdout.trim());
      }

      // Get all branches
      const branchResult = await window.electronAPI.terminalExecute('git branch', workspaceFolder);
      if (branchResult.success) {
        const branchList = branchResult.stdout.split('\n')
          .map(b => b.replace('*', '').trim())
          .filter(b => b);
        setBranches(branchList);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const parseStatus = (status) => {
    if (status.includes('M')) return 'Modified';
    if (status.includes('A')) return 'Added';
    if (status.includes('D')) return 'Deleted';
    if (status.includes('R')) return 'Renamed';
    if (status.includes('??')) return 'Untracked';
    return 'Unknown';
  };

  const stageFile = async (file) => {
    if (!workspaceFolder) return;
    
    try {
      await window.electronAPI.terminalExecute(`git add "${file}"`, workspaceFolder);
      await loadGitStatus();
    } catch (err) {
      console.error('Failed to stage file:', err);
    }
  };

  const unstageFile = async (file) => {
    if (!workspaceFolder) return;
    
    try {
      await window.electronAPI.terminalExecute(`git reset HEAD "${file}"`, workspaceFolder);
      await loadGitStatus();
    } catch (err) {
      console.error('Failed to unstage file:', err);
    }
  };

  const stageAll = async () => {
    if (!workspaceFolder) return;
    
    try {
      await window.electronAPI.terminalExecute('git add .', workspaceFolder);
      await loadGitStatus();
    } catch (err) {
      console.error('Failed to stage all:', err);
    }
  };

  const commit = async () => {
    if (!workspaceFolder || !commitMessage.trim()) return;
    
    setLoading(true);
    try {
      const result = await window.electronAPI.terminalExecute(`git commit -m "${commitMessage}"`, workspaceFolder);
      
      if (result.success) {
        setCommitMessage('');
        await loadGitStatus();
      }
    } catch (err) {
      console.error('Failed to commit:', err);
    } finally {
      setLoading(false);
    }
  };

  const push = async () => {
    if (!workspaceFolder) return;
    
    setLoading(true);
    try {
      await window.electronAPI.terminalExecute('git push', workspaceFolder);
    } catch (err) {
      console.error('Failed to push:', err);
    } finally {
      setLoading(false);
    }
  };

  const pull = async () => {
    if (!workspaceFolder) return;
    
    setLoading(true);
    try {
      await window.electronAPI.terminalExecute('git pull', workspaceFolder);
      await loadGitStatus();
    } catch (err) {
      console.error('Failed to pull:', err);
    } finally {
      setLoading(false);
    }
  };

  const initRepo = async () => {
    if (!workspaceFolder) return;
    
    setLoading(true);
    try {
      const result = await window.electronAPI.terminalExecute('git init', workspaceFolder);
      if (result.success) {
        setIsRepo(true);
        await loadGitStatus();
        await loadBranches();
      }
    } catch (err) {
      console.error('Failed to init repo:', err);
    } finally {
      setLoading(false);
    }
  };

  const stagedChanges = changes.filter(c => c.staged);
  const unstagedChanges = changes.filter(c => !c.staged);

  if (!workspaceFolder) {
    return (
      <div className="source-control">
        <div className="source-control-header">
          <h3>SOURCE CONTROL</h3>
        </div>
        <div className="source-control-empty">
          <p>Open a folder to use source control</p>
        </div>
      </div>
    );
  }

  if (!isRepo) {
    return (
      <div className="source-control">
        <div className="source-control-header">
          <h3>SOURCE CONTROL</h3>
        </div>
        <div className="source-control-empty">
          <p>No Git repository found</p>
          <button className="init-repo-button" onClick={initRepo}>
            <FiPlus size={14} />
            Initialize Repository
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="source-control">
      <div className="source-control-header">
        <h3>SOURCE CONTROL</h3>
        <button className="refresh-button" onClick={loadGitStatus} disabled={loading}>
          <FiRefreshCw size={14} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      <div className="source-control-content">
        {/* Branch info */}
        <div className="branch-info">
          <FiGitBranch size={14} />
          <span>{currentBranch || 'main'}</span>
        </div>

        {/* Commit message */}
        <div className="commit-section">
          <textarea
            className="commit-message"
            placeholder="Message (Ctrl+Enter to commit)"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === 'Enter') {
                commit();
              }
            }}
          />
          <div className="commit-actions">
            <button 
              className="commit-button" 
              onClick={commit}
              disabled={!commitMessage.trim() || stagedChanges.length === 0 || loading}
            >
              <FiCheck size={14} />
              Commit
            </button>
            <button className="action-button" onClick={push} disabled={loading}>
              <FiUpload size={14} />
            </button>
            <button className="action-button" onClick={pull} disabled={loading}>
              <FiDownload size={14} />
            </button>
          </div>
        </div>

        {/* Changes */}
        <div className="changes-section">
          {unstagedChanges.length > 0 && (
            <div className="changes-group">
              <div className="changes-header">
                <span>Changes ({unstagedChanges.length})</span>
                <button className="stage-all-button" onClick={stageAll}>
                  <FiPlus size={12} />
                </button>
              </div>
              <div className="changes-list">
                {unstagedChanges.map((change, i) => (
                  <div key={i} className="change-item" onClick={() => stageFile(change.file)}>
                    <span className={`change-status ${change.status.toLowerCase()}`}>
                      {change.status[0]}
                    </span>
                    <span className="change-file">{change.file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stagedChanges.length > 0 && (
            <div className="changes-group">
              <div className="changes-header">
                <span>Staged Changes ({stagedChanges.length})</span>
              </div>
              <div className="changes-list">
                {stagedChanges.map((change, i) => (
                  <div key={i} className="change-item" onClick={() => unstageFile(change.file)}>
                    <span className={`change-status ${change.status.toLowerCase()}`}>
                      {change.status[0]}
                    </span>
                    <span className="change-file">{change.file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {changes.length === 0 && (
            <div className="no-changes">
              <FiGitCommit size={32} />
              <p>No changes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SourceControl;
