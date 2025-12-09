import React from 'react';
import Explorer from './sidebar/Explorer';
import Search from './sidebar/Search';
import SourceControl from './sidebar/SourceControl';
import RunDebug from './sidebar/RunDebug';
import ImageSearch from './sidebar/ImageSearch';
import Settings from './sidebar/Settings';
import './Sidebar.css';

function Sidebar({ activeView, workspaceFolder, onOpenFile, onOpenFolder, explorerRefreshTrigger, theme, onToggleTheme, onLogout }) {
  const renderView = () => {
    switch (activeView) {
      case 'explorer':
        return (
          <Explorer
            workspaceFolder={workspaceFolder}
            onOpenFile={onOpenFile}
            onOpenFolder={onOpenFolder}
            refreshTrigger={explorerRefreshTrigger}
          />
        );
      case 'search':
        return <Search workspaceFolder={workspaceFolder} onOpenFile={onOpenFile} />;
      case 'git':
        return <SourceControl workspaceFolder={workspaceFolder} />;
      case 'run':
        return <RunDebug workspaceFolder={workspaceFolder} />;
      case 'images':
        return <ImageSearch />;
      case 'extensions':
        return <div className="sidebar-content">Extensions</div>;
      case 'settings':
        return <Settings theme={theme} onToggleTheme={onToggleTheme} onLogout={onLogout} />;
      default:
        return null;
    }
  };

  return (
    <div className="sidebar">
      {renderView()}
    </div>
  );
}

export default Sidebar;
