import React from 'react';
import { 
  FiFile, 
  FiSearch, 
  FiGitBranch, 
  FiPlayCircle, 
  FiPackage, 
  FiSettings,
  FiMessageSquare,
  FiImage,
  FiGlobe
} from 'react-icons/fi';
import './ActivityBar.css';

function ActivityBar({ activeView, onViewChange, onAIToggle, onShowPublishedApps }) {
  const buttons = [
    { id: 'explorer', icon: FiFile, tooltip: 'Explorer' },
    { id: 'search', icon: FiSearch, tooltip: 'Search' },
    { id: 'git', icon: FiGitBranch, tooltip: 'Source Control' },
    { id: 'run', icon: FiPlayCircle, tooltip: 'Run and Debug' },
    { id: 'images', icon: FiImage, tooltip: 'Image Search' },
    { id: 'extensions', icon: FiPackage, tooltip: 'Extensions' },
  ];

  return (
    <div className="activity-bar">
      <div className="activity-buttons">
        {buttons.map((button) => (
          <button
            key={button.id}
            className={`activity-button ${activeView === button.id ? 'active' : ''}`}
            onClick={() => onViewChange(button.id)}
            title={button.tooltip}
          >
            <button.icon size={24} />
          </button>
        ))}
      </div>
      <div className="activity-buttons-bottom">
        <button
          className="activity-button"
          onClick={onShowPublishedApps}
          title="My Published Apps"
        >
          <FiGlobe size={24} />
        </button>
        <button
          className="activity-button ai-button"
          onClick={onAIToggle}
          title="AI Assistant"
        >
          <FiMessageSquare size={24} />
        </button>
        <button
          className="activity-button"
          onClick={() => onViewChange('settings')}
          title="Settings"
        >
          <FiSettings size={24} />
        </button>
      </div>
    </div>
  );
}

export default ActivityBar;
