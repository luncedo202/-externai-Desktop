import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FiX, FiSend, FiAlertCircle, FiDownload, FiFileText, FiFilePlus, FiEdit3, FiEye, FiCheck, FiLoader } from 'react-icons/fi';
import { RiRobot2Line } from 'react-icons/ri';
import ClaudeService from '../services/ClaudeService';
import AnalyticsService from '../services/AnalyticsService';
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
  onFirstResponse,
  onAddTask,
  onUpdateTask,
  explorerRefreshTrigger
}, ref) => {
  // Load messages from localStorage if available, but reset if workspaceFolder changes
  const defaultWelcome = {
    role: 'assistant',
    content: 'Hello! I\'m your AI coding assistant.\n\nI\'m here to help you build software. I can:\n\n• Create complete, working code for websites, mobile apps, and games\n• Debug and fix errors with clear explanations\n• Explain code in simple, beginner-friendly terms\n• Build full project structures ready to deploy\n• Understand your entire project - I can see all your files\n• Run terminal commands automatically\n\nJust tell me what you want to build:\n- "Create a landing page for my startup"\n- "Build a contact form with email validation"\n- "Make a simple game"\n- "Add a login page to my website"\n\nI\'ll immediately create the files and run any necessary commands. No manual steps required.\n\nWhat would you like to build?',
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
  const [error, setError] = useState(null);
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

    // Check if workspace is open before processing
    if (!workspaceFolder) {
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

    // Generate unique message ID
    const userMessageId = Date.now();

    const userMessageObj = { id: userMessageId, role: 'user', content: messageContent };

    // Add message to state
    setMessages(prev => [...prev, userMessageObj]);

    // Add to conversation history for context
    conversationHistory.current.push({ role: 'user', content: messageContent });

    setIsLoading(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    // Add a placeholder message for streaming (use different ID)
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
      if (workspaceFolder && window.electronAPI.workspace) {
        try {
          const fileList = await window.electronAPI.workspace.listFiles(workspaceFolder);
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

            for (const file of filesToRead) {
              const filePath = `${workspaceFolder}/${file.relativePath}`;
              try {
                const fileResult = await window.electronAPI.fs.readFile(filePath);
                if (fileResult.success && fileResult.content) {
                  // Limit each file to 2000 chars to prevent overflow
                  const content = fileResult.content.length > 2000
                    ? fileResult.content.substring(0, 2000) + '\n... (truncated)'
                    : fileResult.content;
                  workspaceContext += `\n\n--- ${file.relativePath} ---\n${content}\n`;
                }
              } catch (err) {
                // File doesn't exist or can't be read, skip it
              }
            }

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

      console.log('🚀 Starting Claude stream...');

      // Track AI request start
      const requestStartTime = Date.now();
      AnalyticsService.trackAIRequest('message_sent', {
        message_length: enhancedPrompt[enhancedPrompt.length - 1].content.length
      });

      // Call Claude API with streaming
      const response = await ClaudeService.getClaudeStream(
        enhancedPrompt,
        (chunk, fullText) => {
          // Update the streaming message with new content
          setMessages(prev => prev.map(msg =>
            msg.id === streamingMessageId
              ? { ...msg, content: fullText, isStreaming: true }
              : msg
          ));
        },
        20000,
        abortControllerRef.current.signal
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

        // Notify parent that AI has responded
        if (onFirstResponse) {
          onFirstResponse();
        }

        const assistantMessage = {
          id: streamingMessageId,
          role: 'assistant',
          content: response.message
        };

        conversationHistory.current.push(assistantMessage);

        if (workspaceFolder) {
          try {
            console.log('🤖 AI response received - processing automatically...');
            const codeBlocks = extractCodeBlocks(response.message);
            const commands = extractCommands(response.message);

            console.log(`📄 Found ${codeBlocks.length} code blocks to create`);
            console.log(`⚡ Found ${commands.length} commands to execute`);

            // STEP 1: Create files FIRST (so commands can use them)
            if (codeBlocks.length > 0) {
              console.log('📁 Creating files first...');
              // We await this now instead of using setTimeout
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

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    sendMessage: (messageText) => {
      sendMessage(messageText, []);
    },
    syncFiles: async () => {
      console.log('🔄 Syncing files from chat history...');
      // Look at the last few messages for code blocks
      const recentMessages = messages.slice(-5);
      for (const msg of recentMessages) {
        if (msg.role === 'assistant') {
          await handleCreateFilesAutomatically(msg.content, msg.id);
        }
      }
    }
  }), [messages, workspaceFolder]);

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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Guard against double submissions and duplicate messages
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
    // Prevent duplicate from React StrictMode double-invocation or rapid double submit
    // Strict duplicate check removed as it was blocking legitimate messages
    // isSubmittingRef (above) handles rapid double-clicks sufficienty
    isSubmittingRef.current = true;
    const imgs = [...attachedImages];
    // Clear input and images immediately
    setInput('');
    setAttachedImages([]);
    lastSubmittedMessageRef.current = { content: messageText, timestamp: Date.now() };

    try {
      // Send the message with a timeout safeguard
      // If sendMessage hangs for any reason (e.g. IPC call stuck), we must release the lock
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 120000)
      );

      await Promise.race([
        sendMessage(messageText, imgs),
        timeoutPromise
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      // If it was a timeout, we might want to notify the user
      if (error.message === 'Request timed out') {
        setMessages(prev => [...prev, {
          role: 'system',
          content: '⚠️ Request timed out. The system might be busy processing files. Please try again.'
        }]);
        setIsLoading(false); // Force reset loading state
      }
    } finally {
      isSubmittingRef.current = false;
      // Double check to ensure focus returns to input
      setTimeout(() => {
        const textarea = document.querySelector('.ai-input');
        if (textarea) textarea.focus();
      }, 100);
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
      const filenameMatch = firstLine.match(/filename=(?:"([^"]+)"|'([^']+)'|([^\s]+))/);
      if (filenameMatch) {
        // Match 1 is double quotes, Match 2 is single quotes, Match 3 is no quotes
        filename = filenameMatch[1] || filenameMatch[2] || filenameMatch[3];

        // Clean any residual quotes just in case
        if (filename) filename = filename.replace(/^['"]|['"]$/g, '');

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

  // Execute terminal commands automatically with loading UI
  const executeCommandsAutomatically = async (messageContent) => {
    const commands = extractCommands(messageContent);

    if (commands.length === 0) return;


    // Get the first available terminal ID from the app
    const terminalElements = document.querySelectorAll('[data-terminal-id]');
    const terminalId = terminalElements.length > 0 ? terminalElements[0].getAttribute('data-terminal-id') : null;

    if (!terminalId) {
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

    // Always ensure the terminal is in the correct working directory before running commands
    if (workspaceFolder) {
      // Send a cd command to the terminal to ensure correct directory
      await window.electronAPI.terminalWrite(terminalId, `cd "${workspaceFolder.replace(/"/g, '\"')}"\r`);
    }

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const commandId = Date.now() + Math.random();

      // Show AI working status message
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
        // Write the command to the terminal (visible execution)
        await window.electronAPI.terminalWrite(terminalId, command + '\r');

        // Also execute in background to get the result status
        const result = await window.electronAPI.terminalExecute(command, workspaceFolder);

        // Update the working status message to completed
        setMessages(prev => prev.map(msg =>
          msg.id === statusMessageId
            ? { ...msg, isWorking: false, isExecuting: false }
            : msg
        ));

        // Track command execution
        const executionTime = Date.now() - commandId;
        AnalyticsService.trackCommand(command, result.success, executionTime);

        // If command failed, notify the AI to fix it
        if (!result.success) {
          debug('❌ Command failed, asking AI to fix it with full context...');

          // Get COMPLETE workspace context for better error analysis - include ALL file contents
          let workspaceContext = '';
          let allFileContents = '';
          if (workspaceFolder && window.electronAPI.workspace) {
            try {
              const scanResult = await window.electronAPI.workspace.scan(workspaceFolder);
              if (scanResult.success) {
                const fileList = scanResult.files.slice(0, 50).map(f => f.path).join('\n');
                workspaceContext = `\n\n📁 PROJECT STRUCTURE:\n${fileList}${scanResult.files.length > 50 ? '\n... and more files' : ''}`;

                // Read ONLY the most relevant files (package.json, config files, and a few source files)
                const relevantExtensions = ['.json', '.js', '.jsx', '.ts', '.tsx'];
                const priorityFiles = ['package.json', 'vite.config', 'tailwind.config', '.config.'];
                const excludeFolders = ['node_modules', '.git', 'dist', 'build', '.next'];

                const filesToRead = scanResult.files
                  .filter(f => {
                    const ext = f.path.substring(f.path.lastIndexOf('.'));
                    const isRelevant = relevantExtensions.includes(ext);
                    const isExcluded = excludeFolders.some(folder => f.path.includes(`/${folder}/`));
                    const isPriority = priorityFiles.some(pf => f.path.includes(pf));
                    return isRelevant && !isExcluded && (isPriority || f.path.split('/').length <= 2);
                  })
                  .slice(0, 5); // Read max 5 files to keep request size manageable

                allFileContents = '\n\n📄 KEY FILE CONTENTS:';

                for (const file of filesToRead) {
                  const filePath = `${workspaceFolder}/${file.path}`;
                  try {
                    const fileResult = await window.electronAPI.fs.readFile(filePath);
                    if (fileResult.success && fileResult.content) {
                      // Limit each file to 1000 chars to prevent overflow
                      const content = fileResult.content.length > 1000
                        ? fileResult.content.substring(0, 1000) + '\n... (truncated)'
                        : fileResult.content;
                      allFileContents += `\n\n=== ${file.path} ===\n${content}`;
                    }
                  } catch (err) {
                    // File doesn't exist or can't be read, skip it
                  }
                }
              }
            } catch (err) {
              console.error('Failed to get workspace context:', err);
            }
          }

          // Get terminal output context - last 2 commands only
          let terminalOutputContext = '';
          try {
            const terminalElements = document.querySelectorAll('[data-terminal-id]');
            if (terminalElements.length > 0) {
              const terminalId = terminalElements[0].getAttribute('data-terminal-id');
              if (terminalId) {
                const outputResult = await window.electronAPI.terminal.getOutput(terminalId);
                if (outputResult.success && outputResult.output) {
                  const cleanOutput = outputResult.output.replace(/\x1b\[[0-9;]*m/g, '');

                  // Extract just the last 2 command blocks to keep size minimal
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

                  // Get only the last 2 commands
                  const last2Commands = commandBlocks.slice(-2).join('\n\n---\n\n');

                  terminalOutputContext = `\n\n📟 RECENT TERMINAL OUTPUT:\n\`\`\`\n${last2Commands || cleanOutput.slice(-1500)}\n\`\`\``;
                }
              }
            }
          } catch (err) {
            debug('Could not get terminal context:', err);
          }

          // Build comprehensive error message with FULL project context
          const errorMessage = {
            role: 'user',
            content: `🔴 COMMAND FAILED - FIX IT NOW

Command that failed:
\`\`\`bash
${command}
\`\`\`

Error output:
\`\`\`
${result.error || result.stderr || 'Unknown error'}
\`\`\`

Standard output:
\`\`\`
${result.stdout || 'No output'}
\`\`\`
${workspaceContext}
${allFileContents}
${terminalOutputContext}

Working directory: ${workspaceFolder || 'Not set'}

🔧 ACTION REQUIRED:
1. Analyze the error and file contents
2. Identify root cause (missing deps, syntax errors, imports, config issues)
3. Provide COMPLETE FIX with filename= format:
   \`\`\`language filename=path/file.ext
   (complete fixed code)
   \`\`\`
4. Include commands needed: \`\`\`bash

Provide complete fixed files, not explanations.`
          };

          conversationHistory.current.push(errorMessage);

          // Trigger AI to respond with fix
          setIsLoading(true);

          // Add a placeholder message for AI's fix
          const fixMessageId = Date.now() + 1;
          setMessages(prev => [...prev, {
            id: fixMessageId,
            role: 'assistant',
            content: '',
            isStreaming: true
          }]);

          try {
            console.log('🔧 Asking AI to fix the error...');
            console.log('📋 Error message context:', errorMessage.content.substring(0, 200));

            // Build full conversation context for the fix request
            const fixConversation = [
              ...conversationHistory.current.slice(-6), // Include last 6 messages for context
              errorMessage
            ];

            console.log('📨 Sending fix request with', fixConversation.length, 'messages');

            const fixResponse = await ClaudeService.getClaudeCompletion(fixConversation, 20000);

            console.log('🤖 Fix response received:', JSON.stringify(fixResponse).substring(0, 200));

            if (fixResponse && fixResponse.success && fixResponse.message) {
              console.log('✅ Updating fix message...');

              // Remove streaming placeholder and add real response
              setMessages(prev => {
                const filtered = prev.filter(msg => msg.id !== fixMessageId);
                return [
                  ...filtered,
                  {
                    id: Date.now() + Math.random(),
                    role: 'assistant',
                    content: fixResponse.message
                  }
                ];
              });

              const fixAssistantMessage = {
                id: Date.now() + Math.random(),
                role: 'assistant',
                content: fixResponse.message
              };

              conversationHistory.current.push(fixAssistantMessage);

              // Process the fix response to extract and execute commands/files
              setTimeout(async () => {
                try {
                  console.log('🔄 Processing fix: extracting commands and files...');
                  const fixCommands = extractCommands(fixResponse.message);
                  const fixCodeBlocks = extractCodeBlocks(fixResponse.message);

                  console.log('📋 Found fix commands:', fixCommands.length);
                  console.log('📄 Found fix code blocks:', fixCodeBlocks.length);

                  if (fixCodeBlocks.length > 0) {
                    console.log('📁 Creating fix files first...');
                    await handleCreateFilesAutomatically(fixResponse.message, fixAssistantMessage.id);
                  }

                  if (fixCommands.length > 0) {
                    console.log('⚡ Executing fix commands...');
                    await executeCommandsAutomatically(fixResponse.message);
                  }
                } catch (err) {
                  console.error('❌ Error processing fix response:', err);
                }
              }, WORKSPACE_SCAN_DELAY);
            } else {
              const errorDetail = fixResponse ? (fixResponse.error || 'No message in response') : 'No response received';
              console.error('❌ Fix response invalid:', errorDetail);
              console.error('Full fix response:', JSON.stringify(fixResponse));
              throw new Error(errorDetail);
            }
          } catch (fixError) {
            console.error('❌ Error getting AI fix:', fixError);
            console.error('❌ Error stack:', fixError.stack);

            // Show error message to user with more details
            setMessages(prev => {
              const filtered = prev.filter(msg => msg.id !== fixMessageId);
              return [
                ...filtered,
                {
                  id: Date.now(),
                  role: 'assistant',
                  content: `❌ **Auto-fix failed:** ${fixError.message}

The automatic fix system encountered an error. This might be due to:
- Backend connection issue
- API timeout
- Invalid response format

**What you can do:**
1. Try running the command manually in the terminal
2. Check the backend server logs
3. Ask me to help fix this specific error manually`
                }
              ];
            });
          } finally {
            setIsLoading(false);
          }

          // Stop processing remaining commands - let AI provide the fix first
          return;
        }

        // Wait a bit between commands
        if (commands.indexOf(command) < commands.length - 1) {
          await new Promise(resolve => setTimeout(resolve, COMMAND_EXECUTION_DELAY));
        }
      } catch (error) {
        console.error('Error executing command:', error);

        // Clear the working status flag for this command's message
        setMessages(prev => prev.map(msg =>
          msg.id === statusMessageId
            ? { ...msg, isWorking: false, isExecuting: false }
            : msg
        ));

        // Don't show error in chat - let AI handle it silently
      }
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
    if (!workspaceFolder) {
      console.log('⚠️ No workspace folder - skipping command execution');
      return;
    }

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
      console.log('📁 Working directory:', workspaceFolder);

      // Create a system message showing the command being executed
      const commandId = `command-${Date.now()}-${i}`;
      setMessages(prev => [
        ...prev,
        {
          id: commandId,
          role: 'system',
          content: `Executing Command:\n\n\`\`\`bash\n${cmdSpec.command}\n\`\`\`\n\n${cmdSpec.reason}\n\nWorking directory: \`${workspaceFolder}\``,
          isExecuting: true
        }
      ]);

      try {
        // Execute the command
        const result = await window.electronAPI.terminalExecute(cmdSpec.command, workspaceFolder);

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
            const newProjectPath = `${workspaceFolder}/${projectName}`;

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

    debug('🎉 Commander AI command execution complete');
  };

  // Create files based on Executor AI's intelligent decisions
  // Automatically create files in background - NO user interaction needed
  const handleCreateFilesAutomatically = async (messageContent, messageId) => {
    console.log('📁 handleCreateFilesAutomatically called');
    console.log('📂 Workspace folder:', workspaceFolder);

    if (!workspaceFolder) {
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

    // Show AI working status
    const workingMessageId = `working-${Date.now()}`;
    // File creation happens silently - no status message in chat

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

        // Update with filename
        setCodeBlockStates(prev => ({
          ...prev,
          [blockId]: { status: 'creating', filename: fileName }
        }));

        // Use the filename as-is - if file exists, it will be overwritten
        // This allows the AI to edit existing files by using the same filename
        let filePath = `${workspaceFolder}/${fileName}`;

        // Check if file exists (for logging only)
        const checkResult = await window.electronAPI.fs.readFile(filePath);
        if (checkResult.success) {
          debug('♻️ File exists, will be overwritten:', fileName);
        } else {
          debug('✅ Creating new file:', fileName);
        }

        // Create parent directories if needed
        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
        if (dirPath && dirPath !== workspaceFolder) {
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
        const filePath = `${workspaceFolder}/${fileName}`;
        console.log('🔄 Refreshing explorer for:', fileName);
        onFileCreated(filePath);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      // One final refresh to catch anything missed
      await new Promise(resolve => setTimeout(resolve, 200));
      const lastFilePath = `${workspaceFolder}/${createdFiles[createdFiles.length - 1]}`;
      onFileCreated(lastFilePath);
    }

    // Files are created silently - no chat notification needed
    // Users can see them in the Explorer
  };

  // Create files from AI generated code - MANUAL (for button clicks)
  const handleCreateFiles = async (messageContent) => {
    if (!workspaceFolder) {
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
        let filePath = `${workspaceFolder}/${fileName}`;

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
          filePath = `${workspaceFolder}/${fileName}`;
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
    if (!workspaceFolder) {
      alert('Please open a folder first to save files.');
      return;
    }

    try {
      // Generate smart filename automatically
      let fileName = generateSmartFilename(code, language);

      // If file already exists, add a number
      let counter = 1;
      let originalName = fileName;
      let filePath = `${workspaceFolder}/${fileName}`;

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
        filePath = `${workspaceFolder}/${fileName}`;
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
          <h3>
            <RiRobot2Line size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
            ExternAI
          </h3>
          {subscription && subscription.tier === 'free' && (
            <div className="subscription-status">
              <span className="prompts-remaining">
                {subscription.freePromptsRemaining || 0} free prompts left
              </span>
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
      <div className="ai-messages" ref={messagesContainerRef}>
        {messages
          // Filter out duplicate user messages (same content within 2 seconds)
          .map((msg, idx) => {
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
                      } else {
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
                              if (boldIndex < part.length) {
                                parts.push(part.substring(boldIndex));
                              }

                            }
                          });

                          if (parts.length === 0) {
                            parts.push(line);
                          }

                          return <p key={`${i}-${j}`}>{parts}</p>;
                        });
                      }
                    });
                  })()}
                </div>
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
        {(isLoading || messages.some(msg => msg.isExecuting)) && (
          <div className="ai-working-indicator">
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

        <div className="ai-input-wrapper">
          <textarea
            className="ai-input"
            placeholder={isDraggingOver ? "Drop image here..." : "Ask a question..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Submit on Enter, add newline on Shift+Enter
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={isLoading}
            rows={5}
          />
          <button
            type="submit"
            className="ai-send"
            disabled={!input.trim() || isLoading}
            title={isLoading ? "AI is working..." : "Send"}
          >
            {isLoading ? <FiLoader className="spinning" size={18} /> : <FiSend size={18} />}
          </button>
        </div>
      </form>
    </div>
  );
});

AIAssistant.displayName = 'AIAssistant';

export default AIAssistant;
