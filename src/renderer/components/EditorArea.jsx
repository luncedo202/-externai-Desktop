import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { FiX, FiMonitor, FiCode, FiUploadCloud } from 'react-icons/fi';
import './EditorArea.css';

function EditorArea({ openFiles, activeFile, onFileSelect, onFileClose, onContentChange, onOpenFolder, theme, onPreviewClick, onPublishClick, onCursorChange, pendingPlan, devServerUrl }) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('http://localhost:3000');
  const [fontSize, setFontSize] = useState(12);
  const [tabSize, setTabSize] = useState(2);
  const currentFile = openFiles.find((f) => f.id === activeFile);

  // Sync previewUrl with devServerUrl when it changes
  useEffect(() => {
    if (devServerUrl) {
      setPreviewUrl(devServerUrl);
      // Don't auto-show preview - user can click Show Preview manually
    }
  }, [devServerUrl]);

  // Debug logging for pendingPlan
  useEffect(() => {
    console.log('[EditorArea] pendingPlan changed:', pendingPlan);
  }, [pendingPlan]);

  // Load editor settings from localStorage
  useEffect(() => {
    const savedFontSize = parseInt(localStorage.getItem('editorFontSize')) || 12;
    const savedTabSize = parseInt(localStorage.getItem('editorTabSize')) || 2;
    setFontSize(savedFontSize);
    setTabSize(savedTabSize);

    // Listen for storage changes to update in real-time
    const handleStorageChange = () => {
      setFontSize(parseInt(localStorage.getItem('editorFontSize')) || 12);
      setTabSize(parseInt(localStorage.getItem('editorTabSize')) || 2);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleEditorChange = (value) => {
    if (currentFile) {
      onContentChange(currentFile.id, value);
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    // Initial position update
    const position = editor.getPosition();
    if (position && onCursorChange) {
      onCursorChange({ line: position.lineNumber, column: position.column });
    }

    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange({ line: e.position.lineNumber, column: e.position.column });
      }
    });

    // Also update when focus changes as that might indicate a switch back to this editor
    editor.onDidFocusEditorText(() => {
      const position = editor.getPosition();
      if (position && onCursorChange) {
        onCursorChange({ line: position.lineNumber, column: position.column });
      }
    });
  };

  const handleOpenFolder = async () => {
    const result = await window.electronAPI.dialog.openFolder();
    if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      if (onOpenFolder) {
        onOpenFolder(folderPath);
      }
    }
  };

  const handleOpenFile = async () => {
    const result = await window.electronAPI.dialog.openFile();
    if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      if (onFileOpen) {
        onFileOpen(filePath);
      }
    }
  };

  const handleQuickStart = async (template) => {
    const result = await window.electronAPI.dialog.openFolder();
    if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      if (onOpenFolder) {
        onOpenFolder(folderPath);
      }
      // Trigger AI with template-specific instructions
      if (onQuickStart) {
        const templates = {
          'ecommerce': 'Build a full-stack e-commerce platform with product catalog, shopping cart, checkout process, user authentication, order management, payment integration (Stripe), admin dashboard, and responsive design. Use React for frontend, Node.js/Express for backend, and MongoDB for database.',
          'saas-dashboard': 'Create a complete SaaS dashboard application with user authentication (JWT), subscription management, analytics charts, data tables, user settings, team collaboration features, API integration, and modern UI. Use React, TypeScript, Tailwind CSS, and include a backend with database.',
          'social-media': 'Build a social media application with user profiles, post creation with image uploads, like/comment system, follow/unfollow functionality, feed algorithm, real-time notifications, direct messaging, and search. Include authentication, database design, and modern responsive UI.',
          'streaming': 'Create a video streaming platform with video upload and processing, player with controls, user authentication, subscription tiers, content recommendations, watch history, playlists, comments, and admin panel. Use React for frontend and Node.js backend with video processing capabilities.',
          'realtime-chat': 'Build a real-time chat application with WebSocket connections, multiple chat rooms, direct messaging, typing indicators, online status, message history, file sharing, user authentication, notifications, and modern chat UI. Include both frontend (React) and backend (Node.js with Socket.io).'
        };
        onQuickStart(templates[template] || '');
      }
    }
  };

  const handlePreviewClick = () => {
    // Only trigger AI to run the dev server - don't show preview in editor area
    if (onPreviewClick && !devServerUrl) {
      onPreviewClick();
    }
    // Preview will open in external browser, not in editor
  };

  // Determine Monaco theme based on app theme
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

  return (
    <div className="editor-area">
      <div className="editor-tabs">
        {openFiles.map((file) => (
          <div
            key={file.id}
            className={`editor-tab ${file.id === activeFile ? 'active' : ''}`}
            onClick={() => onFileSelect(file.id)}
          >
            <span className="tab-name">
              {file.isDirty && <span className="dirty-indicator">●</span>}
              {file.name}
            </span>
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onFileClose(file.id);
              }}
            >
              <FiX size={14} />
            </button>
          </div>
        ))}
        <div className="editor-toolbar">
          <button
            className={`toolbar-button ${showPreview ? 'active' : ''}`}
            onClick={handlePreviewClick}
            title="Toggle Live Preview"
          >
            <FiMonitor size={16} />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button
            className="toolbar-button"
            onClick={onPublishClick}
            title="Deploy and get shareable link"
          >
            <FiUploadCloud size={16} />
            Publish
          </button>
          {showPreview && (
            <input
              type="text"
              className="preview-url-input"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              placeholder="Preview URL"
            />
          )}
        </div>
      </div>
      <div className="editor-content" style={{ display: 'flex' }}>
        {openFiles.length > 0 ? (
          <>
            <div className="editor-pane" style={{ flex: 1, display: activeFile ? 'block' : 'none' }}>
              {currentFile && (
                <Editor
                  height="100%"
                  language={currentFile.language}
                  value={currentFile.content}
                  onChange={handleEditorChange}
                  theme={monacoTheme}
                  onMount={handleEditorDidMount}
                  loading={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--vscode-fg)' }}>Loading editor...</div>}
                  options={{
                    // Typography
                    fontSize: fontSize,
                    fontFamily: "'SF Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
                    lineHeight: 20,
                    
                    // Core editing - keep it simple
                    tabSize: tabSize,
                    insertSpaces: true,
                    wordWrap: 'off',
                    autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always',
                    autoIndent: 'full',
                    formatOnPaste: true,
                    formatOnType: true,
                    
                    // Line numbers
                    lineNumbers: 'on',
                    lineNumbersMinChars: 3,
                    
                    // UI
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    folding: true,
                    renderLineHighlight: 'line',
                    
                    // Cursor
                    cursorStyle: 'line',
                    cursorBlinking: 'blink',
                    
                    // Scrollbar
                    scrollbar: {
                      vertical: 'auto',
                      horizontal: 'auto',
                    },
                    
                    // Disable distracting features
                    renderWhitespace: 'none',
                    glyphMargin: false,
                    quickSuggestions: true,
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnEnter: 'on',
                    
                    // Make selection easier
                    selectOnLineNumbers: true,
                    roundedSelection: true,
                    
                    // Accessibility
                    accessibilitySupport: 'auto',
                  }}
                />
              )}
            </div>
          </>
        ) : (
          <div className="editor-welcome">
            <h1>ExternAI</h1>
            <p className="welcome-subtitle">AI-Powered Development Environment</p>
            <div className="welcome-actions">
              <div className="welcome-section primary-section">
                <h3>Get Started</h3>
              </div>
              
              <div className="welcome-section secondary-section">
                <h3>Build Something Ambitious</h3>
                <button className="welcome-button" onClick={() => handleQuickStart('ecommerce')}>
                  E-commerce Platform
                </button>
                <button className="welcome-button" onClick={() => handleQuickStart('saas-dashboard')}>
                  SaaS Dashboard
                </button>
                <button className="welcome-button" onClick={() => handleQuickStart('social-media')}>
                  Social Media App
                </button>
                <button className="welcome-button" onClick={() => handleQuickStart('streaming')}>
                  Video Streaming Platform
                </button>
                <button className="welcome-button" onClick={() => handleQuickStart('realtime-chat')}>
                  Real-time Chat App
                </button>
              </div>
            </div>
            
            <div className="welcome-footer">
              <p className="welcome-tip">
                <strong>Tip:</strong> Just tell the AI what you want to build in plain English!
              </p>
              <div className="welcome-details">
                <p>The AI assistant can help you:</p>
                <ul>
                  <li>Build your entire website or app from scratch</li>
                  <li>Fix any errors or bugs automatically</li>
                  <li>Explain what your code does in simple terms</li>
                  <li>Add new features to your project</li>
                  <li>Make your design look better</li>
                  <li><strong>Publish with one click</strong> - Get a shareable link instantly!</li>
                </ul>
                <p className="welcome-example">
                  <strong>Try saying:</strong> "Build me a website where people can create an account, 
                  share photos, and comment on each other's posts"
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditorArea;
