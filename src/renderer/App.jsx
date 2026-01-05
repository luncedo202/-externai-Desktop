import React, { useState, useRef, useEffect, forwardRef } from 'react';
import ActivityBar from './components/ActivityBar';
import Sidebar from './components/Sidebar';
import EditorArea from './components/EditorArea';
import Panel from './components/Panel';
import StatusBar from './components/StatusBar';
import AIAssistant from './components/AIAssistant';
import AuthScreen from './components/AuthScreen';
import FirebaseService from './services/FirebaseService';
import AnalyticsService from './services/AnalyticsService';
import PricingPlans from './components/PricingPlans';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeView, setActiveView] = useState('explorer');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [panelVisible, setPanelVisible] = useState(true);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [workspaceFolder, setWorkspaceFolder] = useState(null);
  const [terminals, setTerminals] = useState([]);
  const [aiVisible, setAiVisible] = useState(true);
  const [explorerRefreshTrigger, setExplorerRefreshTrigger] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [theme, setTheme] = useState(() => {
    // Load theme from localStorage or default to 'light'
    // Changed key to 'app_theme' to reset legacy 'dark' preference
    return localStorage.getItem('app_theme') || 'light';
  });

  // New state for panels
  const [outputLogs, setOutputLogs] = useState([]);
  const [tasks, setTasks] = useState([]); // Array of { id, title, status, description, timestamp }
  const [pendingPlan, setPendingPlan] = useState(null); // Track pending AI plan for approval
  const [diagnostics, setDiagnostics] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);
  const [hasAiResponded, setHasAiResponded] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const aiAssistantRef = useRef(null);

  // Initialize analytics and check authentication on app start
  useEffect(() => {
    // Initialize Google Analytics
    AnalyticsService.init();
    AnalyticsService.trackPageView('App Start');

    const unsubscribe = FirebaseService.onAuthChange((user) => {
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        // Track user session
        AnalyticsService.trackSession(user.uid, user.displayName || user.email);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
      setCheckingAuth(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await FirebaseService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    // Setup menu event listeners
    const electronAPI = window.electronAPI;

    electronAPI.menu.onNewFile(() => handleNewFile());
    electronAPI.menu.onOpenFile((filePath) => handleOpenFile(filePath));
    electronAPI.menu.onOpenFolder((folderPath) => handleOpenFolder(folderPath));
    electronAPI.menu.onSave(() => handleSave());
    electronAPI.menu.onToggleTerminal(() => setPanelVisible(!panelVisible));
    electronAPI.menu.onToggleSidebar(() => setSidebarVisible(!sidebarVisible));
    electronAPI.menu.onNewTerminal(() => handleNewTerminal());

    // Setup IPC listeners for panels
    if (electronAPI.output?.onMessage) {
      electronAPI.output.onMessage((data) => {
        setOutputLogs(prev => [...prev, data]);
      });
    }

    if (electronAPI.debug?.onMessage) {
      electronAPI.debug.onMessage((data) => {
        setDebugLogs(prev => [...prev, data]);
      });
    }

    return () => {
      // Cleanup listeners if needed
    };
  }, [panelVisible, sidebarVisible]);

  const handleNewFile = () => {
    const newFile = {
      id: Date.now().toString(),
      name: 'Untitled-1',
      path: null,
      content: '',
      isDirty: false,
      language: 'plaintext',
    };
    setOpenFiles([...openFiles, newFile]);
    setActiveFile(newFile.id);
  };

  const handleOpenFile = async (filePath) => {
    const result = await window.electronAPI.fs.readFile(filePath);
    if (result.success) {
      const fileName = filePath.split('/').pop();
      const extension = fileName.split('.').pop();

      // Check if file is already open
      const existingFile = openFiles.find(f => f.id === filePath);

      if (existingFile) {
        // Just update content and set active if it already exists
        setOpenFiles(prev => prev.map(f =>
          f.id === filePath
            ? { ...f, content: result.content, isDirty: false }
            : f
        ));
        setActiveFile(filePath);
      } else {
        // Add new file
        const newFile = {
          id: filePath,
          name: fileName,
          path: filePath,
          content: result.content,
          isDirty: false,
          language: getLanguageFromExtension(extension),
        };
        setOpenFiles(prev => [...prev, newFile]);
        setActiveFile(newFile.id);
      }

      // Refresh Explorer to show new files
      setExplorerRefreshTrigger(prev => prev + 1);
    }
  };

  // Handler for AI-created files - refreshes explorer without opening
  const handleFileCreatedByAI = async (filePath) => {
    console.log('🔄 [App.jsx] File created by AI, refreshing explorer:', filePath);

    // Check if this file is currently open in any tab
    const isOpen = openFiles.some(f => f.id === filePath);
    if (isOpen) {
      console.log('📝 [App.jsx] Open file was touched by AI, updating content:', filePath);
      const result = await window.electronAPI.fs.readFile(filePath);
      if (result.success) {
        setOpenFiles(prev => prev.map(f =>
          f.id === filePath
            ? { ...f, content: result.content, isDirty: false }
            : f
        ));
      }
    }

    // Always refresh explorer when AI creates files
    setExplorerRefreshTrigger(prev => prev + 1);
  };

  // Handler for Preview button - triggers AI to run dev server
  const handlePreviewRequest = () => {
    if (aiAssistantRef.current) {
      aiAssistantRef.current.sendMessage('Run the development server for this project (npm run dev or npm start)');
    }
  };

  const handleOpenFolder = async (folderPath) => {
    setWorkspaceFolder(folderPath);
    await window.electronAPI.watch.start(folderPath);
  };

  const handleSave = async () => {
    const file = openFiles.find((f) => f.id === activeFile);
    if (file && file.path) {
      const result = await window.electronAPI.fs.writeFile(file.path, file.content);
      if (result.success) {
        setOpenFiles(
          openFiles.map((f) =>
            f.id === activeFile ? { ...f, isDirty: false } : f
          )
        );
      }
    } else if (file && !file.path) {
      const result = await window.electronAPI.dialog.saveFile(file.name);
      if (!result.canceled) {
        const saveResult = await window.electronAPI.fs.writeFile(
          result.filePath,
          file.content
        );
        if (saveResult.success) {
          const fileName = result.filePath.split('/').pop();
          setOpenFiles(
            openFiles.map((f) =>
              f.id === activeFile
                ? { ...f, path: result.filePath, name: fileName, isDirty: false }
                : f
            )
          );
        }
      }
    }
  };

  const handleFileContentChange = (fileId, content) => {
    setOpenFiles(
      openFiles.map((f) =>
        f.id === fileId ? { ...f, content, isDirty: true } : f
      )
    );

    // Analyze file for diagnostics when content changes
    const file = openFiles.find(f => f.id === fileId);
    if (file?.path && window.electronAPI?.diagnostics?.analyze) {
      window.electronAPI.diagnostics.analyze(file.path).then(result => {
        if (result.diagnostics) {
          // Update diagnostics, removing old ones for this file
          setDiagnostics(prev => [
            ...prev.filter(d => d.file !== file.path),
            ...result.diagnostics
          ]);
        }
      });
    }
  };

  const handleCloseFile = (fileId) => {
    const newOpenFiles = openFiles.filter((f) => f.id !== fileId);
    setOpenFiles(newOpenFiles);
    if (activeFile === fileId) {
      setActiveFile(newOpenFiles.length > 0 ? newOpenFiles[0].id : null);
    }
  };

  const handleNewTerminal = () => {
    const newTerminal = {
      id: Date.now().toString(),
      name: `Terminal ${terminals.length + 1}`,
    };
    setTerminals([...terminals, newTerminal]);
    setPanelVisible(true);
  };

  const handleCloseTerminal = (terminalId) => {
    // Remove from state
    const newTerminals = terminals.filter(t => t.id !== terminalId);
    setTerminals(newTerminals);

    // If no terminals left, hide panel
    if (newTerminals.length === 0) {
      setPanelVisible(false);
    }
  };

  // Task Management Handlers
  const handleAddTask = (title, status = 'pending', description = '') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newTask = {
      id,
      title,
      status,
      description,
      timestamp: Date.now()
    };
    setTasks(prev => [newTask, ...prev]);

    // Auto-open panel to tasks tab when a new task starts
    if (status === 'in-progress' || status === 'pending') {
      setPanelVisible(true);
    }

    return id;
  };

  const handleUpdateTask = (taskId, updates) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  };

  // Automatically create a terminal on app start
  useEffect(() => {
    const timer = setTimeout(() => {
      if (terminals.length === 0) {
        const initialTerminal = {
          id: Date.now().toString(),
          name: 'Terminal 1',
        };
        setTerminals([initialTerminal]);
        setPanelVisible(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []); // Run only once on mount

  const getLanguageFromExtension = (ext) => {
    const languageMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
      txt: 'plaintext',
    };
    return languageMap[ext] || 'plaintext';
  };

  // Show auth screen if not authenticated
  if (checkingAuth) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: '#d4d4d4' }}>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app">
      <div className="workspace">
        <ActivityBar
          activeView={activeView}
          onViewChange={setActiveView}
          onAIToggle={() => setAiVisible(!aiVisible)}
        />
        {sidebarVisible && (
          <Sidebar
            activeView={activeView}
            workspaceFolder={workspaceFolder}
            onOpenFile={handleOpenFile}
            onOpenFolder={handleOpenFolder}
            explorerRefreshTrigger={explorerRefreshTrigger}
            onExplorerRefresh={() => {
              if (aiAssistantRef.current) {
                aiAssistantRef.current.syncFiles();
              }
            }}
            theme={theme}
            onToggleTheme={toggleTheme}
            onLogout={handleLogout}
            hasAiResponded={hasAiResponded}
          />
        )}
        <div className="main-content">
          <EditorArea
            openFiles={openFiles}
            activeFile={activeFile}
            onFileSelect={setActiveFile}
            onFileClose={handleCloseFile}
            onContentChange={handleFileContentChange}
            onOpenFolder={handleOpenFolder}
            theme={theme}
            onPreviewClick={handlePreviewRequest}
            onCursorChange={setCursorPosition}
            pendingPlan={pendingPlan}
          />
          {panelVisible && (
            <Panel
              terminals={terminals}
              onNewTerminal={handleNewTerminal}
              onCloseTerminal={handleCloseTerminal}
              workspaceFolder={workspaceFolder}
              outputLogs={outputLogs}
              diagnostics={diagnostics}
              debugLogs={debugLogs}
              onClearOutput={() => setOutputLogs([])}
              onClearDiagnostics={() => setDiagnostics([])}
              onClearDebug={() => setDebugLogs([])}
              theme={theme}
            />
          )}
        </div>
        <AIAssistant
          ref={aiAssistantRef}
          onClose={() => setAiVisible(false)}
          visible={aiVisible}
          workspaceFolder={workspaceFolder}
          onOpenFolder={handleOpenFolder}
          onFileCreated={handleFileCreatedByAI}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          explorerRefreshTrigger={explorerRefreshTrigger}
          onFirstResponse={() => setHasAiResponded(true)}
        />
      </div>
      <StatusBar
        activeFile={openFiles.find((f) => f.id === activeFile)}
        workspaceFolder={workspaceFolder}
        cursorPosition={cursorPosition}
        onUpgradeClick={() => setShowPricing(true)}
      />
      {showPricing && (
        <PricingPlans
          onClose={() => setShowPricing(false)}
          userEmail={currentUser?.email}
        />
      )}
    </div>
  );
}


export default App;
