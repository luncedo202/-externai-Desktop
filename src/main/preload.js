const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File System
  fs: {
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
    createFile: (filePath) => ipcRenderer.invoke('fs:createFile', filePath),
    createDir: (dirPath) => ipcRenderer.invoke('fs:createDir', dirPath),
    delete: (itemPath) => ipcRenderer.invoke('fs:delete', itemPath),
    rename: (oldPath, newPath) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
  },

  // Dialogs
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
    saveFile: (defaultPath) => ipcRenderer.invoke('dialog:saveFile', defaultPath),
  },

  // Terminal
  terminal: {
    create: (cwd) => ipcRenderer.invoke('terminal:create', cwd),
    write: (terminalId, data) => ipcRenderer.invoke('terminal:write', terminalId, data),
    resize: (terminalId, cols, rows) => ipcRenderer.invoke('terminal:resize', terminalId, cols, rows),
    kill: (terminalId) => ipcRenderer.invoke('terminal:kill', terminalId),
    getOutput: (terminalId) => ipcRenderer.invoke('terminal:getOutput', terminalId),
    onData: (callback) => ipcRenderer.on('terminal:data', (event, terminalId, data) => callback(terminalId, data)),
    onExit: (callback) => ipcRenderer.on('terminal:exit', (event, terminalId) => callback(terminalId)),
  },

  // File Watcher
  watch: {
    start: (dirPath) => ipcRenderer.invoke('watch:start', dirPath),
    stop: (dirPath) => ipcRenderer.invoke('watch:stop', dirPath),
    onFileAdded: (callback) => ipcRenderer.on('file:added', (event, path) => callback(path)),
    onFileChanged: (callback) => ipcRenderer.on('file:changed', (event, path) => callback(path)),
    onFileRemoved: (callback) => ipcRenderer.on('file:removed', (event, path) => callback(path)),
    onDirAdded: (callback) => ipcRenderer.on('dir:added', (event, path) => callback(path)),
    onDirRemoved: (callback) => ipcRenderer.on('dir:removed', (event, path) => callback(path)),
  },

  // Menu Events
  menu: {
    onNewFile: (callback) => ipcRenderer.on('menu-new-file', callback),
    onOpenFile: (callback) => ipcRenderer.on('menu-open-file', (event, filePath) => callback(filePath)),
    onOpenFolder: (callback) => ipcRenderer.on('menu-open-folder', (event, folderPath) => callback(folderPath)),
    onSave: (callback) => ipcRenderer.on('menu-save', callback),
    onSaveAs: (callback) => ipcRenderer.on('menu-save-as', callback),
    onToggleTerminal: (callback) => ipcRenderer.on('menu-toggle-terminal', callback),
    onToggleSidebar: (callback) => ipcRenderer.on('menu-toggle-sidebar', callback),
    onNewTerminal: (callback) => ipcRenderer.on('menu-new-terminal', callback),
    onSplitTerminal: (callback) => ipcRenderer.on('menu-split-terminal', callback),
  },

  // Output Channel
  output: {
    log: (channel, message, type) => ipcRenderer.invoke('output:log', { channel, message, type }),
    clear: (channel) => ipcRenderer.invoke('output:clear', channel),
    get: (channel) => ipcRenderer.invoke('output:get', channel),
    onMessage: (callback) => ipcRenderer.on('output:message', (event, data) => callback(data)),
  },

  // Process Runner
  process: {
    run: (command, cwd) => ipcRenderer.invoke('process:run', { command, cwd }),
  },

  // Diagnostics/Problems
  diagnostics: {
    analyze: (filePath) => ipcRenderer.invoke('diagnostics:analyze', filePath),
    clear: (filePath) => ipcRenderer.invoke('diagnostics:clear', filePath),
    onCleared: (callback) => ipcRenderer.on('diagnostics:cleared', (event, filePath) => callback(filePath)),
  },

  // Debug Console
  debug: {
    evaluate: (expression) => ipcRenderer.invoke('debug:evaluate', expression),
    log: (message, level) => ipcRenderer.invoke('debug:log', { message, level }),
    onMessage: (callback) => ipcRenderer.on('debug:message', (event, data) => callback(data)),
  },

  // Workspace Context
  workspace: {
    scan: (dirPath) => ipcRenderer.invoke('workspace:scan', dirPath),
    listFiles: (dirPath) => ipcRenderer.invoke('workspace:listFiles', dirPath),
  },

  // Terminal Execution (for AI to run commands)
  terminalExecute: (command, cwd) => ipcRenderer.invoke('terminal:execute', { command, cwd }),
  terminalWrite: (terminalId, data) => ipcRenderer.invoke('terminal:write', terminalId, data),

  // Shell operations
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  },

  // Image search
  images: {
    search: (query) => ipcRenderer.invoke('images:search', query),
  },

  // Search in files
  searchInFiles: (options) => ipcRenderer.invoke('search:inFiles', options),

  // Claude API
  claude: {
    complete: (prompt, maxTokens) => ipcRenderer.invoke('claude:complete', { prompt, maxTokens }),
    stream: (prompt, maxTokens) => ipcRenderer.invoke('claude:stream', { prompt, maxTokens }),
    onStreamChunk: (callback) => ipcRenderer.on('claude:stream:chunk', (event, data) => callback(data)),
    onStreamDone: (callback) => ipcRenderer.on('claude:stream:done', (event, data) => callback(data)),
    onStreamError: (callback) => ipcRenderer.on('claude:stream:error', (event, data) => callback(data)),
    removeStreamListeners: () => {
      ipcRenderer.removeAllListeners('claude:stream:chunk');
      ipcRenderer.removeAllListeners('claude:stream:done');
      ipcRenderer.removeAllListeners('claude:stream:error');
    },
  },

  // Authentication
  auth: {
    setTokens: (tokens) => ipcRenderer.invoke('auth:setTokens', tokens),
    getTokens: () => ipcRenderer.invoke('auth:getTokens'),
    clearTokens: () => ipcRenderer.invoke('auth:clearTokens'),
    setUser: (user) => ipcRenderer.invoke('auth:setUser', user),
    getUser: () => ipcRenderer.invoke('auth:getUser'),
    clearUser: () => ipcRenderer.invoke('auth:clearUser'),
  },
});
