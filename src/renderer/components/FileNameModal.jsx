import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiFile } from 'react-icons/fi';
import './FileNameModal.css';

function FileNameModal({ isOpen, onClose, onConfirm, defaultName, language }) {
  const [fileName, setFileName] = useState(defaultName || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFileName(defaultName || '');
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (fileName.trim()) {
      onConfirm(fileName.trim());
      setFileName('');
    }
  };

  const handleCancel = () => {
    setFileName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FiFile />
            <span>Save {language} Code</span>
          </div>
          <button className="modal-close-btn" onClick={handleCancel}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label htmlFor="fileName">Enter filename:</label>
            <input
              ref={inputRef}
              id="fileName"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g., index.html"
              autoComplete="off"
            />
            <p className="modal-hint">
              File will be created in: <code>{fileName || 'your-workspace'}</code>
            </p>
          </div>

          <div className="modal-footer">
            <button type="button" className="modal-btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="modal-btn-confirm"
              disabled={!fileName.trim()}
            >
              Create File
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FileNameModal;
