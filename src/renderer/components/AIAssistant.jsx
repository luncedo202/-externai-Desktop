import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FiX, FiSend, FiAlertCircle, FiDownload, FiFileText, FiFilePlus, FiEdit3, FiEye, FiCheck, FiLoader, FiMic, FiVolume2, FiVolumeX } from 'react-icons/fi';
import ClaudeService from '../services/ClaudeService';
import AnalyticsService from '../services/AnalyticsService';
import ProjectStateService from '../services/ProjectStateService';
import './AIAssistant.css';

// Debug flag - set to false to disable verbose logging in production
const DEBUG = false;
const debug = (...args) => DEBUG && console.log(...args);

// STRICT CODE SANITIZER - Removes ALL code-like content from text
// But preserves Summary section and markdown formatting
const sanitizeTextContent = (text) => {
  if (!text || typeof text !== 'string') return '';

  // Split by lines and filter aggressively
  const lines = text.split('\n');
  const cleanLines = [];

  // Track if we're in the Summary section (preserve everything there)
  let inSummarySection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines but preserve spacing
    if (!trimmed) {
      cleanLines.push('');
      continue;
    }

    // Detect Summary section start
    if (trimmed === '---' || trimmed.includes('**Summary**') || trimmed.includes('## Summary')) {
      inSummarySection = true;
      cleanLines.push(line);
      continue;
    }

    // Detect end of Summary section (Next Step is part of summary)
    if (inSummarySection && (trimmed.startsWith('Ready?') || trimmed.includes('give new instructions'))) {
      cleanLines.push(line);
      inSummarySection = false;
      continue;
    }

    // Always preserve Summary section content
    if (inSummarySection) {
      cleanLines.push(line);
      continue;
    }

    // Always preserve these patterns (markdown, lists, headers)
    if (
      trimmed.startsWith('#') ||           // Headers
      trimmed.startsWith('**') ||          // Bold text
      trimmed.startsWith('- ') ||          // Lists
      trimmed.startsWith('* ') ||          // Lists
      trimmed.startsWith('• ') ||          // Bullet points
      trimmed.match(/^\d+\.?\s/) ||         // Numbered lists
      trimmed.startsWith('>') ||           // Blockquotes
      trimmed.startsWith('Files:') ||      // Summary fields
      trimmed.startsWith('Commands:') ||   // Summary fields
      trimmed.startsWith('Result:') ||     // Summary fields
      trimmed.startsWith('Next Step') ||   // Summary fields
      trimmed === '---'                     // Horizontal rules
    ) {
      cleanLines.push(line);
      continue;
    }

    // AGGRESSIVE CODE DETECTION - Skip ANY line that looks like code
    const isCode =
      // JavaScript/TypeScript patterns
      /^(import|export|const|let|var|function|class|interface|type|enum|async|await|return|throw|try|catch|finally|if|else|for|while|switch|case|default|break|continue|new|this|super|static|public|private|protected|readonly|get|set|yield)\s/.test(trimmed) ||
      /^(import|export)\s*\{/.test(trimmed) ||
      /^(import|export)\s+\*/.test(trimmed) ||
      /^from\s+['"]/.test(trimmed) ||
      // JSX/HTML tags
      /^<[a-zA-Z][a-zA-Z0-9]*[\s>\/]/.test(trimmed) ||
      /^<\/[a-zA-Z]/.test(trimmed) ||
      // Brackets and braces alone
      /^[\{\}\[\]\(\)]+;?\s*$/.test(trimmed) ||
      /^[\}\]\)]+[,;]?\s*$/.test(trimmed) ||
      // Object/array syntax (but not summary fields)
      /^\w+:\s*[\{\[\('"<]/.test(trimmed) ||
      // Function calls and definitions
      /^\w+\s*\([^)]*\)\s*[{;=]/.test(trimmed) ||
      /^=>\s*[\{\(]/.test(trimmed) ||
      /^\([^)]*\)\s*=>/.test(trimmed) ||
      // CSS patterns
      /^\.[a-zA-Z_-]+[\s\{:]/.test(trimmed) ||
      /^#[a-zA-Z_-]+[\s\{]/.test(trimmed) ||
      /^@(import|media|keyframes|font-face|tailwind|apply|layer|screen)/.test(trimmed) ||
      /^\w+\s*:\s*[^;]+;/.test(trimmed) && !trimmed.startsWith('http') ||
      // Assignment patterns
      /^(const|let|var)\s+\w+\s*=/.test(trimmed) ||
      // React hooks and patterns
      /^use[A-Z]\w*\s*\(/.test(trimmed) ||
      /^setState|^dispatch|^navigate/.test(trimmed) ||
      // Comments
      /^\/\//.test(trimmed) ||
      /^\/\*/.test(trimmed) ||
      /^\*\/?\s*$/.test(trimmed) ||
      // Module patterns
      /^module\.exports/.test(trimmed) ||
      /^require\s*\(/.test(trimmed) ||
      // DOCTYPE and HTML boilerplate
      /^<!DOCTYPE/i.test(trimmed) ||
      /^<html|^<head|^<body|^<meta|^<link|^<script|^<style/i.test(trimmed) ||
      // Config patterns
      /^"?\w+"?\s*:\s*\[/.test(trimmed) ||
      /^\w+\s*:\s*\{/.test(trimmed) ||
      // Ends with code-like characters (but not short lines or lists)
      /[{}\[\]();]$/.test(trimmed) && trimmed.length > 50 ||
      // Contains too many special code characters
      (trimmed.match(/[{}\[\]();=<>]/g) || []).length > 4 ||
      // className or style attributes
      /className\s*=/.test(trimmed) ||
      /style\s*=\s*\{/.test(trimmed) ||
      // Looks like a file path or import path
      /^['"]\.?\.?\//.test(trimmed) ||
      // Package.json patterns
      /^"(name|version|scripts|dependencies|devDependencies)"/.test(trimmed);

    if (isCode) {
      continue; // Skip this line entirely
    }

    // Allow the line if it passes all checks
    cleanLines.push(line);
  }

  // Join and clean up excessive whitespace
  return cleanLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

// Constants for timing
const TYPING_DELAY_MIN = 10; // ms - faster response speed
const TYPING_DELAY_MAX = 30; // ms - faster response speed
const COMMAND_EXECUTION_DELAY = 1000; // ms between commands
const WORKSPACE_SCAN_DELAY = 500; // ms before scanning workspace
const STREAM_BUFFER_CHECK_DELAY = 50; // ms when waiting for content
const DISPLAY_COMPLETION_CHECK_DELAY = 100; // ms when waiting for display to finish

const AIAssistant = forwardRef(({
  onClose,
  workspaceFolder,
  onOpenFolder,
  onFileCreated,
  onDevServerDetected,
  onUpdateTerminalStatus,
  onFileUpdate,
  onAddTask,
  onUpdateTask,
  explorerRefreshTrigger,
  onFirstResponse,
  visible,
  devServerUrl,
  terminalOutput
}, ref) => {
  // Load messages from localStorage if available, but reset if workspaceFolder changes
  const defaultWelcome = {
    role: 'assistant',
    content: 'Hello! I\'m your AI coding assistant.\n\nI can help you build software:\n\n• Create complete, working code for websites, mobile apps, and games\n• Debug and fix errors with clear explanations\n• Explain code in simple, beginner-friendly terms\n• Build full project structures ready to deploy\n• Understand your entire project - I can see all your files\n• Run terminal commands automatically\n\nJust tell me what you want to build:\n- "Create a landing page for my startup"\n- "Build a contact form with email validation"\n- "Make a simple game"\n- "Add a login page to my website"\n\nI\'ll immediately create the files and run any necessary commands. No manual steps required.\n\nWhat would you like to build?',
  };

  const [messages, setMessages] = useState(() => {
    // Try to load project-specific history
    if (workspaceFolder) {
      try {
        const projectKey = `ai-chat-${workspaceFolder}`;
        const saved = localStorage.getItem(projectKey);
        if (saved) return JSON.parse(saved);
      } catch { }
    }
    return [defaultWelcome];
  });

  // Save and restore chat history per project when workspaceFolder changes
  useEffect(() => {
    if (!workspaceFolder) return;

    const projectKey = `ai-chat-${workspaceFolder}`;
    const stored = localStorage.getItem(projectKey);

    if (stored) {
      // Restore history for this project
      try {
        const savedMessages = JSON.parse(stored);
        setMessages(savedMessages);

        // Restore conversation history (only user/assistant messages for API)
        conversationHistory.current = savedMessages
          .filter(msg => msg.role === 'user' || msg.role === 'assistant')
          .map(msg => ({ role: msg.role, content: msg.content }));
      } catch (err) {
        console.error('Failed to restore chat history:', err);
        setMessages([defaultWelcome]);
        conversationHistory.current = [];
      }
    } else {
      // New project - start fresh
      setMessages([defaultWelcome]);
      conversationHistory.current = [];
    }
  }, [workspaceFolder]);

  // Persist messages to localStorage per project on every update
  useEffect(() => {
    if (!workspaceFolder) return;

    try {
      const projectKey = `ai-chat-${workspaceFolder}`;
      localStorage.setItem(projectKey, JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to save chat history:', err);
    }
  }, [messages, workspaceFolder]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTerminalBusy, setIsTerminalBusy] = useState(false);
  const [error, setError] = useState(null);

  // Voice capabilities state
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(localStorage.getItem('ai-voice-uri') || '');
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const [subscription, setSubscription] = useState(null); // Track user subscription
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const conversationHistory = useRef([]);
  const autoScrollEnabled = useRef(true);
  const [codeBlockStates, setCodeBlockStates] = useState({}); // Track code block creation status
  const [expandedBlocks, setExpandedBlocks] = useState({}); // Track which blocks are expanded
  const [attachedImages, setAttachedImages] = useState([]); // Track dropped images
  const [isDraggingOver, setIsDraggingOver] = useState(false); // Visual feedback for drag
  const [justDropped, setJustDropped] = useState(false); // Show success feedback after drop
  const abortControllerRef = useRef(null); // Track abort controller for cancelling requests
  const isSubmittingRef = useRef(false); // Guard against double submissions
  const lastSubmittedMessageRef = useRef(null); // Track last submitted message to prevent StrictMode duplicates
  const [retryContext, setRetryContext] = useState(null); // Store context for retry functionality
  const workspaceFolderRef = useRef(workspaceFolder);
  const terminalOutputRef = useRef(''); // Track terminal output for PTY-based error detection
  
  // Command confirmation state
  const [pendingCommands, setPendingCommands] = useState(null); // Commands awaiting user confirmation
  const [isAutoFix, setIsAutoFix] = useState(false); // Whether pending commands are from auto-fix
  const commandResolverRef = useRef(null); // Promise resolver for command confirmation

  // Keep ref in sync with state
  useEffect(() => {
    workspaceFolderRef.current = workspaceFolder;
  }, [workspaceFolder]);

  // Keep terminal output ref in sync with prop
  useEffect(() => {
    terminalOutputRef.current = terminalOutput || '';
  }, [terminalOutput]);

  // Effect to notify when dev server is detected from logs
  useEffect(() => {
    if (devServerUrl) {
      // Check if we already have a recent system message about this URL
      const hasRecentMessage = messages.slice(-5).some(msg =>
        msg.role === 'system' && msg.content.includes(devServerUrl)
      );

      if (!hasRecentMessage) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            role: 'system',
            content: `🌐 **Application detected!**\n\nPreview is now active in the editor. Also opened in browser: [${devServerUrl}](${devServerUrl})`,
          }
        ]);
      }
    }
  }, [devServerUrl]);

  // Layer 3: Conversation pruning state
  const conversationSummary = useRef(''); // Store summary of old messages
  const CONVERSATION_THRESHOLD = 30; // Start pruning after 30 messages
  const KEEP_RECENT_MESSAGES = 25; // Keep last 25 messages
  const KEEP_INITIAL_MESSAGES = 3; // Keep first 3 messages (project setup)

  // Retry function for failed auto-fix attempts
  const handleRetryAutoFix = async (context) => {
    if (!context) return;

    console.log('🔄 Retrying auto-fix...');

    // Remove the error message
    setMessages(prev => prev.filter(msg => !msg.isRetryError));

    // Show retrying status
    const retryStatusId = `retry-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: retryStatusId,
        role: 'system',
        content: '🔄 **Retrying auto-fix...**\n\nChecking backend connection and attempting fix again...',
        isWorking: true
      }
    ]);

    setIsLoading(true);

    try {
      // Check backend health first
      const isDev = import.meta.env.DEV;
      const backendUrl = import.meta.env.VITE_BACKEND_URL || (isDev ? 'http://localhost:5000' : 'https://externai-backend-production.azurewebsites.net');
      const healthCheck = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });

      if (!healthCheck.ok) {
        throw new Error('Backend server is not responding');
      }

      // Remove retry status
      setMessages(prev => prev.filter(msg => msg.id !== retryStatusId));

      // Retry the fix request
      const fixResponse = await ClaudeService.getClaudeCompletion(
        context.conversation,
        context.maxTokens || 20000,
        context.timeout || 90000
      );

      if (fixResponse && fixResponse.success && fixResponse.message) {
        // Add the fix message
        const fixMessage = {
          id: Date.now() + Math.random(),
          role: 'assistant',
          content: fixResponse.message
        };

        setMessages(prev => [...prev, fixMessage]);
        conversationHistory.current.push(fixMessage);

        // Process the fix
        setTimeout(async () => {
          try {
            const fixCommands = extractCommands(fixResponse.message);
            const fixCodeBlocks = extractCodeBlocks(fixResponse.message);

            if (fixCodeBlocks.length > 0) {
              await handleCreateFilesAutomatically(fixResponse.message, fixMessage.id);
            }

            if (fixCommands.length > 0) {
              await executeCommandsAutomatically(fixResponse.message, true);
            }
          } catch (err) {
            console.error('Error processing retry fix:', err);
          }
        }, 500);

        // Clear retry context
        setRetryContext(null);
      } else {
        throw new Error(fixResponse?.error || 'Invalid response from AI');
      }
    } catch (error) {
      console.error('❌ Retry failed:', error);

      // Remove retry status
      setMessages(prev => prev.filter(msg => msg.id !== retryStatusId));

      // Show updated error
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          content: createRetryErrorMessage(error.message, context.command),
          isRetryError: true,
          retryContext: context
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Create enhanced error message
  const createRetryErrorMessage = (errorMsg, command) => {
    const isConnectionError = errorMsg.includes('connect') || errorMsg.includes('fetch') || errorMsg.includes('ECONNREFUSED');
    const isTimeout = errorMsg.includes('timeout') || errorMsg.includes('timed out');
    const isRateLimit = errorMsg.includes('rate limit') || errorMsg.includes('429');

    let specificGuidance = '';

    if (isConnectionError) {
      specificGuidance = `### 🔧 Backend Connection Issue

The backend server is not reachable. To enable auto-fix:

\`\`\`bash
cd backend
npm install  # If first time
npm start    # Start backend server
\`\`\`

Wait for "Server running on port 5000" message, then click **Retry** below.`;
    } else if (isTimeout) {
      specificGuidance = `### ⏱️ Request Timeout

The AI service took too long to respond. This can happen with complex fixes.

**Try:**
1. Click **Retry** button below
2. Or simplify your question/command
3. Or fix the error manually`;
    } else if (isRateLimit) {
      specificGuidance = `### 🚫 Rate Limit Exceeded

Too many requests to the AI service. Wait 1-2 minutes and try again.

**Options:**
1. Wait and click **Retry** button
2. Fix the error manually
3. Continue with your project and auto-fix will work after cooldown`;
    } else {
      specificGuidance = `### 💡 Suggestions

**Manual Fix Options:**
1. Read the error message above carefully
2. Fix the issue in your code directly
3. Or ask me: "How do I fix: ${command?.substring(0, 40) || 'this error'}?"

**Backend Issues:**
- Ensure backend is running: \`cd backend && npm start\`
- Check for firewall blocking port 5000
- Verify ANTHROPIC_API_KEY in backend/.env`;
    }

    return `## 🔴 Auto-Fix Failed

**Error:** ${errorMsg}

${specificGuidance}

---

### 🤔 What Is Auto-Fix?

When a command fails, auto-fix automatically:
1. Analyzes the error output
2. Reads relevant project files  
3. Generates and applies a complete fix

It requires the backend server to communicate with Claude AI.`;
  };

  // Check voice support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;

    if (!SpeechRecognition || !speechSynthesis) {
      setVoiceSupported(false);
      console.warn('Web Speech API not supported in this browser');
    } else {
      setVoiceSupported(true);

      // Load voices
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        setAvailableVoices(voices);

        // If no voice is selected yet, or we want to ensure Alex is the default
        if (voices.length > 0) {
          const alexVoice = voices.find(v => v.name.includes('Alex'));
          const currentVoice = selectedVoiceURI ? voices.find(v => v.voiceURI === selectedVoiceURI) : null;

          // If Alex exists and we don't have a valid selection or we're resetting to user preference
          if (alexVoice && (!currentVoice || !selectedVoiceURI)) {
            setSelectedVoiceURI(alexVoice.voiceURI);
            localStorage.setItem('ai-voice-uri', alexVoice.voiceURI);
          } else if (!selectedVoiceURI) {
            // Fallback strategy if Alex isn't found
            const naturalVoice = voices.find(v => v.name.includes('Daniel')) ||
              voices.find(v => v.name.includes('Ava') && v.name.includes('Premium')) ||
              voices.find(v => v.name.includes('Samantha')) ||
              voices.find(v => v.name.includes('Google')) ||
              voices.find(v => v.name.includes('Natural')) ||
              voices.find(v => v.lang.startsWith('en-US')) ||
              voices[0];

            if (naturalVoice) {
              setSelectedVoiceURI(naturalVoice.voiceURI);
              localStorage.setItem('ai-voice-uri', naturalVoice.voiceURI);
            }
          }
        }
      };

      loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, [selectedVoiceURI]);

  // Fetch subscription status on mount
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await ClaudeService.getUsage();
        if (response.subscription) {
          setSubscription(response.subscription);
        }
      } catch (err) {
        console.error('Failed to fetch subscription:', err);
      }
    };

    fetchSubscription();
  }, []);

  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Smooth auto-scroll during streaming - optimized version
  const smoothScrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const scrollDiff = container.scrollHeight - container.scrollTop - container.clientHeight;

      // Always scroll during streaming, but smoothly
      if (scrollDiff > 0) {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Core send message logic (can be called internally or externally)
  const sendMessage = async (messageText, attachedImgs = []) => {
    if (!messageText || messageText.replace(/\s/g, '') === '') {
      console.log('🛑 sendMessage blocked: messageText is empty or whitespace only');
      return;
    }
    if (isLoading) {
      console.log('🛑 sendMessage blocked: isLoading is true');
      return;
    }

    // Check if workspace is open before processing - use ref for most current value
    if (!workspaceFolderRef.current) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: '⚠️ No workspace folder is open. Opening folder picker...'
      }]);

      try {
        // Use dialog.openFolder (not fs.openFolder) - returns { canceled, filePaths }
        const result = await window.electronAPI.dialog.openFolder();
        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
          setMessages(prev => [...prev, {
            role: 'system',
            content: '❌ You must open a workspace folder to continue. Please click **File > Open Folder** from the menu.'
          }]);
          return;
        }
        // Update the workspace folder in parent component
        if (onOpenFolder) {
          await onOpenFolder(result.filePaths[0]);
        }
        // Wait a moment for the workspace to be fully initialized
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.error('Failed to open folder:', err);
        setMessages(prev => [...prev, {
          role: 'system',
          content: '❌ Failed to open folder. Please click **File > Open Folder** from the menu to select a workspace.'
        }]);
        return;
      }
    }

    const userMessage = messageText.trim();

    // Append image URLs to the message if any images are attached
    let messageContent = userMessage;
    if (attachedImgs.length > 0) {
      const imageUrls = attachedImgs.map(img =>
        `\n\n📷 Image: ${img.urls.regular} (by ${img.user.name} on Unsplash)`
      ).join('');
      messageContent = userMessage + imageUrls;
    }

    setError(null);

    // Generate message ID
    const userMessageId = Date.now();

    // Prevent duplicate from React StrictMode double-invocation only
    // Very short window (50ms) - only blocks true double-invokes, not retries
    if (
      lastSubmittedMessageRef.current &&
      lastSubmittedMessageRef.current.content === messageContent &&
      Date.now() - lastSubmittedMessageRef.current.timestamp < 50
    ) {
      console.log('🛑 Duplicate message blocked (StrictMode double-invoke)');
      return;
    }

    // Track this submission
    lastSubmittedMessageRef.current = { content: messageContent, timestamp: Date.now() };

    const userMessageObj = { id: userMessageId, role: 'user', content: messageContent };

    // Add message to state
    setMessages(prev => [...prev, userMessageObj]);

    // Add to conversation history for context
    conversationHistory.current.push({ role: 'user', content: messageContent });

    setIsLoading(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    // Add a placeholder message for streaming
    const streamingMessageId = userMessageId + 1;
    setMessages(prev => [...prev, {
      id: streamingMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true
    }]);

    try {
      // Get COMPLETE workspace context - include ALL relevant file contents
      let workspaceContext = '';
      if (workspaceFolderRef.current && window.electronAPI.workspace) {
        try {
          const fileList = await window.electronAPI.workspace.listFiles(workspaceFolderRef.current);
          if (fileList.success && fileList.files.length > 0) {
            workspaceContext = `\n\n[WORKSPACE CONTEXT - Current project files:\n${fileList.files.map(f => `- ${f.relativePath}`).join('\n')}\n`;

            // Read ALL relevant project files for comprehensive context
            const relevantExtensions = ['.json', '.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.mjs', '.cjs'];
            const excludeFolders = ['node_modules', '.git', 'dist', 'build', '.next'];

            const filesToRead = fileList.files
              .filter(f => {
                const ext = f.relativePath.substring(f.relativePath.lastIndexOf('.'));
                const isRelevant = relevantExtensions.includes(ext);
                const isExcluded = excludeFolders.some(folder => f.relativePath.includes(`${folder}/`));
                return isRelevant && !isExcluded;
              })
              .slice(0, 20); // Read up to 20 files for context

            // Show analyzing status
            const analyzingMsgId = `analyzing-${Date.now()}`;
            setMessages(prev => prev.map(msg => 
              msg.id === streamingMessageId 
                ? { ...msg, content: `🔍 **Analyzing your project...**\n\nReading ${filesToRead.length} files to understand the codebase...` }
                : msg
            ));

            for (const file of filesToRead) {
              const filePath = `${workspaceFolderRef.current}/${file.relativePath}`;
              try {
                // Update status to show current file being read
                setMessages(prev => prev.map(msg => 
                  msg.id === streamingMessageId 
                    ? { ...msg, content: `🔍 **Analyzing your project...**\n\n📄 Reading: \`${file.relativePath}\`` }
                    : msg
                ));
                
                const fileResult = await window.electronAPI.fs.readFile(filePath);
                if (fileResult.success && fileResult.content) {
                  // Limit each file to 2000 chars to prevent overflow
                  const content = fileResult.content.length > 2000
                    ? fileResult.content.substring(0, 2000) + '\n... (truncated)'
                    : fileResult.content;
                  workspaceContext += `\n\n--- ${file.relativePath} ---\n${content}\n`;
                }
                
                // Small delay so user can see files being read
                await new Promise(resolve => setTimeout(resolve, 50));
              } catch (err) {
                // File doesn't exist or can't be read, skip it
              }
            }
            
            // Update status to show analysis complete
            setMessages(prev => prev.map(msg => 
              msg.id === streamingMessageId 
                ? { ...msg, content: `🔍 **Analysis complete!**\n\n✅ Read ${filesToRead.length} files\n\n💭 Thinking about your request...` }
                : msg
            ));

            workspaceContext += `\n\nUse this COMPLETE context to understand the project structure, dependencies, and existing code.]\n`;
          }
        } catch (err) {
          debug('Workspace context unavailable:', err);
        }
      }

      // Get terminal output context if available - last 6 commands
      let terminalContext = '';
      try {
        // Find the active terminal ID from the DOM
        const terminalElements = document.querySelectorAll('[data-terminal-id]');
        if (terminalElements.length > 0) {
          const terminalId = terminalElements[0].getAttribute('data-terminal-id');
          if (terminalId) {
            const outputResult = await window.electronAPI.terminal.getOutput(terminalId);
            if (outputResult.success && outputResult.output) {
              // Clean ANSI codes for cleaner context
              const cleanOutput = outputResult.output.replace(/\x1b\[[0-9;]*m/g, '');

              // Extract the last 6 command blocks (commands typically start with $ or > or after a newline with a path)
              const lines = cleanOutput.split('\n');
              const commandPattern = /^[\$\>]|.*[\$\>]\s*\w|^\s*\w+@|.*%\s*\w/;
              let commandBlocks = [];
              let currentBlock = [];

              for (const line of lines) {
                if (commandPattern.test(line) && currentBlock.length > 0) {
                  commandBlocks.push(currentBlock.join('\n'));
                  currentBlock = [line];
                } else {
                  currentBlock.push(line);
                }
              }
              if (currentBlock.length > 0) {
                commandBlocks.push(currentBlock.join('\n'));
              }

              // Get the last 6 command blocks
              const last6Commands = commandBlocks.slice(-6).join('\n\n---\n\n');

              terminalContext = `\n\n[TERMINAL OUTPUT - Last 6 commands and their results:\n${last6Commands || cleanOutput.slice(-3000)}\n\nUse this to understand what commands have been run and their results.]\n`;
            }
          }
        }
      } catch (err) {
        debug('Terminal context unavailable:', err);
        // Continue without terminal context
      }

      // Enhance user message with workspace and terminal context
      const enhancedPrompt = conversationHistory.current.map(msg => ({
        role: msg.role,
        content: msg.role === 'user' && msg === conversationHistory.current[conversationHistory.current.length - 1]
          ? `${msg.content}${workspaceContext}${terminalContext}`
          : msg.content
      }));

      // ============================================================
      // LAYER 2: Extract and update project state (first 3 messages)
      // ============================================================
      if (conversationHistory.current.length <= KEEP_INITIAL_MESSAGES &&
        !ProjectStateService.isInitialized()) {
        console.log('🔍 [Layer 2] Extracting project state from initial messages...');
        ProjectStateService.extractFromMessages(conversationHistory.current);
      }

      // ============================================================
      // LAYER 3: Conversation pruning with summarization
      // ============================================================
      let prunedMessages = enhancedPrompt;

      if (conversationHistory.current.length > CONVERSATION_THRESHOLD) {
        console.log(`📊 [Layer 3] Conversation has ${conversationHistory.current.length} messages, pruning...`);

        // Check if we need to generate a new summary
        const messagesToSummarize = conversationHistory.current.slice(
          KEEP_INITIAL_MESSAGES,
          -(KEEP_RECENT_MESSAGES)
        );

        if (messagesToSummarize.length > 0 && !conversationSummary.current) {
          try {
            console.log(`📝 [Layer 3] Summarizing ${messagesToSummarize.length} old messages...`);
            const summary = await ClaudeService.summarizeConversation(messagesToSummarize);
            conversationSummary.current = summary;
            console.log('✅ [Layer 3] Summary generated:', summary.substring(0, 100) + '...');
          } catch (err) {
            console.warn('⚠️ [Layer 3] Summarization failed, continuing without summary:', err);
          }
        }

        // Build pruned message array: [initial messages] + [recent messages]
        const initialMessages = enhancedPrompt.slice(0, KEEP_INITIAL_MESSAGES);
        const recentMessages = enhancedPrompt.slice(-KEEP_RECENT_MESSAGES);
        prunedMessages = [...initialMessages, ...recentMessages];

        console.log(`✂️ [Layer 3] Pruned from ${enhancedPrompt.length} to ${prunedMessages.length} messages`);
      }

      console.log('🚀 Starting Claude stream...');

      // Track AI request start
      const requestStartTime = Date.now();
      AnalyticsService.trackAIRequest('message_sent', {
        message_length: prunedMessages[prunedMessages.length - 1].content.length
      });

      // Get project state to inject (Layer 2)
      const projectStatePrompt = ProjectStateService.toSystemPrompt();

      // Call Claude API with streaming (with all 3 layers)
      const response = await ClaudeService.getClaudeStream(
        prunedMessages, // Layer 3: Pruned messages
        (chunk, fullText) => {
          // Update the streaming message with new content
          setMessages(prev => prev.map(msg =>
            msg.id === streamingMessageId
              ? { ...msg, content: fullText, isStreaming: true }
              : msg
          ));
        },
        20000,
        abortControllerRef.current.signal,
        null, // systemPrompt (backend has default)
        projectStatePrompt, // Layer 2: Project state
        conversationSummary.current // Layer 3: Conversation summary
      );

      console.log('🤖 Claude stream completed:', response);

      if (response && response.success) {
        console.log('✅ Stream successful, finalizing message...');
        console.log('📝 Response content length:', response.message?.length);

        // Finalize the streaming message
        setMessages(prev => prev.map(msg =>
          msg.id === streamingMessageId
            ? { ...msg, content: response.message, isStreaming: false }
            : msg
        ));

        const assistantMessage = {
          id: streamingMessageId,
          role: 'assistant',
          content: response.message
        };

        conversationHistory.current.push(assistantMessage);

        if (workspaceFolderRef.current) {
          setTimeout(async () => {
            try {
              console.log('🤖 AI response received - processing automatically...');
              const codeBlocks = extractCodeBlocks(response.message);
              const commands = extractCommands(response.message);

              console.log(`📄 Found ${codeBlocks.length} code blocks to create`);
              console.log(`⚡ Found ${commands.length} commands to execute`);

              // STEP 1: Create files FIRST (so commands can use them)
              if (codeBlocks.length > 0) {
                console.log('📁 Creating files first...');
                await handleCreateFilesAutomatically(response.message, assistantMessage.id);
                console.log('✅ Files created successfully');

                // Wait a bit for filesystem to sync
                await new Promise(resolve => setTimeout(resolve, 500));
              }

              // STEP 2: Execute commands AFTER files are created
              if (commands.length > 0) {
                console.log('⚡ Executing commands now...');
                await executeCommandsAutomatically(response.message);
                console.log('✅ Commands executed successfully');
              }

              if (codeBlocks.length === 0 && commands.length === 0) {
                console.log('ℹ️ No files or commands to process - AI provided explanation only');
              }
            } catch (error) {
              console.error('❌ Error processing response:', error);
              console.error('❌ Error stack:', error.stack);
            }
          }, WORKSPACE_SCAN_DELAY);
        }

        // Update subscription status after successful message
        try {
          const usage = await ClaudeService.getUsage();
          if (usage.subscription) {
            setSubscription(usage.subscription);

            // Track prompt usage in analytics
            AnalyticsService.trackSubscription(
              'prompt_used',
              usage.subscription.tier,
              usage.subscription.freePromptsRemaining
            );

            // Warn when approaching limit (5 prompts left)
            if (usage.subscription.tier === 'free' && usage.subscription.freePromptsRemaining <= 5) {
              AnalyticsService.trackSubscription(
                'approaching_limit',
                usage.subscription.tier,
                usage.subscription.freePromptsRemaining
              );
            }
          }
        } catch (err) {
          console.error('Failed to update subscription:', err);
        }
      } else {
        throw new Error(response && response.error ? response.error : 'ClaudeService failed');
      }
    } catch (error) {
      console.error('AI Error:', error);

      // Check if it's a payment required error
      if (error.message.includes('Free prompts exhausted') || error.message.includes('402')) {
        setError('subscription_required');
        // Combine filter and add in single setState call to avoid race conditions
        setMessages(prev => [
          ...prev.filter(msg => msg.id !== streamingMessageId),
          {
            role: 'system',
            content: `🔒 **Free Prompts Exhausted**\n\nYou've used all 25 free AI prompts. To continue using AI features, please subscribe to a paid plan.\n\n**Benefits of subscribing:**\n• Unlimited AI prompts\n• Priority support\n• Advanced features\n• Faster response times\n\n[Subscribe Now](#) to continue building amazing projects!`
          }
        ]);

        // Track limit reached
        AnalyticsService.trackSubscription('limit_reached', 'free', 0);
      } else {
        setError(error.message);
        // Combine filter and add in single setState call to avoid race conditions
        setMessages(prev => [
          ...prev.filter(msg => msg.id !== streamingMessageId),
          {
            role: 'assistant',
            content: `❌ **Error:** ${error.message}\n\nPlease check:\n1. Your API key is correctly configured\n2. You have API credits available\n3. Your internet connection is working\n\nTry asking your question again!`
          }
        ]);
      }

      // Track error in analytics
      AnalyticsService.trackError('AI', error.message, 'sendMessage');
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Expose sendMessage method to parent via ref
  useImperativeHandle(ref, () => ({
    sendMessage: (messageText) => {
      sendMessage(messageText, []);
    }
  }));

  // Handle stopping AI generation and command execution
  const handleStopGeneration = () => {
    console.log('🛑 Stopping AI generation and commands...');

    // Stop AI streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);

      // Mark the streaming message as stopped
      setMessages(prev => prev.map(msg =>
        msg.isStreaming
          ? { ...msg, content: msg.content + '\n\n_[Generation stopped by user]_', isStreaming: false }
          : msg
      ));
    }

    // Stop executing commands
    setMessages(prev => prev.map(msg =>
      msg.isExecuting
        ? { ...msg, content: msg.content + '\n\n_[Command execution stopped by user]_', isExecuting: false }
        : msg
    ));

    // Stop working status (file creation)
    setMessages(prev => prev.map(msg =>
      msg.isWorking
        ? { ...msg, content: msg.content + '\n\n_[Operation stopped by user]_', isWorking: false }
        : msg
    ));
  };

  // Voice Input: Start recording
  const startVoiceInput = () => {
    if (!voiceSupported) {
      alert('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      console.log('Voice recording started');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Update input with final transcript
      if (finalTranscript) {
        setInput(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);

      if (event.error === 'no-speech') {
        console.log('No speech detected');
      } else if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        alert(`Voice input error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      console.log('Voice recording ended');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Voice Input: Stop recording
  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  // Voice Output: Speak message
  const speakMessage = (text, messageId) => {
    if (!voiceSupported) {
      alert('Voice output is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    // If already speaking this message, stop it
    if (currentlySpeakingId === messageId) {
      stopSpeaking();
      return;
    }

    // Stop any current speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    // Remove code blocks and special formatting for better speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/^[-*+]\s/gm, '') // Remove list markers
      .trim();

    if (!cleanText) {
      alert('No text to speak');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Set selected voice if available
    if (selectedVoiceURI) {
      const voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentlySpeakingId(messageId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Voice Output: Stop speaking
  const stopSpeaking = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCurrentlySpeakingId(null);
  };

  // Cleanup voice on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handle form submission

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Guard against double submissions
    if (isSubmittingRef.current) {
      console.log('🛑 Blocked: Submission already in progress (isSubmittingRef)');
      return;
    }
    if (!input || input.replace(/\s/g, '') === '') {
      console.log('🛑 Blocked: Input is empty or whitespace only');
      return;
    }
    if (isLoading) {
      console.log('🛑 Blocked: AI is still loading (isLoading)');
      return;
    }
    const messageText = input.trim();

    isSubmittingRef.current = true;
    const imgs = [...attachedImages];
    // Clear input and images immediately
    setInput('');
    setAttachedImages([]);
    try {
      // Send the message
      await sendMessage(messageText, imgs);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // Handle drag and drop for images
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the form container itself
    if (e.target.className === 'ai-input-container' || e.target.className === 'ai-input-form') {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    try {
      // Get the image data from drag event
      const imageData = e.dataTransfer.getData('application/json');
      if (imageData) {
        const image = JSON.parse(imageData);
        // Add to attached images (prevent duplicates)
        setAttachedImages(prev => {
          const exists = prev.some(img => img.urls.regular === image.urls.regular);
          if (exists) return prev;

          // Show success feedback
          setJustDropped(true);
          setTimeout(() => setJustDropped(false), 1000);

          return [...prev, image];
        });
      }
    } catch (err) {
      console.error('Error handling dropped image:', err);
    }
  };

  const removeAttachedImage = (imageUrl) => {
    setAttachedImages(prev => prev.filter(img => img.urls.regular !== imageUrl));
  };

  const generateMockResponse = (query) => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('website') || lowerQuery.includes('web')) {
      return `I can help you create a website! Here's a basic HTML structure to get started:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
        }
    </style>
</head>
<body>
    <h1>Welcome to My Website</h1>
    <p>This is a simple website template.</p>
</body>
</html>
\`\`\`

Would you like me to add more features like navigation, forms, or styling?`;
    }

    if (lowerQuery.includes('mobile') || lowerQuery.includes('app')) {
      return `For mobile app development, I recommend using React Native. Here's a basic setup:

\`\`\`javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Mobile App</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
\`\`\`

Would you like help setting up the development environment?`;
    }

    if (lowerQuery.includes('game')) {
      return `Let's create a simple game! Here's a basic HTML5 Canvas game template:

\`\`\`javascript
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

class Game {
  constructor() {
    this.player = { x: 50, y: 50, width: 30, height: 30 };
    this.update();
  }
  
  update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'blue';
    ctx.fillRect(this.player.x, this.player.y, 
                 this.player.width, this.player.height);
    requestAnimationFrame(() => this.update());
  }
}

new Game();
\`\`\`

What type of game would you like to build?`;
    }

    return `I understand you're asking about "${query}". I'm here to help with:

• Web development (HTML, CSS, JavaScript, React)
• Mobile development (React Native)
• Game development (HTML5 Canvas, Phaser)
• Code explanations and debugging
• Project scaffolding

Could you provide more details about what you'd like to build?`;
  };

  // Extract code blocks from AI response
  const extractCodeBlocks = (content) => {
    const blocks = [];

    // Use a more reliable approach: split by ``` markers
    const parts = content.split('```');

    console.log('🔍 Extracting code blocks, found', Math.floor(parts.length / 2), 'potential blocks');

    // Parts at odd indices (1, 3, 5...) are inside code blocks
    for (let i = 1; i < parts.length; i += 2) {
      const codeBlockContent = parts[i];
      if (!codeBlockContent) continue;

      // First line contains language and optional filename
      const firstNewline = codeBlockContent.indexOf('\n');
      if (firstNewline === -1) continue; // No newline = invalid block

      const firstLine = codeBlockContent.substring(0, firstNewline).trim();
      const code = codeBlockContent.substring(firstNewline + 1);

      // Parse first line: "language filename=path/to/file.ext" or just "language"
      let language = 'text';
      let filename = null;

      // Check for filename= in first line
      const filenameMatch = firstLine.match(/filename=([^\s]+)/);
      if (filenameMatch) {
        filename = filenameMatch[1];
        // Language is everything before filename=
        const langPart = firstLine.substring(0, firstLine.indexOf('filename=')).trim();
        language = langPart || 'text';
      } else {
        // No filename, first word is language
        language = firstLine.split(/\s+/)[0] || 'text';
      }

      // Also try to extract filename from first line of code if not in header
      if (!filename && code) {
        const codeFirstLine = code.split('\n')[0];
        const commentFilename = codeFirstLine.match(/^\/\/\s*filename[=:]\s*([^\s]+)/i) ||
          codeFirstLine.match(/^#\s*filename[=:]\s*([^\s]+)/i) ||
          codeFirstLine.match(/^<!--\s*filename[=:]\s*([^\s]+)/i);
        if (commentFilename) {
          filename = commentFilename[1];
        }
      }

      // Clean up the code - remove only leading/trailing empty lines, preserve internal structure
      const cleanCode = code.replace(/^\n+/, '').replace(/\n+$/, '');

      console.log('✅ Found code block:', language, 'filename:', filename, 'code length:', cleanCode.length);

      blocks.push({
        language: language,
        filename: filename,
        code: cleanCode
      });
    }

    console.log('📦 extractCodeBlocks found:', blocks.length, 'total blocks');
    return blocks;
  };

  // Get human-readable file type description
  const getFileTypeDescription = (extension) => {
    const types = {
      // JavaScript/TypeScript
      'js': 'JavaScript file',
      'jsx': 'React component (JSX)',
      'ts': 'TypeScript file',
      'tsx': 'React component (TypeScript)',
      'mjs': 'ES Module JavaScript',
      'cjs': 'CommonJS JavaScript',
      
      // Web
      'html': 'HTML document',
      'css': 'CSS stylesheet',
      'scss': 'Sass stylesheet',
      'sass': 'Sass stylesheet',
      'less': 'LESS stylesheet',
      
      // Data/Config
      'json': 'JSON configuration',
      'yaml': 'YAML configuration',
      'yml': 'YAML configuration',
      'toml': 'TOML configuration',
      'xml': 'XML document',
      'env': 'Environment variables',
      
      // Python
      'py': 'Python script',
      'pyx': 'Cython file',
      'ipynb': 'Jupyter notebook',
      
      // Other languages
      'java': 'Java class',
      'kt': 'Kotlin file',
      'go': 'Go source file',
      'rs': 'Rust source file',
      'rb': 'Ruby script',
      'php': 'PHP file',
      'c': 'C source file',
      'cpp': 'C++ source file',
      'h': 'C/C++ header',
      'swift': 'Swift source file',
      
      // Docs
      'md': 'Markdown document',
      'txt': 'Text file',
      'rst': 'reStructuredText',
      
      // Shell
      'sh': 'Shell script',
      'bash': 'Bash script',
      'zsh': 'Zsh script',
      
      // Config files
      'gitignore': 'Git ignore rules',
      'eslintrc': 'ESLint configuration',
      'prettierrc': 'Prettier configuration',
      'babelrc': 'Babel configuration',
    };
    
    return types[extension] || `${extension.toUpperCase()} file`;
  };

  // Analyze file content to determine purpose - Copilot-style concise explanations
  const getFilePurpose = (fileName, code, language) => {
    const lowerName = fileName.toLowerCase();
    const lowerCode = code.toLowerCase();
    const lines = code.split('\n').slice(0, 30).join('\n'); // First 30 lines for analysis
    
    // Extract key identifiers from code
    const functionMatch = code.match(/(?:function|const|let|var)\s+(\w+)/);
    const classMatch = code.match(/class\s+(\w+)/);
    const componentMatch = code.match(/(?:export\s+(?:default\s+)?)?(?:function|const)\s+(\w+).*?(?:return\s*\(|=>)/s);
    const exportsMatch = code.match(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/);
    
    // Check for specific patterns and give contextual descriptions
    
    // API/Fetch patterns
    if (lowerCode.includes('fetch(') || lowerCode.includes('axios')) {
      const endpoints = code.match(/['"`](\/api\/\w+|https?:\/\/[^'"`]+)['"`]/g);
      if (endpoints) {
        return `Handles API calls${endpoints.length > 1 ? ` to ${endpoints.length} endpoints` : ''}`;
      }
      return 'Handles HTTP requests and API communication';
    }
    
    // React hooks
    if (lowerCode.includes('createcontext') || lowerCode.includes('usecontext')) {
      const contextMatch = code.match(/(\w+)Context/i);
      return contextMatch ? `Provides ${contextMatch[1]} state across components` : 'Shares state across components via Context';
    }
    
    if (lowerCode.includes('usereducer')) {
      return 'Manages complex state with reducer pattern';
    }
    
    // Form handling
    if (lowerCode.includes('onsubmit') || lowerCode.includes('handlesubmit')) {
      const formType = lowerName.includes('login') ? 'login' : 
                       lowerName.includes('signup') || lowerName.includes('register') ? 'registration' :
                       lowerName.includes('contact') ? 'contact' : 'form';
      return `Handles ${formType} form submission and validation`;
    }
    
    // Authentication
    if (lowerCode.includes('login') && lowerCode.includes('password')) {
      return 'Authenticates users with credentials';
    }
    if (lowerCode.includes('logout') || lowerCode.includes('signout')) {
      return 'Handles user session management';
    }
    if (lowerCode.includes('jwt') || lowerCode.includes('token')) {
      return 'Manages authentication tokens';
    }
    
    // Database/Models
    if (lowerCode.includes('mongoose.schema') || lowerCode.includes('new schema')) {
      const modelMatch = code.match(/mongoose\.model\(['"](\w+)['"]/i);
      return modelMatch ? `Defines ${modelMatch[1]} database schema` : 'Defines MongoDB document schema';
    }
    if (lowerCode.includes('sequelize') || lowerCode.includes('model.init')) {
      return 'Defines SQL database model';
    }
    
    // Express routes
    if (lowerCode.includes('router.get') || lowerCode.includes('router.post') || 
        lowerCode.includes('app.get') || lowerCode.includes('app.post')) {
      const routeCount = (code.match(/\.(get|post|put|delete|patch)\(/gi) || []).length;
      return `Defines ${routeCount} API endpoint${routeCount > 1 ? 's' : ''}`;
    }
    
    // Middleware
    if (lowerCode.includes('req, res, next') || lowerCode.includes('(req, res)')) {
      if (lowerName.includes('auth')) return 'Validates authentication on requests';
      if (lowerName.includes('error')) return 'Handles errors and sends responses';
      if (lowerName.includes('valid')) return 'Validates incoming request data';
      return 'Processes requests before reaching routes';
    }
    
    // React components - analyze what they render
    if (componentMatch || (lowerCode.includes('return') && lowerCode.includes('<'))) {
      const name = componentMatch?.[1] || exportsMatch?.[1] || '';
      
      // Check what the component renders/does
      if (lowerCode.includes('<button') || lowerCode.includes('onclick')) {
        return `Renders interactive ${name || 'button'} element`;
      }
      if (lowerCode.includes('<form')) {
        return `Renders ${name || 'form'} with input fields`;
      }
      if (lowerCode.includes('<ul') || lowerCode.includes('<li') || lowerCode.includes('.map(')) {
        return `Renders list of ${name.toLowerCase().replace('list', '') || 'items'}`;
      }
      if (lowerCode.includes('<table') || lowerCode.includes('<tr')) {
        return `Displays data in table format`;
      }
      if (lowerCode.includes('<nav') || lowerName.includes('nav')) {
        return 'Renders site navigation links';
      }
      if (lowerCode.includes('<header') || lowerName.includes('header')) {
        return 'Renders page header and branding';
      }
      if (lowerCode.includes('<footer') || lowerName.includes('footer')) {
        return 'Renders page footer content';
      }
      if (lowerCode.includes('modal') || lowerName.includes('modal')) {
        return 'Displays overlay dialog/modal';
      }
      if (lowerCode.includes('<img') || lowerCode.includes('<svg')) {
        return `Renders ${name || 'visual'} with images/icons`;
      }
      if (lowerCode.includes('loading') || lowerCode.includes('spinner')) {
        return 'Shows loading state indicator';
      }
      if (name) {
        return `Renders ${name} UI component`;
      }
    }
    
    // Utility functions
    if (lowerName.includes('util') || lowerName.includes('helper')) {
      const funcCount = (code.match(/(?:export\s+)?(?:const|function)\s+\w+/g) || []).length;
      return `Provides ${funcCount} utility function${funcCount > 1 ? 's' : ''}`;
    }
    
    // Styles
    if (lowerName.endsWith('.css') || lowerName.endsWith('.scss')) {
      const ruleCount = (code.match(/\{[^}]+\}/g) || []).length;
      return `Defines ${ruleCount} style rule${ruleCount > 1 ? 's' : ''} for UI`;
    }
    
    // Config files
    if (lowerName === 'package.json') {
      try {
        const pkg = JSON.parse(code);
        const depCount = Object.keys(pkg.dependencies || {}).length;
        return `Configures project with ${depCount} dependencies`;
      } catch {
        return 'Defines project dependencies and scripts';
      }
    }
    if (lowerName === 'tsconfig.json') return 'Configures TypeScript compiler options';
    if (lowerName === 'vite.config') return 'Configures Vite build and dev server';
    if (lowerName.includes('eslint')) return 'Configures code linting rules';
    if (lowerName.includes('prettier')) return 'Configures code formatting rules';
    if (lowerName === '.env') return 'Stores environment variables';
    if (lowerName === '.gitignore') return 'Excludes files from version control';
    
    // Entry points
    if (lowerName === 'index.js' || lowerName === 'index.jsx' || lowerName === 'index.ts' || lowerName === 'index.tsx') {
      if (lowerCode.includes('createroot') || lowerCode.includes('reactdom')) {
        return 'Mounts React app to DOM';
      }
      if (lowerCode.includes('express')) {
        return 'Starts Express server';
      }
      return 'Entry point - bootstraps the application';
    }
    
    if (lowerName === 'app.jsx' || lowerName === 'app.tsx' || lowerName === 'app.js') {
      if (lowerCode.includes('route') || lowerCode.includes('router')) {
        return 'Root component with route definitions';
      }
      return 'Root component - wraps entire application';
    }
    
    // Server files
    if (lowerName === 'server.js' || lowerName === 'server.ts') {
      const port = code.match(/(?:port|PORT)[:\s=]+(\d+)/i);
      return port ? `Starts server on port ${port[1]}` : 'Configures and starts the server';
    }
    
    // Test files
    if (lowerName.includes('.test.') || lowerName.includes('.spec.')) {
      const testCount = (code.match(/(?:it|test)\s*\(/g) || []).length;
      return `Contains ${testCount} test case${testCount > 1 ? 's' : ''}`;
    }
    
    // Default: try to extract from function/class name
    if (classMatch) {
      return `Defines ${classMatch[1]} class`;
    }
    if (exportsMatch) {
      return `Exports ${exportsMatch[1]} for use in other files`;
    }
    if (functionMatch) {
      return `Implements ${functionMatch[1]} functionality`;
    }
    
    return 'Project source file';
  };

  // Analyze error output to provide user-friendly explanation
  const analyzeError = (errorOutput, command) => {
    const lowerError = errorOutput.toLowerCase();
    const result = {
      type: 'Unknown Error',
      issue: 'An error occurred during execution',
      file: null,
      line: null,
      fixPlan: 'Analyze the error and provide a fix'
    };
    
    // Extract file path from error (common patterns)
    const filePatterns = [
      /(?:in|at|file:?\s*)([\/\w\-\.]+\.[jstxcshtml]{2,4})(?::(\d+))?/i,
      /([\/\w\-\.]+\.[jstxcshtml]{2,4}):(\d+)/i,
      /Error in ([\/\w\-\.]+)/i,
      /Cannot find module ['"]([^'"]+)['"]/i,
    ];
    
    for (const pattern of filePatterns) {
      const match = errorOutput.match(pattern);
      if (match) {
        result.file = match[1];
        if (match[2]) result.line = match[2];
        break;
      }
    }
    
    // Detect error type and provide explanation
    if (lowerError.includes('cannot find module') || lowerError.includes('module not found')) {
      const moduleMatch = errorOutput.match(/Cannot find module ['"]([^'"]+)['"]/i);
      result.type = 'Missing Module';
      result.issue = moduleMatch ? `The module "${moduleMatch[1]}" is not installed` : 'A required module is not installed';
      result.fixPlan = 'Install the missing dependency with npm/yarn';
    }
    else if (lowerError.includes('command not found')) {
      const cmdMatch = errorOutput.match(/(\w+):\s*command not found/i);
      result.type = 'Command Not Found';
      result.issue = cmdMatch ? `The command "${cmdMatch[1]}" is not available` : 'A command is not found in PATH';
      result.fixPlan = 'Install the required tool or check PATH configuration';
    }
    else if (lowerError.includes('enoent') || lowerError.includes('no such file')) {
      result.type = 'File Not Found';
      result.issue = 'A required file or directory does not exist';
      result.fixPlan = 'Create the missing file or fix the path';
    }
    else if (lowerError.includes('syntaxerror') || lowerError.includes('syntax error')) {
      result.type = 'Syntax Error';
      result.issue = 'There is a syntax error in the code';
      result.fixPlan = 'Fix the syntax error in the affected file';
    }
    else if (lowerError.includes('typeerror')) {
      result.type = 'Type Error';
      result.issue = 'A value is being used incorrectly (wrong type)';
      result.fixPlan = 'Fix the type mismatch in the code';
    }
    else if (lowerError.includes('referenceerror') || lowerError.includes('is not defined')) {
      const varMatch = errorOutput.match(/(\w+) is not defined/i);
      result.type = 'Reference Error';
      result.issue = varMatch ? `"${varMatch[1]}" is not defined` : 'A variable or function is not defined';
      result.fixPlan = 'Import or declare the missing variable/function';
    }
    else if (lowerError.includes('permission denied') || lowerError.includes('eacces')) {
      result.type = 'Permission Error';
      result.issue = 'Permission denied to access a file or resource';
      result.fixPlan = 'Fix file permissions or run with elevated privileges';
    }
    else if (lowerError.includes('npm err!')) {
      result.type = 'NPM Error';
      if (lowerError.includes('404')) {
        result.issue = 'Package not found in npm registry';
        result.fixPlan = 'Check the package name for typos';
      } else if (lowerError.includes('peer dep')) {
        result.issue = 'Peer dependency conflict';
        result.fixPlan = 'Resolve dependency version conflicts';
      } else {
        result.issue = 'An npm package installation error occurred';
        result.fixPlan = 'Fix the npm configuration or package.json';
      }
    }
    else if (lowerError.includes('failed to compile') || lowerError.includes('build failed')) {
      result.type = 'Build Error';
      result.issue = 'The project failed to compile';
      result.fixPlan = 'Fix the compilation errors in the source code';
    }
    else if (lowerError.includes('port') && (lowerError.includes('in use') || lowerError.includes('eaddrinuse'))) {
      const portMatch = errorOutput.match(/port (\d+)/i);
      result.type = 'Port In Use';
      result.issue = portMatch ? `Port ${portMatch[1]} is already in use` : 'The required port is already in use';
      result.fixPlan = 'Kill the process using the port or use a different port';
    }
    else if (lowerError.includes('fatal:') && lowerError.includes('git')) {
      result.type = 'Git Error';
      result.issue = 'A git operation failed';
      result.fixPlan = 'Fix the git configuration or repository state';
    }
    
    return result;
  };

  // Extract terminal commands from AI response
  const extractCommands = (content) => {
    const commands = [];

    // Match various command patterns
    const patterns = [
      // Commands in bash/sh/terminal code blocks
      /```(?:bash|sh|shell|terminal|zsh)\n([\s\S]*?)```/gi,
      // Commands with $ prefix
      /\$\s+(npm|yarn|pnpm|node|python|pip|git|cd|mkdir|touch|rm|mv|cp)\s+[^\n]+/gi,
      // Common commands in plain text (more strict)
      /(?:^|\n)(npm (?:install|run|start|build|test)|yarn (?:install|add|start|build)|git (?:clone|init|add|commit|push|pull))[^\n]*/gi
    ];

    patterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        let cmd = match[1] || match[0];
        cmd = cmd.trim().replace(/^\$\s*/, ''); // Remove $ prefix

        // Split multiline bash blocks into individual commands
        if (cmd.includes('\n')) {
          const lines = cmd.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#')); // Remove comments
          commands.push(...lines);
        } else {
          commands.push(cmd);
        }
      }
    });

    // Deduplicate and filter
    const seen = new Set();
    const filtered = commands.filter(cmd => {
      if (!cmd || cmd.length < 3 || seen.has(cmd)) return false;
      seen.add(cmd);
      return true;
    });

    debug('🔧 extractCommands found:', filtered.length, 'commands:', filtered);
    return filtered;
  };

  // Request user confirmation before running commands
  const requestCommandConfirmation = (commands, isAutoFixCommand = false) => {
    return new Promise((resolve) => {
      setPendingCommands(commands);
      setIsAutoFix(isAutoFixCommand);
      commandResolverRef.current = resolve;
    });
  };

  // Handle user confirming commands
  const handleConfirmCommands = () => {
    if (commandResolverRef.current) {
      commandResolverRef.current(true);
      commandResolverRef.current = null;
    }
    setPendingCommands(null);
    setIsAutoFix(false);
  };

  // Handle user cancelling commands
  const handleCancelCommands = () => {
    if (commandResolverRef.current) {
      commandResolverRef.current(false);
      commandResolverRef.current = null;
    }
    setPendingCommands(null);
    setIsAutoFix(false);
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'system',
      content: '⏹️ Command execution cancelled by user.'
    }]);
  };

  // Execute terminal commands automatically with loading UI
  const executeCommandsAutomatically = async (messageContent, isAutoFixCommand = false) => {
    const commands = extractCommands(messageContent);
    if (commands.length === 0) return;

    // Request user confirmation before running
    const confirmed = await requestCommandConfirmation(commands, isAutoFixCommand);
    if (!confirmed) {
      console.log('❌ User cancelled command execution');
      return;
    }

    // Wait if terminal is already busy (prevents command collision)
    if (isTerminalBusy) {
      console.log('⏳ Terminal busy, waiting...');
      // Wait up to 30 seconds for terminal to be free
      let waitTime = 0;
      while (isTerminalBusy && waitTime < 30000) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitTime += 500;
      }
      if (isTerminalBusy) {
        console.warn('Terminal still busy after 30s, aborting command execution');
        return;
      }
    }

    setIsTerminalBusy(true);
    try {
      // Get the first available terminal ID from the app
      const terminalElements = document.querySelectorAll('.terminal-instance.active');
      const terminalId = terminalElements.length > 0 ? terminalElements[0].getAttribute('data-id') : 'initial-terminal';
      const backendId = terminalElements.length > 0 ? terminalElements[0].getAttribute('data-terminal-id') : null;

      if (!backendId && !terminalId) {
        console.warn('No terminal available to execute commands');
        setMessages(prev => [
          ...prev,
          {
            role: 'system',
            content: '⚠️ No terminal available. Please open a terminal to execute commands.',
            isError: true
          }
        ]);
        return;
      }

      // Use backendId for writing to physical terminal, terminalId for UI status
      const targetTerminalBackendId = backendId || terminalId;

      // Always ensure the terminal is in the correct working directory
      if (workspaceFolderRef.current) {
        await window.electronAPI.terminalWrite(targetTerminalBackendId, `cd "${workspaceFolderRef.current.replace(/"/g, '\\"')}"\r`);
      }

      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        const commandId = Date.now() + Math.random();
        const statusMessageId = `status-${commandId}`;
        const isInstallCommand = command.includes('npm install') || command.includes('npm i ') ||
          command.includes('yarn install') || command.includes('pnpm install');
        const isRunCommand = command.includes('npm run') || command.includes('npm start') ||
          command.includes('yarn dev') || command.includes('pnpm dev');

        let statusMessage = '⚙️ Running command...';
        if (isInstallCommand) {
          statusMessage = '📦 Installing dependencies... This may take a moment.';
        } else if (isRunCommand) {
          statusMessage = '🚀 Starting application...';
        }

        setMessages(prev => [
          ...prev,
          {
            id: statusMessageId,
            role: 'system',
            content: `${statusMessage}\n\n\`\`\`bash\n${command}\n\`\`\``,
            isWorking: true
          }
        ]);

        try {
          // Capture terminal output BEFORE command (PTY-only approach)
          const outputBeforeCommand = terminalOutputRef.current || '';
          const outputLengthBefore = outputBeforeCommand.length;
          
          // Write the command to the terminal
          await window.electronAPI.terminalWrite(targetTerminalBackendId, command + '\r');

          // Real-time tracking: poll until we detect command completion
          const maxWaitTime = 1200000; // 20 min absolute max (safety net)
          const checkInterval = 300; // Check every 300ms
          const stableThreshold = 1500; // Output must be stable for 1.5s
          
          // Completion patterns for different command types
          const completionPatterns = [
            // npm
            /added \d+ packages?/i,
            /up to date/i,
            /npm warn/i,  // warnings mean it finished
            /npm err!/i,  // errors mean it finished (with error)
            // yarn
            /done in \d+/i,
            /success /i,
            // pnpm
            /packages are ready/i,
            // General
            /\$ $/, // Back to prompt
            /completed/i,
            /finished/i,
            /built /i,
            /compiled/i,
            /error:/i,
            /failed/i,
            /command not found/i,
          ];
          
          let lastOutputLength = outputLengthBefore;
          let stableTime = 0;
          let totalWaitTime = 0;
          
          while (totalWaitTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            totalWaitTime += checkInterval;
            
            const currentOutput = terminalOutputRef.current || '';
            const currentLength = currentOutput.length;
            const newOutput = currentOutput.slice(outputLengthBefore);
            
            // Check for completion patterns in the new output
            const foundCompletion = completionPatterns.some(pattern => pattern.test(newOutput));
            if (foundCompletion && !isRunCommand) {
              // Wait a tiny bit more to capture any trailing output
              await new Promise(resolve => setTimeout(resolve, 500));
              debug(`✅ Command completed (pattern matched) after ${totalWaitTime}ms`);
              break;
            }
            
            if (currentLength === lastOutputLength) {
              stableTime += checkInterval;
              if (stableTime >= stableThreshold) {
                debug(`✅ Command finished after ${totalWaitTime}ms (output stable)`);
                break;
              }
            } else {
              stableTime = 0;
              lastOutputLength = currentLength;
            }
            
            // For run commands (servers), exit after detecting URL or 5s
            if (isRunCommand) {
              const urlMatch = newOutput.match(/https?:\/\/localhost:\d+|http:\/\/127\.0\.0\.1:\d+/);
              if (urlMatch || totalWaitTime >= 5000) {
                debug('🚀 Run command - server detected or timeout');
                break;
              }
            }
          }
          
          if (totalWaitTime >= maxWaitTime) {
            debug(`⏱️ Command timed out after ${maxWaitTime}ms`);
          }

          // Capture output AFTER command from PTY
          const outputAfterCommand = terminalOutputRef.current || '';
          const commandOutput = outputAfterCommand.slice(outputLengthBefore).trim();
          
          debug('📟 PTY Output captured:', commandOutput.substring(0, 500));

          // Build result from PTY output (no separate terminalExecute)
          let result = { 
            success: true, 
            stdout: commandOutput, 
            stderr: '' 
          };

          // Update status to completed
          setMessages(prev => prev.map(msg =>
            msg.id === statusMessageId
              ? { ...msg, isWorking: false, isExecuting: false }
              : msg
          ));

          const executionTime = Date.now() - commandId;
          const errorText = commandOutput.toLowerCase();
          const hasError = 
            errorText.includes('error') ||
            errorText.includes('failed') ||
            errorText.includes('cannot find') ||
            errorText.includes('not found') ||
            errorText.includes('command not found') ||
            errorText.includes('npm err!') ||
            errorText.includes('enoent') ||
            errorText.includes('no such file') ||
            errorText.includes('permission denied') ||
            errorText.includes('fatal:') ||
            errorText.includes('exception');

          AnalyticsService.trackCommand(command, !hasError, executionTime);

          // Update terminal status dot
          if (onUpdateTerminalStatus) {
            onUpdateTerminalStatus(terminalId, hasError ? 'error' : 'success');
          }

          // Auto-detection of dev server URL
          if (!hasError && (isRunCommand || commandOutput)) {
            const urlPatterns = [
              /(?:Local|➜\s+Local|Network|➜\s+Network):\s+(https?:\/\/[^\s]+)/i,
              /(?:running on|listening on|server running at|Application started at):\s+(https?:\/\/[^\s]+)/i,
              /https?:\/\/localhost:\d+/i,
              /http:\/\/127\.0\.0\.1:\d+/i,
              /https?:\/\/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:\d+/i
            ];

            let detectedUrl = null;
            const output = commandOutput;

            for (const pattern of urlPatterns) {
              const match = output.match(pattern);
              if (match) {
                detectedUrl = (match[1] || match[0]);
                break;
              }
            }

            if (detectedUrl) {
              detectedUrl = detectedUrl.replace(/\x1b\[[0-9;]*m/g, '').trim();
              console.log('🌐 Auto-detection for preview:', detectedUrl);

              if (onDevServerDetected) {
                onDevServerDetected(detectedUrl);
              }

              setTimeout(async () => {
                try {
                  await window.electronAPI.shell.openExternal(detectedUrl);
                  setMessages(prev => [
                    ...prev,
                    {
                      id: Date.now(),
                      role: 'system',
                      content: `🌐 **Application started!**\n\nPreview is now active in the editor. Also opened in browser: [${detectedUrl}](${detectedUrl})`,
                    }
                  ]);
                } catch (err) {
                  console.error('Failed to open browser:', err);
                }
              }, 2000);
            }
          }

          // Auto-fix logic if command failed
          if (hasError) {
            debug('❌ Command failed, attempting auto-fix...');
            debug('📋 Error output from PTY:', commandOutput.substring(0, 1000));
            
            const errorOutput = commandOutput || 'Command failed with unknown error';
            
            // Analyze the error to provide better context to user
            const errorAnalysis = analyzeError(errorOutput, command);
            
            // Show detailed error analysis to user
            setMessages(prev => [...prev, {
              id: `error-analysis-${Date.now()}`,
              role: 'system',
              content: `❌ **Command Failed**\n\n` +
                `**Command:** \`${command}\`\n\n` +
                `**Error Type:** ${errorAnalysis.type}\n\n` +
                `**Issue:** ${errorAnalysis.issue}\n\n` +
                (errorAnalysis.file ? `**File:** \`${errorAnalysis.file}\`\n\n` : '') +
                (errorAnalysis.line ? `**Line:** ${errorAnalysis.line}\n\n` : '') +
                `🔧 **Auto-fix will:** ${errorAnalysis.fixPlan}`
            }]);
            
            // Build better context for auto-fix
            const errorContext = [
              ...conversationHistory.current.slice(-6), // Last 6 messages for more context
              {
                role: 'user',
                content: `🚨 **COMMAND FAILED - AUTO-FIX NEEDED**

**Failed Command:**
\`\`\`bash
${command}
\`\`\`

**Working Directory:** ${workspaceFolderRef.current || 'Unknown'}

**Error Output (from terminal):**
\`\`\`
${errorOutput}
\`\`\`

**Instructions:**
1. Analyze the error carefully
2. Identify the root cause (missing dependency, wrong path, syntax error, etc.)
3. Provide a SPECIFIC fix - not generic advice
4. If it's a missing package, provide the exact install command
5. If it's a code error, provide the corrected code with filename= format
6. If multiple steps are needed, provide them in order

Remember: Use filename= format for any code files you create or modify.`
              }
            ];
            
            try {
              // Show auto-fix status
              const fixStatusId = `fix-${Date.now()}`;
              setMessages(prev => [
                ...prev,
                {
                  id: fixStatusId,
                  role: 'system',
                  content: '🔧 **Generating fix...**\n\nAnalyzing root cause and preparing solution...',
                  isWorking: true
                }
              ]);
              
              const fixResponse = await ClaudeService.getClaudeCompletion(
                errorContext,
                20000,
                90000
              );
              
              // Remove fix status
              setMessages(prev => prev.filter(msg => msg.id !== fixStatusId));
              
              if (fixResponse && fixResponse.success && fixResponse.message) {
                // Add the fix message
                const fixMessage = {
                  id: Date.now() + Math.random(),
                  role: 'assistant',
                  content: fixResponse.message
                };
                
                setMessages(prev => [...prev, fixMessage]);
                conversationHistory.current.push(fixMessage);
                
                // Process the fix (create files and run commands)
                // Wait for current command batch to finish before running fix commands
                const runFix = async () => {
                  try {
                    const fixCommands = extractCommands(fixResponse.message);
                    const fixCodeBlocks = extractCodeBlocks(fixResponse.message);
                    
                    if (fixCodeBlocks.length > 0) {
                      await handleCreateFilesAutomatically(fixResponse.message, fixMessage.id);
                    }
                    
                    // Only run fix commands if terminal is not busy
                    if (fixCommands.length > 0 && !isTerminalBusy) {
                      await executeCommandsAutomatically(fixResponse.message, true);
                    } else if (fixCommands.length > 0) {
                      // Queue message to show user the commands to run
                      setMessages(prev => [...prev, {
                        id: Date.now(),
                        role: 'system',
                        content: `⏸️ **Commands queued** - Terminal is busy. Run these commands when ready:\n\n${fixCommands.map(c => '```bash\n' + c + '\n```').join('\n')}`
                      }]);
                    }
                  } catch (err) {
                    console.error('Error processing auto-fix:', err);
                  }
                };
                
                // Wait a bit longer to ensure command batch completes
                setTimeout(runFix, 2000);
              }
            } catch (fixError) {
              console.error('Auto-fix failed:', fixError);
              // Store context for manual retry
              setRetryContext({
                command,
                error: errorOutput,
                conversation: errorContext
              });
            }
          }

          if (i < commands.length - 1) {
            await new Promise(resolve => setTimeout(resolve, COMMAND_EXECUTION_DELAY));
          }
        } catch (error) {
          console.error('Error executing command:', error);
          setMessages(prev => prev.map(msg =>
            msg.id === statusMessageId
              ? { ...msg, isWorking: false, isExecuting: false }
              : msg
          ));
        }
      }
    } finally {
      setIsTerminalBusy(false);
    }
  };

  // Intelligently generate filename from code content
  const generateSmartFilename = (code, language) => {
    const extensionMap = {
      'javascript': 'js',
      'js': 'js',
      'typescript': 'ts',
      'ts': 'ts',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'html': 'html',
      'css': 'css',
      'python': 'py',
      'py': 'py',
      'json': 'json',
      'markdown': 'md',
      'md': 'md',
    };

    const ext = extensionMap[language.toLowerCase()] || 'txt';

    // Try to extract meaningful names from code

    // For HTML files, look for title or common names
    if (ext === 'html') {
      if (code.includes('<title>')) {
        const titleMatch = code.match(/<title>(.*?)<\/title>/i);
        if (titleMatch) {
          const title = titleMatch[1].toLowerCase().replace(/\s+/g, '-');
          return `${title}.html`;
        }
      }
      return 'index.html';
    }

    // For CSS files
    if (ext === 'css') {
      if (code.includes('@keyframe') || code.includes('animation')) {
        return 'animations.css';
      }
      if (code.includes('.btn') || code.includes('button')) {
        return 'buttons.css';
      }
      return 'styles.css';
    }

    // For JavaScript/JSX/React files
    if (ext === 'js' || ext === 'jsx') {
      // Look for React component
      const componentMatch = code.match(/(?:function|const|class)\s+([A-Z][a-zA-Z0-9]*)/);
      if (componentMatch) {
        return `${componentMatch[1]}.${ext}`;
      }

      // Look for common patterns
      if (code.includes('express') || code.includes('app.listen')) {
        return 'server.js';
      }
      if (code.includes('Router') || code.includes('routes')) {
        return 'routes.js';
      }
      if (code.includes('mongoose') || code.includes('Schema')) {
        return 'model.js';
      }
      if (code.includes('export default')) {
        return 'index.js';
      }

      return 'app.js';
    }

    // For Python files
    if (ext === 'py') {
      if (code.includes('Flask') || code.includes('app.run')) {
        return 'app.py';
      }
      if (code.includes('django')) {
        return 'views.py';
      }
      if (code.includes('class') && code.includes('def __init__')) {
        const classMatch = code.match(/class\s+([A-Z][a-zA-Z0-9]*)/);
        if (classMatch) {
          return `${classMatch[1].toLowerCase()}.py`;
        }
      }
      return 'main.py';
    }

    // For JSON files
    if (ext === 'json') {
      if (code.includes('"name"') && code.includes('"version"')) {
        return 'package.json';
      }
      if (code.includes('"compilerOptions"')) {
        return 'tsconfig.json';
      }
      return 'config.json';
    }

    // Default fallback
    return `file-${Date.now()}.${ext}`;
  };

  // Execute commands based on Commander AI's intelligent decisions
  const executeCommandsFromCommanderAI = async (commands) => {
    if (!workspaceFolderRef.current) {
      console.log('⚠️ No workspace folder - skipping command execution');
      return;
    }

    setIsTerminalBusy(true);
    try {
      console.log('⚡ Executing', commands.length, 'commands from Commander AI analysis');

      // Sort commands by order
      const sortedCommands = [...commands].sort((a, b) => a.order - b.order);

      for (let i = 0; i < sortedCommands.length; i++) {
        const cmdSpec = sortedCommands[i];

        // Skip unsafe commands
        if (!cmdSpec.isSafe) {
          console.log('⚠️ Skipping unsafe command:', cmdSpec.command);
          continue;
        }

        console.log(`⚡ Executing command ${i + 1}/${sortedCommands.length}:`, cmdSpec.command);
        console.log('📋 Reason:', cmdSpec.reason);
        console.log('📁 Working directory:', workspaceFolderRef.current);

        // Create a system message showing the command being executed
        const commandId = `command-${Date.now()}-${i}`;
        setMessages(prev => [
          ...prev,
          {
            id: commandId,
            role: 'system',
            content: `Executing Command:\n\n\`\`\`bash\n${cmdSpec.command}\n\`\`\`\n\n${cmdSpec.reason}\n\nWorking directory: \`${workspaceFolderRef.current}\``,
            isExecuting: true
          }
        ]);

        try {
          // Execute the command
          const result = await window.electronAPI.terminalExecute(cmdSpec.command, workspaceFolderRef.current);

          // Detect if a new project folder was created (npm create, vite, etc.)
          if (result.success && (
            cmdSpec.command.includes('npm create') ||
            cmdSpec.command.includes('npx create') ||
            cmdSpec.command.includes('yarn create') ||
            cmdSpec.command.match(/cd\s+[\w-]+\s*$/)  // Also detect "cd project-name"
          )) {
            // Extract project name from command
            let projectName = null;

            // Try npm/yarn create pattern
            const createMatch = cmdSpec.command.match(/(?:npm|yarn|npx)\s+create\s+\S+\s+(\S+)/);
            if (createMatch && createMatch[1]) {
              projectName = createMatch[1];
            }

            // Try cd pattern
            const cdMatch = cmdSpec.command.match(/cd\s+([\w-]+)\s*$/);
            if (cdMatch && cdMatch[1] && cdMatch[1] !== '..' && cdMatch[1] !== '.') {
              projectName = cdMatch[1];
            }

            if (projectName) {
              const newProjectPath = `${workspaceFolderRef.current}/${projectName}`;

              console.log('🎉 New project detected:', projectName);
              console.log('📁 Project path:', newProjectPath);
              console.warn('⚠️ IMPORTANT: User needs to open the new project folder!');

              // Add prominent warning message
              setMessages(prev => [
                ...prev,
                {
                  id: Date.now() + Math.random(),
                  role: 'system',
                  content: `🚨 **IMPORTANT: New Project Folder Detected!**\n\n✅ **Project created: \`${projectName}\`**\n\n⚠️ **YOU MUST OPEN THE NEW FOLDER NOW**\n\nThe AI will try to work on the previous project if you don't switch folders.\n\n**Steps to switch:**\n1. Click **File → Open Folder** (top menu)\n2. Navigate to: \`${newProjectPath}\`\n3. Select the folder and click Open\n\n**OR** use the folder icon in the sidebar (left side)\n\nThis clears the AI's memory and ensures commands run in the correct directory.`,
                  isError: true  // Make it red/prominent
                }
              ]);
            }
          }

          // Let Supervisor AI analyze the result
          const supervision = await SupervisorAI.monitorCommandExecution(
            cmdSpec.command,
            result.success,
            result.output,
            result.error
          );

          console.log('👁️ Supervisor AI command analysis:', supervision);

          // Auto-open browser if dev server command was successful
          if (result.success && (
            cmdSpec.command.match(/npm\s+(run\s+)?dev/) ||
            cmdSpec.command.match(/npm\s+start/) ||
            cmdSpec.command.match(/yarn\s+dev/) ||
            cmdSpec.command.match(/pnpm\s+dev/) ||
            cmdSpec.command.match(/vite(\s+dev)?$/)
          )) {
            console.log('🌐 Dev server command detected, attempting to open browser...');

            // Wait a bit for server to start, then try to detect port from output
            setTimeout(async () => {
              let url = 'http://localhost:3000'; // Default

              // Try to extract port from command output
              const output = result.stdout || result.output || '';
              const portMatch = output.match(/localhost:(\d+)/i) || output.match(/:\s*(\d+)/);
              if (portMatch && portMatch[1]) {
                url = `http://localhost:${portMatch[1]}`;
              }

              // Check for Vite specific output
              const viteMatch = output.match(/Local:\s+(http:\/\/[^\s]+)/i);
              if (viteMatch && viteMatch[1]) {
                url = viteMatch[1];
              }

              console.log('🌐 Opening browser at:', url);

              // Open in default browser
              try {
                await window.electronAPI.shell.openExternal(url);

                // Add a system message
                setMessages(prev => [
                  ...prev,
                  {
                    id: Date.now() + Math.random(),
                    role: 'system',
                    content: `🌐 **Browser opened automatically**\n\nYour application is running at: ${url}\n\nIf the browser didn't open, click here: [${url}](${url})`
                  }
                ]);
              } catch (err) {
                console.error('Failed to open browser:', err);
              }
            }, 3000); // Wait 3 seconds for server to start
          }

          // Update terminal status dot - Commander AI uses initial-terminal or default
          if (onUpdateTerminalStatus) {
            onUpdateTerminalStatus('initial-terminal', result.success ? 'success' : 'error');
          }

          // Update the message with the result
          setMessages(prev => prev.map(msg => {
            if (msg.id === commandId) {
              if (result.success) {
                return {
                  ...msg,
                  content: supervision.analysis.message || `Completed: ${cmdSpec.command}`,
                  isExecuting: false
                };
              } else {
                return {
                  ...msg,
                  content: supervision.analysis.message || `Failed: ${cmdSpec.command}`,
                  isExecuting: false,
                  isError: true
                };
              }
            }
            return msg;
          }));

          // If Supervisor AI detected an error, pause and provide context
          if (supervision.analysis.shouldPauseChatAI && supervision.analysis.errorDetails) {
            console.log('⚠️ Supervisor AI pausing workflow due to error');

            // Add error context message for Chat AI
            setMessages(prev => [
              ...prev,
              {
                role: 'system',
                content: `Error Detected:\n\n${supervision.analysis.errorDetails.context}\n\nSuggested fix: ${supervision.analysis.errorDetails.suggestedFix}`,
                isError: true
              }
            ]);

            // Stop further execution
            break;
          }

          // Wait a bit between commands
          if (i < sortedCommands.length - 1) {
            await new Promise(resolve => setTimeout(resolve, COMMAND_EXECUTION_DELAY));
          }
        } catch (error) {
          console.error('❌ Error executing command:', error);
          setMessages(prev => prev.map(msg => {
            if (msg.id === commandId) {
              return {
                ...msg,
                content: `Error: ${error.message}`,
                isExecuting: false,
                isError: true
              };
            }
            return msg;
          }));
        }
      }
    } finally {
      setIsTerminalBusy(false);
      debug('🎉 Commander AI command execution complete');
    }
  };

  // Create files based on Executor AI's intelligent decisions
  // Automatically create files in background - NO user interaction needed
  const handleCreateFilesAutomatically = async (messageContent, messageId) => {
    console.log('📁 handleCreateFilesAutomatically called');
    console.log('📂 Workspace folder (ref):', workspaceFolderRef.current);

    if (!workspaceFolderRef.current) {
      console.warn('⚠️ No workspace folder - skipping file creation. User needs to open a folder first.');
      return; // Silently fail if no workspace
    }

    const codeBlocks = extractCodeBlocks(messageContent);

    console.log('📦 Code blocks extracted:', codeBlocks.length);

    // Filter out command blocks (bash, sh, shell) - those are for execution, not file creation
    // Also filter out blocks without explicit filenames
    const fileBlocks = codeBlocks.filter(block => {
      const lang = block.language.toLowerCase();
      const isCommand = ['bash', 'sh', 'shell', 'zsh', 'fish', 'powershell', 'cmd'].includes(lang);
      const hasFilename = block.filename && block.filename.trim().length > 0;

      console.log(`  - Block: lang=${lang}, filename=${block.filename}, isCommand=${isCommand}, hasFilename=${hasFilename}`);

      // Only include if it's not a command AND has a filename
      return !isCommand && hasFilename;
    });

    console.log('📄 File blocks (after filtering):', fileBlocks.length);

    if (fileBlocks.length === 0) {
      console.warn('⚠️ No file code blocks found - AI response had no files with filename= attribute');
      return; // No code blocks for files, nothing to do
    }

    console.log('✨ Starting automatic file creation for', fileBlocks.length, 'code blocks');

    // Show file creation overview
    setMessages(prev => [...prev, {
      id: `files-overview-${Date.now()}`,
      role: 'system',
      content: `📁 **Creating ${fileBlocks.length} file${fileBlocks.length > 1 ? 's' : ''}...**`
    }]);

    // Automatically create files with smart names
    let createdCount = 0;
    const createdFiles = [];

    for (let i = 0; i < fileBlocks.length; i++) {
      const block = fileBlocks[i];
      const blockId = `${messageId}-block-${i}`;

      // Mark as creating
      setCodeBlockStates(prev => ({
        ...prev,
        [blockId]: { status: 'creating', filename: null }
      }));

      debug(`🔨 Processing code block ${i + 1}/${fileBlocks.length}:`, block.language);

      try {
        // Use filename from the code block (already validated to exist in filter above)
        let fileName = block.filename;

        debug('📝 Using filename from AI:', fileName);
        
        // Generate explanation for this file
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        const filePurpose = getFilePurpose(fileName, block.code, block.language);
        
        // Check if file exists before showing message
        let filePath = `${workspaceFolderRef.current}/${fileName}`;
        const checkResult = await window.electronAPI.fs.readFile(filePath);
        const isUpdating = checkResult.success;
        
        // Show concise Copilot-style explanation with create/update indicator
        const actionIcon = isUpdating ? '✏️' : '📄';
        const actionWord = isUpdating ? 'Updating' : 'Creating';
        setMessages(prev => [...prev, {
          id: `file-explain-${Date.now()}-${i}`,
          role: 'system',
          content: `${actionIcon} ${actionWord} \`${fileName}\` — ${filePurpose}`,
          isFileCreation: true
        }]);

        // Update with filename
        setCodeBlockStates(prev => ({
          ...prev,
          [blockId]: { status: 'creating', filename: fileName }
        }));
        
        if (isUpdating) {
          debug('♻️ File exists, will be overwritten:', fileName);
        } else {
          debug('✅ Creating new file:', fileName);
        }

        // Create parent directories if needed
        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
        if (dirPath && dirPath !== workspaceFolderRef.current) {
          debug('📁 Creating parent directory:', dirPath);
          const dirResult = await window.electronAPI.fs.createDir(dirPath);
          if (!dirResult.success && !dirResult.error?.includes('EEXIST')) {
            console.error('❌ Failed to create directory:', dirResult.error);
            setCodeBlockStates(prev => ({
              ...prev,
              [blockId]: { status: 'failed', filename: fileName, error: `Failed to create directory: ${dirResult.error}` }
            }));
            continue;
          }
        }

        // Create the file
        debug('🔧 Creating file:', filePath);
        const result = await window.electronAPI.fs.createFile(filePath);

        debug('📄 Create file result:', result);

        if (result.success) {
          debug('✍️ Writing content to file...');
          const writeResult = await window.electronAPI.fs.writeFile(filePath, block.code);
          console.log('💾 Write result:', writeResult);
          if (writeResult.success) {
            createdCount++;
            createdFiles.push(fileName);
            console.log('✅ File created successfully:', fileName);
            setCodeBlockStates(prev => ({
              ...prev,
              [blockId]: { status: 'created', filename: fileName }
            }));
            // Add delay to ensure filesystem sync before notifying
            await new Promise(resolve => setTimeout(resolve, 300));
            if (onFileCreated) {
              console.log('🔄 Calling onFileCreated callback for:', fileName);
              onFileCreated(filePath);
            } else {
              console.log('⚠️ No onFileCreated callback available');
            }
          } else {
            console.error('❌ Failed to write file:', writeResult.error, 'File:', filePath, 'Block:', block);
            alert(`❌ Failed to write file: ${fileName}\nError: ${writeResult.error}`);
            setCodeBlockStates(prev => ({
              ...prev,
              [blockId]: { status: 'failed', filename: fileName, error: writeResult.error }
            }));
          }
        } else {
          console.error('❌ Failed to create file:', result.error);

          // Mark as failed
          setCodeBlockStates(prev => ({
            ...prev,
            [blockId]: { status: 'failed', filename: fileName, error: result.error }
          }));
        }
      } catch (error) {
        console.error('❌ Error creating file:', error);

        // Mark as failed
        setCodeBlockStates(prev => ({
          ...prev,
          [blockId]: { status: 'failed', filename: fileName || 'unknown', error: error.message }
        }));
      }
    }

    console.log('🎉 File creation complete. Created:', createdCount, 'files');

    // CRITICAL: Force final refresh after ALL files are created
    if (createdCount > 0 && onFileCreated) {
      console.log('🔄 Final explorer refresh after creating', createdCount, 'files');
      // Wait for filesystem to fully sync
      await new Promise(resolve => setTimeout(resolve, 500));
      // Trigger refresh for each created file to ensure all appear
      for (const fileName of createdFiles) {
        const filePath = `${workspaceFolderRef.current}/${fileName}`;
        console.log('🔄 Refreshing explorer for:', fileName);
        onFileCreated(filePath);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      // One final refresh to catch anything missed
      await new Promise(resolve => setTimeout(resolve, 200));
      const lastFilePath = `${workspaceFolderRef.current}/${createdFiles[createdFiles.length - 1]}`;
      onFileCreated(lastFilePath);
    }

    // Files are created silently - no chat notification needed
    // Users can see them in the Explorer
  };

  // Create files from AI generated code - MANUAL (for button clicks)
  const handleCreateFiles = async (messageContent) => {
    if (!workspaceFolderRef.current) {
      alert('Please open a folder first to create files.');
      return;
    }

    const codeBlocks = extractCodeBlocks(messageContent);

    if (codeBlocks.length === 0) {
      alert('No code blocks found in this message.');
      return;
    }

    // Automatically create files with smart names
    let createdCount = 0;
    const createdFiles = [];

    for (let i = 0; i < codeBlocks.length; i++) {
      const block = codeBlocks[i];

      try {
        // Generate smart filename automatically
        let fileName = generateSmartFilename(block.code, block.language);

        // If file already exists, add a number
        let counter = 1;
        let originalName = fileName;
        let filePath = `${workspaceFolderRef.current}/${fileName}`;

        // Check if file exists and create unique name
        while (true) {
          const checkResult = await window.electronAPI.fs.readFile(filePath);
          if (!checkResult.success) {
            // File doesn't exist, we can use this name
            break;
          }
          // File exists, try with counter
          const nameParts = originalName.split('.');
          const ext = nameParts.pop();
          const baseName = nameParts.join('.');
          fileName = `${baseName}-${counter}.${ext}`;
          filePath = `${workspaceFolderRef.current}/${fileName}`;
          counter++;
        }

        // Create the file
        const result = await window.electronAPI.fs.createFile(filePath);

        if (result.success) {
          const writeResult = await window.electronAPI.fs.writeFile(filePath, block.code);

          if (writeResult.success) {
            createdCount++;
            createdFiles.push(fileName);

            // Open the first file automatically
            if (i === 0 && onFileCreated) {
              onFileCreated(filePath);
            }
          }
        }
      } catch (error) {
        console.error('Error creating file:', error);
      }
    }

    if (createdCount > 0) {
      const fileList = createdFiles.join(', ');
      alert(`✅ Successfully created ${createdCount} file(s):\n${fileList}\n\nThe first file has been opened in the editor.`);
    }
  };

  // Save single code block - AUTOMATIC for non-technical users
  const handleSaveCodeBlock = async (code, language) => {
    if (!workspaceFolderRef.current) {
      alert('Please open a folder first to save files.');
      return;
    }

    try {
      // Generate smart filename automatically
      let fileName = generateSmartFilename(code, language);

      // If file already exists, add a number
      let counter = 1;
      let originalName = fileName;
      let filePath = `${workspaceFolderRef.current}/${fileName}`;

      // Check if file exists and create unique name
      while (true) {
        const checkResult = await window.electronAPI.fs.readFile(filePath);
        if (!checkResult.success) {
          // File doesn't exist, we can use this name
          break;
        }
        // File exists, try with counter
        const nameParts = originalName.split('.');
        const ext = nameParts.pop();
        const baseName = nameParts.join('.');
        fileName = `${baseName}-${counter}.${ext}`;
        filePath = `${workspaceFolderRef.current}/${fileName}`;
        counter++;
      }

      // Create the file
      const result = await window.electronAPI.fs.createFile(filePath);

      if (result.success) {
        const writeResult = await window.electronAPI.fs.writeFile(filePath, code);

        if (writeResult.success && onFileCreated) {
          onFileCreated(filePath);
          alert(`✅ File created successfully: ${fileName}`);
        }
      }
    } catch (error) {
      console.error('Error saving file:', error);
      alert(`Error saving file: ${error.message}`);
    }
  };

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <div className="ai-header-content">
          <h3>AI Assistant</h3>
          {subscription && subscription.tier === 'free' && (
            <div className="subscription-status">
              <span className="prompts-remaining">
                {subscription.freePromptsRemaining || 0} free prompts left
              </span>
            </div>
          )}
          {voiceSupported && availableVoices.length > 0 && (
            <div className="voice-selector-container">
              <select
                className="voice-selector"
                value={selectedVoiceURI}
                onChange={(e) => {
                  setSelectedVoiceURI(e.target.value);
                  localStorage.setItem('ai-voice-uri', e.target.value);
                  // Stop any current speech when voice is changed
                  if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.cancel();
                  }
                }}
                title="Select Voice"
              >
                {availableVoices
                  .filter(v => v.lang.startsWith('en')) // Filter for English voices for better defaults
                  .map(voice => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
        <button className="ai-close" onClick={onClose}>
          <FiX size={18} />
        </button>
      </div>
      {error && (
        <div className="ai-error-banner">
          <FiAlertCircle size={16} />
          <span>Check your API configuration</span>
        </div>
      )}
      
      {/* Command Confirmation Dialog */}
      {pendingCommands && pendingCommands.length > 0 && (
        <div className="command-confirmation-overlay">
          <div className="command-confirmation-dialog">
            <div className="confirmation-header">
              <FiAlertCircle size={20} />
              <h4>{isAutoFix ? '🔧 Auto-Fix Commands' : '⚡ Run Commands'}</h4>
            </div>
            <p className="confirmation-description">
              {isAutoFix 
                ? 'The AI wants to run these commands to fix the error:' 
                : 'The AI wants to run these commands:'}
            </p>
            <div className="commands-list">
              {pendingCommands.map((cmd, i) => (
                <div key={i} className="command-item">
                  <code>{cmd}</code>
                </div>
              ))}
            </div>
            <div className="confirmation-actions">
              <button 
                className="confirm-btn"
                onClick={handleConfirmCommands}
              >
                <FiCheck size={16} />
                Run {pendingCommands.length === 1 ? 'Command' : `${pendingCommands.length} Commands`}
              </button>
              <button 
                className="cancel-btn"
                onClick={handleCancelCommands}
              >
                <FiX size={16} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="ai-messages" ref={messagesContainerRef}>
        {messages.map((msg, idx) => {
            const codeBlocks = extractCodeBlocks(msg.content);
            const hasCode = codeBlocks.length > 0;

            // Determine message class based on state
            let messageClass = `ai-message ${msg.role}`;
            if (msg.isStreaming) messageClass += ' streaming';
            if (msg.isExecuting) messageClass += ' executing';
            if (msg.isError) messageClass += ' error';

            // Use message ID as key if available, otherwise fallback to index
            const messageKey = msg.id || `msg-${idx}`;

            return (
              <div
                key={messageKey}
                className={messageClass}
                data-command-status={msg.commandStatus || ''}
                data-scanning={msg.isScanning ? 'true' : 'false'}
                data-working={msg.isWorking ? 'true' : 'false'}
              >
                <div className="message-content" data-working={msg.isWorking ? 'true' : 'false'}>
                  {(() => {
                    let fileBlockIndex = 0; // Track file blocks separately
                    return msg.content.split('```').map((part, i) => {
                      if (i % 2 === 1) {
                        // Extract language and filename from first line
                        const lines = part.split('\n');
                        const firstLine = lines[0].trim();
                        const code = lines.slice(1).join('\n');

                        // Extract language and filename
                        let language = 'code';
                        let displayFilename = null;
                        let blockState = null;
                        let blockStatus = null;
                        let blockId = null;

                        // Extract language from first line
                        const langMatch = firstLine.split(/\s+/)[0];
                        if (langMatch) {
                          language = langMatch;
                        }

                        // Check for filename= in the first line
                        if (firstLine.includes('filename=')) {
                          // Extract filename value
                          const filenameMatch = firstLine.match(/filename=([^\s]+)/);
                          if (filenameMatch) {
                            displayFilename = filenameMatch[1];
                            blockId = `${messageKey}-block-${fileBlockIndex}`;
                            blockState = blockId ? codeBlockStates[blockId] : null;
                            blockStatus = blockState?.status;
                            fileBlockIndex++;
                          }
                        }

                        // Determine if this is a command block based on language
                        const isCommand = ['bash', 'sh', 'shell', 'zsh', 'fish', 'powershell', 'cmd', 'terminal'].includes(language.toLowerCase());

                        // ALL code blocks (commands and files) - show only header, never code content
                        if (isCommand) {
                          // Command blocks - show command text in header only
                          const commandText = (code || part).trim().split('\n')[0]; // Get first line
                          const truncatedCommand = commandText.length > 40 ? commandText.substring(0, 40) + '...' : commandText;

                          return (
                            <div key={i} className="code-block-container collapsed">
                              <div className="code-block-header" style={{ cursor: 'default' }}>
                                <div className="code-header-left">
                                  <span className="code-filename command-text">{truncatedCommand}</span>
                                  <span className="code-language">{language.toUpperCase()}</span>
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          // File blocks - always show only header (no code content ever shown)
                          return (
                            <div key={i} className="code-block-container collapsed">
                              <div className="code-block-header" style={{ cursor: 'default' }}>
                                <div className="code-header-left">
                                  {displayFilename && (
                                    <span className="code-filename">{displayFilename}</span>
                                  )}
                                  <span className="code-language">{language.toUpperCase()}</span>
                                </div>
                                <div className="code-header-right">
                                  {blockStatus === 'creating' && (
                                    <span className="code-status creating">
                                      <FiLoader className="spinning" size={12} />
                                      Creating...
                                    </span>
                                  )}
                                  {blockStatus === 'created' && (
                                    <span className="code-status created">
                                      <FiCheck size={12} />
                                      Created
                                    </span>
                                  )}
                                  {blockStatus === 'failed' && (
                                    <span className="code-status failed">
                                      Failed
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }
                      }

                      // TEXT CONTENT - Use sanitizer to strip all code
                      const sanitizedText = sanitizeTextContent(part);
                      if (!sanitizedText) return null;

                      // Render sanitized text with markdown support
                      return sanitizedText.split('\n').map((line, j) => {
                        if (!line.trim()) return null;

                        // Handle headers
                        if (line.startsWith('### ')) {
                          return <h3 key={`${i}-${j}`} style={{ fontSize: '1.1em', fontWeight: 'bold', marginTop: '1em', marginBottom: '0.5em' }}>{line.substring(4)}</h3>;
                        }
                        if (line.startsWith('## ')) {
                          return <h2 key={`${i}-${j}`} style={{ fontSize: '1.3em', fontWeight: 'bold', marginTop: '1.2em', marginBottom: '0.6em', borderBottom: '1px solid #3a3a3a', paddingBottom: '0.3em' }}>{line.substring(3)}</h2>;
                        }
                        if (line.startsWith('# ')) {
                          return <h1 key={`${i}-${j}`} style={{ fontSize: '1.5em', fontWeight: 'bold', marginTop: '1.5em', marginBottom: '0.7em' }}>{line.substring(2)}</h1>;
                        }

                        // Handle lists
                        if (line.match(/^\d+\.\s/)) {
                          return <li key={`${i}-${j}`} style={{ marginLeft: '1.5em', marginBottom: '0.3em' }}>{line.replace(/^\d+\.\s/, '')}</li>;
                        }
                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          return <li key={`${i}-${j}`} style={{ marginLeft: '1.5em', marginBottom: '0.3em', listStyleType: 'disc' }}>{line.substring(2)}</li>;
                        }

                        // Handle horizontal rule
                        if (line.trim() === '---' || line.trim() === '***') {
                          return <hr key={`${i}-${j}`} style={{ border: 'none', borderTop: '1px solid #3a3a3a', margin: '1.5em 0' }} />;
                        }

                        // Handle bold and inline code
                        const boldRegex = /\*\*(.+?)\*\*/g;
                        const inlineCodeRegex = /`([^`]+)`/g;
                        const parts = [];
                        let match;

                        // Process inline code first
                        const tempParts = [];
                        let tempIndex = 0;
                        while ((match = inlineCodeRegex.exec(line)) !== null) {
                          if (match.index > tempIndex) {
                            tempParts.push(line.substring(tempIndex, match.index));
                          }
                          // Only show inline code if it's short (like a filename or command)
                          const codeContent = match[1];
                          if (codeContent.length < 50 && !codeContent.includes('\n')) {
                            tempParts.push({ type: 'code', content: codeContent });
                          }
                          tempIndex = match.index + match[0].length;
                        }
                        if (tempIndex < line.length) {
                          tempParts.push(line.substring(tempIndex));
                        }

                        // Then handle bold
                        tempParts.forEach((part, partIdx) => {
                          if (typeof part === 'object' && part.type === 'code') {
                            parts.push(<code key={`code-${j}-${partIdx}`} style={{
                              background: 'rgba(255,255,255,0.1)',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontFamily: 'monospace',
                              fontSize: '0.9em'
                            }}>{part.content}</code>);
                          } else if (typeof part === 'string') {
                            let boldIndex = 0;
                            const boldMatches = [];
                            const boldRegexLocal = /\*\*(.+?)\*\*/g;
                            while ((match = boldRegexLocal.exec(part)) !== null) {
                              if (match.index > boldIndex) {
                                parts.push(part.substring(boldIndex, match.index));
                              }
                              parts.push(<strong key={`bold-${j}-${partIdx}-${match.index}`}>{match[1]}</strong>);
                              boldIndex = match.index + match[0].length;
                            }
                            // Only push remaining text if we found bold matches
                            if (boldIndex > 0 && boldIndex < part.length) {
                              parts.push(part.substring(boldIndex));
                            } else if (boldIndex === 0) {
                              // No bold matches found, push the entire string once
                              parts.push(part);
                            }
                          }
                        });

                        if (parts.length === 0) {
                          parts.push(line);
                        }

                        return <p key={`${i}-${j}`}>{parts}</p>;
                      });
                    });
                  })()}
                </div>

                {/* Retry button for failed auto-fix */}
                {msg.isRetryError && msg.retryContext && (
                  <div className="retry-button-container">
                    <button
                      className="retry-button"
                      onClick={() => handleRetryAutoFix(msg.retryContext)}
                      disabled={isLoading}
                    >
                      <FiLoader className={isLoading ? 'spinning' : ''} size={16} />
                      {isLoading ? 'Retrying...' : 'Retry Auto-Fix'}
                    </button>
                  </div>
                )}

                {/* Voice output button for assistant messages */}
                {msg.role === 'assistant' && voiceSupported && !msg.isStreaming && (
                  <button
                    className={`voice-output-button ${currentlySpeakingId === messageKey ? 'speaking' : ''}`}
                    onClick={() => speakMessage(msg.content, messageKey)}
                    title={currentlySpeakingId === messageKey ? "Stop speaking" : "Read aloud"}
                  >
                    {currentlySpeakingId === messageKey ? (
                      <FiVolumeX size={14} />
                    ) : (
                      <FiVolume2 size={14} />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        <div ref={messagesEndRef} />
      </div>
      <form
        className={`ai-input-form ${isDraggingOver ? 'drag-over' : ''}`}
        onSubmit={handleSubmit}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Show success feedback after drop */}
        {justDropped && (
          <div className="drop-success">
            <FiCheck size={16} /> Image added!
          </div>
        )}

        {/* Display attached images */}
        {attachedImages.length > 0 && (
          <div className="attached-images">
            {attachedImages.map((image, idx) => (
              <div key={idx} className="attached-image-item">
                <img src={image.urls.thumb} alt={image.alt_description || 'Image'} />
                <button
                  type="button"
                  className="remove-image"
                  onClick={() => removeAttachedImage(image.urls.regular)}
                  title="Remove image"
                >
                  <FiX size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Show stop button when loading or executing commands */}
        {(isLoading || isTerminalBusy || messages.some(msg => msg.isExecuting)) && (
          <div className="ai-working-indicator">
            <div className="working-status">
              <FiLoader className="spinning" size={14} />
              <span>{isTerminalBusy ? 'Terminal is busy...' : 'AI is working...'}</span>
            </div>
            <button
              type="button"
              className="stop-generation-btn"
              onClick={handleStopGeneration}
              title="Stop generation"
            >
              <FiX size={16} />
              Stop
            </button>
          </div>
        )}

        <div className="ai-input-container">
          <div className="ai-input-glow"></div>
          {/* Drop zone overlay - only show when dragging */}
          {isDraggingOver && (
            <div className="drop-zone-overlay">
              <span>Drop image here...</span>
            </div>
          )}
          <div className="ai-input-inner">
            <textarea
              className="ai-input"
              placeholder="Describe what you want to build"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Submit on Enter, add newline on Shift+Enter
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isLoading || isTerminalBusy}
              rows={3}
            />
            <div className="ai-input-actions">
              <div className="input-hint">
                <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
              </div>

              {/* Voice input button */}
              {voiceSupported && (
                <button
                  type="button"
                  className={`voice-input-button ${isRecording ? 'recording' : ''}`}
                  onClick={isRecording ? stopVoiceInput : startVoiceInput}
                  disabled={isLoading || isTerminalBusy}
                  title={isRecording ? "Stop recording" : "Voice input"}
                >
                  <FiMic size={16} />
                </button>
              )}

              <button
                type="submit"
                className="ai-send"
                disabled={!input.trim() || isLoading || isTerminalBusy}
                title={isLoading || isTerminalBusy ? "AI is working..." : "Send message"}
              >
                {isLoading || isTerminalBusy ? (
                  <FiLoader className="spinning" size={18} />
                ) : (
                  <>
                    <FiSend size={16} />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
});

AIAssistant.displayName = 'AIAssistant';

export default AIAssistant;
