import React, { useState, useEffect, useRef } from 'react';
import { FiUploadCloud, FiX, FiCopy, FiExternalLink, FiCheck, FiAlertCircle, FiGlobe, FiRefreshCw } from 'react-icons/fi';
import PublishService from '../services/PublishService';
import './PublishModal.css';

const STEPS = [
    { id: 'preparing', label: 'Preparing project' },
    { id: 'scanning', label: 'Scanning files' },
    { id: 'uploading', label: 'Uploading to cloud' },
    { id: 'complete', label: 'Going live' },
];

function PublishModal({ onClose, workspaceFolder, projectName: initialProjectName }) {
    const [phase, setPhase] = useState('input'); // 'input' | 'publishing' | 'success' | 'error'
    const [projectName, setProjectName] = useState(
        initialProjectName
            ? initialProjectName.replace(/[^a-zA-Z0-9 ]/g, ' ').trim()
            : 'My App'
    );
    const [currentStep, setCurrentStep] = useState(0);
    const [stepMessage, setStepMessage] = useState('');
    const [publishedUrl, setPublishedUrl] = useState('');
    const [isUpdate, setIsUpdate] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [needsBuild, setNeedsBuild] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (phase === 'input' && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [phase]);

    const handlePublish = async () => {
        if (!projectName.trim()) return;
        if (!workspaceFolder) {
            setError('No project folder is open. Please open a folder first.');
            setPhase('error');
            return;
        }

        setPhase('publishing');
        setCurrentStep(0);
        setError('');

        const result = await PublishService.publishProject(
            workspaceFolder,
            projectName.trim(),
            (progress) => {
                const idx = STEPS.findIndex(s => s.id === progress.status);
                if (idx !== -1) setCurrentStep(idx);
                setStepMessage(progress.message || '');
            }
        );

        if (result.success) {
            setPublishedUrl(result.url);
            setIsUpdate(result.isUpdate || false);
            setPhase('success');
        } else {
            setError(result.error || 'Something went wrong. Please try again.');
            setNeedsBuild(result.needsBuild || false);
            setPhase('error');
        }
    };

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(publishedUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // fallback
        }
    };

    const handleOpenUrl = () => {
        if (window.electronAPI?.shell?.openExternal) {
            window.electronAPI.shell.openExternal(publishedUrl);
        } else {
            window.open(publishedUrl, '_blank');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && phase === 'input') handlePublish();
        if (e.key === 'Escape') onClose();
    };

    return (
        <div className="pm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="pm-modal" onKeyDown={handleKeyDown} tabIndex={-1}>
                {/* Header */}
                <div className="pm-header">
                    <div className="pm-header-left">
                        <div className="pm-icon-wrap">
                            <FiGlobe size={18} />
                        </div>
                        <div>
                            <h2 className="pm-title">Publish</h2>
                            <p className="pm-subtitle">Share your app with the world</p>
                        </div>
                    </div>
                    <button className="pm-close" onClick={onClose} aria-label="Close">
                        <FiX size={18} />
                    </button>
                </div>

                {/* ── INPUT PHASE ─────────────────────────────── */}
                {phase === 'input' && (
                    <div className="pm-body">
                        <div className="pm-field">
                            <label className="pm-label" htmlFor="pm-name">Project name</label>
                            <input
                                id="pm-name"
                                ref={inputRef}
                                className="pm-input"
                                type="text"
                                value={projectName}
                                onChange={e => setProjectName(e.target.value)}
                                placeholder="my-awesome-app"
                                maxLength={40}
                            />
                            <p className="pm-hint">
                                Your app will be available at a unique URL like
                                <br />
                                <span className="pm-url-preview">
                                    https://externai-desktop.web.app/app/{projectName
                                        .toLowerCase()
                                        .replace(/[^a-z0-9-\s]/g, '')
                                        .replace(/\s+/g, '-')
                                        .substring(0, 20) || 'my-app'}-xxxxxxxx
                                </span>
                            </p>
                        </div>

                        <div className="pm-info-box">
                            <FiUploadCloud size={16} className="pm-info-icon" />
                            <p>
                                ExternAI will bundle your project files and host them on our
                                cloud — no build step or Vercel account needed.
                            </p>
                        </div>

                        {!workspaceFolder && (
                            <div className="pm-warn-box">
                                <FiAlertCircle size={16} />
                                <p>Open a project folder first before publishing.</p>
                            </div>
                        )}

                        <div className="pm-actions">
                            <button className="pm-btn-secondary" onClick={onClose}>Cancel</button>
                            <button
                                className="pm-btn-primary"
                                onClick={handlePublish}
                                disabled={!projectName.trim() || !workspaceFolder}
                            >
                                <FiUploadCloud size={16} />
                                Publish now
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PUBLISHING PHASE ────────────────────────── */}
                {phase === 'publishing' && (
                    <div className="pm-body pm-publishing">
                        <div className="pm-progress-wrap">
                            {STEPS.map((step, idx) => {
                                const done = idx < currentStep;
                                const active = idx === currentStep;
                                const pending = idx > currentStep;
                                return (
                                    <div key={step.id} className={`pm-step ${done ? 'done' : active ? 'active' : 'pending'}`}>
                                        <div className="pm-step-dot">
                                            {done ? <FiCheck size={12} /> :
                                                active ? <FiRefreshCw size={12} className="pm-spin" /> :
                                                    <span className="pm-step-num">{idx + 1}</span>}
                                        </div>
                                        <span className="pm-step-label">{step.label}</span>
                                        {idx < STEPS.length - 1 && <div className={`pm-step-line ${done ? 'done' : ''}`} />}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="pm-step-msg">{stepMessage || 'Getting things ready...'}</p>
                        <div className="pm-uploading-animation">
                            <div className="pm-pulse-ring" />
                            <div className="pm-pulse-ring pm-pulse-ring--delay" />
                            <FiUploadCloud size={28} className="pm-upload-icon" />
                        </div>
                    </div>
                )}

                {/* ── SUCCESS PHASE ───────────────────────────── */}
                {phase === 'success' && (
                    <div className="pm-body pm-success">
                        <div className="pm-success-icon">
                            <FiCheck size={32} />
                        </div>
                        <h3 className="pm-success-title">
                            {isUpdate ? 'App updated!' : 'App is live!'}
                        </h3>
                        <p className="pm-success-desc">
                            {isUpdate
                                ? 'Your changes have been deployed successfully.'
                                : 'Your project is now hosted and shareable.'}
                        </p>

                        <div className="pm-url-box">
                            <span className="pm-url-text">{publishedUrl}</span>
                        </div>

                        <div className="pm-url-actions">
                            <button className="pm-btn-copy" onClick={handleCopyUrl}>
                                {copied ? <><FiCheck size={14} /> Copied!</> : <><FiCopy size={14} /> Copy link</>}
                            </button>
                            <button className="pm-btn-open" onClick={handleOpenUrl}>
                                <FiExternalLink size={14} />
                                Open app
                            </button>
                        </div>

                        <div className="pm-actions pm-actions--success">
                            <button className="pm-btn-secondary" onClick={onClose}>Done</button>
                            <button
                                className="pm-btn-primary"
                                onClick={() => {
                                    setPhase('input');
                                    setPublishedUrl('');
                                    setIsUpdate(false);
                                }}
                            >
                                <FiUploadCloud size={16} />
                                Publish again
                            </button>
                        </div>
                    </div>
                )}

                {/* ── ERROR PHASE ─────────────────────────────── */}
                {phase === 'error' && (
                    <div className="pm-body pm-error">
                        <div className="pm-error-icon">
                            <FiAlertCircle size={32} />
                        </div>
                        <h3 className="pm-error-title">Publish failed</h3>
                        <p className="pm-error-desc">{error}</p>

                        {needsBuild && (
                            <div className="pm-info-box pm-info-box--tip">
                                <strong>Tip:</strong> Run <code>npm run build</code> in the terminal
                                first, then try publishing again.
                            </div>
                        )}

                        <div className="pm-actions">
                            <button className="pm-btn-secondary" onClick={onClose}>Cancel</button>
                            <button
                                className="pm-btn-primary"
                                onClick={() => { setError(''); setNeedsBuild(false); setPhase('input'); }}
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PublishModal;
