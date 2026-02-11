import React from 'react';
import './NodeJsRequiredModal.css';

function NodeJsRequiredModal({ onDownload, onDismiss }) {
    return (
        <div className="nodejs-modal-overlay">
            <div className="nodejs-modal">
                <button className="nodejs-modal-close" onClick={onDismiss} aria-label="Dismiss">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <div className="nodejs-modal-icon">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <circle cx="32" cy="32" r="30" fill="#68A063" opacity="0.1" />
                        <path d="M32 16L44 23V37L32 44L20 37V23L32 16Z" fill="#68A063" />
                        <path d="M32 28V36M28 30L32 28L36 30V34L32 36L28 34V30Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                <h2>Node.js Required</h2>

                <p className="nodejs-modal-description">
                    ExternAI requires <strong>Node.js</strong> to run terminal commands and install dependencies.
                    Node.js is not currently installed on your system.
                </p>

                <div className="nodejs-modal-features">
                    <div className="nodejs-feature">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <circle cx="10" cy="10" r="9" stroke="#68A063" strokeWidth="2" />
                            <path d="M6 10L9 13L14 7" stroke="#68A063" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Run npm commands</span>
                    </div>
                    <div className="nodejs-feature">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <circle cx="10" cy="10" r="9" stroke="#68A063" strokeWidth="2" />
                            <path d="M6 10L9 13L14 7" stroke="#68A063" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Install project dependencies</span>
                    </div>
                    <div className="nodejs-feature">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <circle cx="10" cy="10" r="9" stroke="#68A063" strokeWidth="2" />
                            <path d="M6 10L9 13L14 7" stroke="#68A063" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Build and run applications</span>
                    </div>
                </div>

                <div className="nodejs-modal-actions">
                    <button className="nodejs-download-btn" onClick={onDownload}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M10 3V13M10 13L6 9M10 13L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M3 17H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Download Node.js Now
                    </button>
                    <button className="nodejs-skip-btn" onClick={onDismiss}>
                        Skip for now
                    </button>
                </div>

                <p className="nodejs-modal-note">
                    Note: If you skip, some features may not work until Node.js is installed.
                </p>
            </div>
        </div>
    );
}

export default NodeJsRequiredModal;
