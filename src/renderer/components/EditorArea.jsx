import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { FiX, FiMonitor, FiCode } from 'react-icons/fi';
import './EditorArea.css';

function EditorArea({ openFiles, activeFile, onFileSelect, onFileClose, onContentChange, onOpenFolder }) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('http://localhost:3000');
  const currentFile = openFiles.find((f) => f.id === activeFile);

  // Debug logging
  React.useEffect(() => {
    console.log('🎨 EditorArea render:', {
      openFilesCount: openFiles.length,
      activeFile,
      currentFile: currentFile ? {
        id: currentFile.id,
        name: currentFile.name,
        contentLength: currentFile.content?.length,
        contentPreview: currentFile.content?.substring(0, 50),
        language: currentFile.language,
        hasContent: !!currentFile.content
      } : null
    });
    
    if (currentFile && !currentFile.content) {
      console.error('⚠️ WARNING: currentFile has no content!', currentFile);
    }
  }, [openFiles, activeFile, currentFile]);

  const handleEditorChange = (value) => {
    if (currentFile) {
      onContentChange(currentFile.id, value);
    }
  };

  const handleCreateProject = async (projectType) => {
    // Open folder dialog
    const result = await window.electronAPI.dialog.openFolder();
    if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      // Call onOpenFolder to set the workspace
      if (onOpenFolder) {
        onOpenFolder(folderPath);
      }
    }
  };

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
            onClick={() => setShowPreview(!showPreview)}
            title="Toggle Live Preview"
          >
            {showPreview ? <FiCode size={16} /> : <FiMonitor size={16} />}
            {showPreview ? 'Code' : 'Preview'}
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
        {!showPreview && currentFile ? (
          <Editor
            key={currentFile.id}
            height="100%"
            language={currentFile.language}
            value={currentFile.content || ''}
            onChange={handleEditorChange}
            theme="vs-dark"
            loading={<div style={{ padding: '20px', color: '#fff' }}>Loading editor...</div>}
            onMount={(editor, monaco) => {
              console.log('🎯 Monaco Editor mounted for file:', currentFile.name);
              console.log('📝 Editor content length:', editor.getValue().length);
            }}
            options={{
              fontSize: 14,
              fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderWhitespace: 'selection',
              scrollbar: {
                vertical: 'auto',
                horizontal: 'auto',
              },
            }}
          />
        ) : showPreview ? (
          <div className="live-preview-container">
            <iframe
              src={previewUrl}
              className="live-preview-iframe"
              title="Live Preview"
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          </div>
        ) : (
          <div className="editor-welcome">
            <h1>ExternAI</h1>
            <p className="welcome-subtitle">AI-Powered Development Environment</p>
            <div className="welcome-actions">
              <div className="welcome-section">
                <h3>Create Project</h3>
                <button className="welcome-button" onClick={() => handleCreateProject('website')}>
                  Website Project
                </button>
                <button className="welcome-button" onClick={() => handleCreateProject('mobile')}>
                  Mobile App Project
                </button>
                <button className="welcome-button" onClick={() => handleCreateProject('game')}>
                  Game Project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditorArea;
