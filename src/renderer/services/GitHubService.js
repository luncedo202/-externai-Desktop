const STORAGE_KEY = 'github_pat';
const USER_KEY = 'github_user_cache';
const REPO_KEY = 'github_project_repo';

class GitHubService {
  // ── Persistence ──────────────────────────────────────────────────────────
  saveToken(token) { localStorage.setItem(STORAGE_KEY, token); }
  loadToken() { return localStorage.getItem(STORAGE_KEY); }

  saveUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); }
  loadUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  }

  saveRepo(repo) { localStorage.setItem(REPO_KEY, JSON.stringify(repo)); }
  loadRepo() {
    try { return JSON.parse(localStorage.getItem(REPO_KEY)); } catch { return null; }
  }

  clear() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REPO_KEY);
  }

  // ── API helpers ───────────────────────────────────────────────────────────
  _headers(token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  async getUser(token) {
    const res = await fetch('https://api.github.com/user', {
      headers: this._headers(token),
    });
    if (res.status === 401) throw new Error('Invalid token. Make sure you copied it correctly.');
    if (!res.ok) throw new Error('Could not connect to GitHub. Check your internet connection.');
    return res.json();
  }

  async getRepos(token) {
    const res = await fetch(
      'https://api.github.com/user/repos?sort=updated&per_page=20&type=owner',
      { headers: this._headers(token) }
    );
    if (!res.ok) throw new Error('Failed to load your projects from GitHub.');
    return res.json();
  }

  async createRepo(token, name, isPrivate = true) {
    const res = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: { ...this._headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, private: isPrivate, auto_init: false }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.errors?.[0]?.message || err.message || 'Failed to create project on GitHub';
      if (msg.toLowerCase().includes('already exists'))
        throw new Error('A project with that name already exists on your GitHub.');
      throw new Error(msg);
    }
    return res.json();
  }

  async repoExists(token, owner, name) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
      headers: this._headers(token),
    });
    return res.ok;
  }

  // ── Git operations via Electron IPC ──────────────────────────────────────
  async _git(command, cwd) {
    const result = await window.electronAPI.terminalExecute(command, cwd);
    // Some git commands (like `git remote remove`) fail silently — that's OK
    return result;
  }

  /**
   * Push workspaceFolder to a GitHub repo.
   * Creates the repo if it doesn't exist yet.
   * Returns { repoUrl }.
   */
  async pushToGitHub({ token, owner, repoName, isPrivate, workspaceFolder, onStep }) {
    const sanitized = repoName.trim().replace(/[^a-zA-Z0-9._-]/g, '-');

    onStep('Creating project on GitHub…');
    const exists = await this.repoExists(token, owner, sanitized);
    let repoUrl;
    if (!exists) {
      const repo = await this.createRepo(token, sanitized, isPrivate);
      repoUrl = repo.html_url;
    } else {
      repoUrl = `https://github.com/${owner}/${sanitized}`;
    }

    const authUrl = `https://${token}@github.com/${owner}/${sanitized}.git`;

    onStep('Setting up version control…');
    await this._git('git init', workspaceFolder);
    await this._git('git checkout -b main 2>/dev/null || git checkout main', workspaceFolder);

    onStep('Adding your files…');
    await this._git('git add .', workspaceFolder);

    onStep('Saving a snapshot…');
    const date = new Date().toLocaleDateString();
    await this._git(
      `git -c user.email="externai@user.com" -c user.name="ExternAI" commit -m "Saved via ExternAI on ${date}" --allow-empty`,
      workspaceFolder
    );

    onStep('Uploading to GitHub…');
    await this._git('git remote remove origin', workspaceFolder); // ignore error if absent
    await this._git(`git remote add origin ${authUrl}`, workspaceFolder);
    await this._git('git branch -M main', workspaceFolder);
    const push = await this._git('git push -u origin main --force', workspaceFolder);
    if (!push.success && push.stderr && push.stderr.includes('error')) {
      throw new Error('Upload failed. ' + (push.stderr || push.error));
    }

    this.saveRepo({ name: sanitized, url: repoUrl, owner });
    return { repoUrl };
  }

  /**
   * Push latest changes to an already connected repo.
   */
  async pushLatest({ token, owner, repoName, workspaceFolder, onStep }) {
    const authUrl = `https://${token}@github.com/${owner}/${repoName}.git`;

    onStep('Adding changes…');
    await this._git('git add .', workspaceFolder);

    onStep('Saving snapshot…');
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    await this._git(
      `git -c user.email="externai@user.com" -c user.name="ExternAI" commit -m "Updated via ExternAI — ${date}" --allow-empty`,
      workspaceFolder
    );

    onStep('Uploading to GitHub…');
    await this._git('git remote remove origin', workspaceFolder);
    await this._git(`git remote add origin ${authUrl}`, workspaceFolder);
    const push = await this._git('git push origin main --force', workspaceFolder);
    if (!push.success && push.stderr && push.stderr.includes('error')) {
      throw new Error('Upload failed. ' + (push.stderr || push.error));
    }
  }
}

export default new GitHubService();
