import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FiX, FiSend, FiAlertCircle, FiDownload, FiFileText, FiFilePlus, FiEdit3, FiEye, FiCheck, FiLoader } from 'react-icons/fi';
import ClaudeService from '../services/ClaudeService';
import './AIAssistant.css';

// Debug flag - set to false to disable verbose logging in production
const DEBUG = false;
const debug = (...args) => DEBUG && console.log(...args);

// Constants for timing
const TYPING_DELAY_MIN = 10; // ms - faster response speed
const TYPING_DELAY_MAX = 30; // ms - faster response speed
const COMMAND_EXECUTION_DELAY = 1000; // ms between commands
const WORKSPACE_SCAN_DELAY = 500; // ms before scanning workspace
const STREAM_BUFFER_CHECK_DELAY = 50; // ms when waiting for content
const DISPLAY_COMPLETION_CHECK_DELAY = 100; // ms when waiting for display to finish

const AIAssistant = forwardRef(({ onClose, workspaceFolder, onFileCreated }, ref) => {
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
      } catch {}
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
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const conversationHistory = useRef([]);
  const autoScrollEnabled = useRef(true);
  const [codeBlockStates, setCodeBlockStates] = useState({}); // Track code block creation status
  const [expandedBlocks, setExpandedBlocks] = useState({}); // Track which blocks are expanded
  const [attachedImages, setAttachedImages] = useState([]); // Track dropped images
  const [isDraggingOver, setIsDraggingOver] = useState(false); // Visual feedback for drag
  const [justDropped, setJustDropped] = useState(false); // Show success feedback after drop

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
    if (!messageText.trim() || isLoading) return;

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
    
    // Add user message to UI
    const newMessages = [...messages, { role: 'user', content: messageContent }];
    setMessages(newMessages);
    
    // Add to conversation history for context
    conversationHistory.current.push({ role: 'user', content: messageContent });
    
    setIsLoading(true);

    // Add a placeholder message for streaming
    const streamingMessageId = Date.now();
    setMessages(prev => [...prev, {
      id: streamingMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true
    }]);

    try {
      // Get workspace context if available - include file list AND content of key files
      let workspaceContext = '';
      if (workspaceFolder && window.electronAPI.workspace) {
        try {
          const fileList = await window.electronAPI.workspace.listFiles(workspaceFolder);
          if (fileList.success && fileList.files.length > 0) {
            workspaceContext = `\n\n[WORKSPACE CONTEXT - Current project files:\n${fileList.files.map(f => `- ${f.relativePath}`).join('\n')}\n`;
            
            // Read content of key files for better context
            const keyFiles = [
              'package.json',
              'tsconfig.json',
              'vite.config.js',
              'vite.config.ts',
              'next.config.js',
              'next.config.mjs',
              'tailwind.config.js',
              'tailwind.config.ts',
              '.env',
              '.env.example',
              'README.md',
              'src/main.jsx',
              'src/main.tsx',
              'src/App.jsx',
              'src/App.tsx',
              'src/index.jsx',
              'src/index.tsx'
            ];
            
            for (const keyFile of keyFiles) {
              const filePath = `${workspaceFolder}/${keyFile}`;
              try {
                const fileResult = await window.electronAPI.fs.readFile(filePath);
                if (fileResult.success && fileResult.content) {
                  workspaceContext += `\n\n--- ${keyFile} ---\n${fileResult.content}\n`;
                }
              } catch (err) {
                // File doesn't exist or can't be read, skip it
              }
            }
            
            workspaceContext += `\n\nUse this context to understand the project structure and dependencies.]\n`;
          }
        } catch (err) {
          debug('Workspace context unavailable:', err);
        }
      }

      // Get terminal output context if available
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
              terminalContext = `\n\n[TERMINAL OUTPUT - Recent terminal activity:\n${cleanOutput}\n\nUse this to understand what commands have been run and their results.]\n`;
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
        20000
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

        if (workspaceFolder) {
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
      } else {
        throw new Error(response && response.error ? response.error : 'ClaudeService failed');
      }
    } catch (error) {
      console.error('AI Error:', error);
      setError(error.message);
      setMessages(prev => prev.filter(msg => msg.id !== streamingMessageId));
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ **Error:** ${error.message}\n\nPlease check:\n1. Your OpenAI API key is correctly set in .env\n2. You have API credits available\n3. Your internet connection is working\n\nTry asking your question again!`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Expose sendMessage method to parent via ref
  useImperativeHandle(ref, () => ({
    sendMessage: (messageText) => {
      sendMessage(messageText, []);
    }
  }));

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const messageText = input.trim();
    const imgs = [...attachedImages];
    
    // Clear input and images
    setInput('');
    setAttachedImages([]);
    
    // Send the message
    await sendMessage(messageText, imgs);
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
    // Updated regex to capture filename= attribute
    const codeBlockRegex = /```(\w+)?(?:\s+filename=([^\s\n]+))?\s*\n([\s\S]*?)```/g;
    const blocks = [];
    let match;

    debug('🔍 Extracting code blocks from content length:', content.length);
    debug('📝 Content preview:', content.substring(0, 200));

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const filename = match[2] || null; // Extract filename if present
      const code = match[3].trim();
      
      debug('✅ Found code block:', language, 'filename:', filename, 'length:', code.length);
      
      blocks.push({
        language: language,
        filename: filename,
        code: code
      });
    }

    debug('📦 extractCodeBlocks found:', blocks.length, 'blocks');
    if (blocks.length === 0) {
      debug('⚠️ No code blocks found. Content sample:', content.substring(0, 500));
    }
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

    for (const command of commands) {
      const commandId = Date.now() + Math.random();
      
      // Add a notification message with pending status
      setMessages(prev => [
        ...prev,
        {
          id: commandId,
          role: 'system',
          content: `⚡ Executing command in terminal:\n\`\`\`bash\n${command}\n\`\`\``,
          commandStatus: 'running'
        }
      ]);

      try {
        // Write the command to the terminal (visible execution)
        await window.electronAPI.terminalWrite(terminalId, command + '\r');
        
        // Also execute in background to get the result status
        const result = await window.electronAPI.terminalExecute(command, workspaceFolder);
        
        // Write colored status indicator to the terminal
        if (result.success) {
          // Blue dot for success (ANSI escape codes)
          await window.electronAPI.terminalWrite(terminalId, '\r\n\x1b[34m●\x1b[0m Command completed successfully\r\n');
        } else {
          // Red dot for failure
          await window.electronAPI.terminalWrite(terminalId, '\r\n\x1b[31m●\x1b[0m Command failed: ' + (result.error || result.stderr || 'Unknown error') + '\r\n');
        }
        
        // Update message with success/failure indicator
        setMessages(prev => prev.map(msg => {
          if (msg.id === commandId) {
            if (result.success) {
              return {
                ...msg,
                content: `🔵 Command completed successfully:\n\`\`\`bash\n${command}\n\`\`\``,
                commandStatus: 'success'
              };
            } else {
              return {
                ...msg,
                content: `🔴 Command failed:\n\`\`\`bash\n${command}\n\`\`\`\n\nError: ${result.error || result.stderr || 'Unknown error'}`,
                commandStatus: 'failed',
                isError: true
              };
            }
          }
          return msg;
        }));
        
        // If command failed, notify the AI to fix it
        if (!result.success) {
          debug('❌ Command failed, asking AI to fix it with full context...');
          
          // Get workspace context for better error analysis - include file contents
          let workspaceContext = '';
          if (workspaceFolder && window.electronAPI.workspace) {
            try {
              const scanResult = await window.electronAPI.workspace.scan(workspaceFolder);
              if (scanResult.success) {
                const fileList = scanResult.files.slice(0, 50).map(f => f.path).join('\n');
                workspaceContext = `\n\nCurrent Workspace Structure:\n${fileList}${scanResult.files.length > 50 ? '\n... and more files' : ''}`;
                
                // Read content of key files for better context
                const keyFiles = [
                  'package.json',
                  'tsconfig.json',
                  'vite.config.js',
                  'vite.config.ts',
                  'next.config.js',
                  'next.config.mjs',
                  'tailwind.config.js',
                  'tailwind.config.ts',
                  '.env',
                  '.env.example',
                  'src/main.jsx',
                  'src/main.tsx',
                  'src/App.jsx',
                  'src/App.tsx',
                  'src/index.jsx',
                  'src/index.tsx'
                ];
                
                for (const keyFile of keyFiles) {
                  const filePath = `${workspaceFolder}/${keyFile}`;
                  try {
                    const fileResult = await window.electronAPI.fs.readFile(filePath);
                    if (fileResult.success && fileResult.content) {
                      workspaceContext += `\n\n--- ${keyFile} ---\n${fileResult.content}\n`;
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

          // Get terminal output context
          let terminalOutputContext = '';
          try {
            const terminalElements = document.querySelectorAll('[data-terminal-id]');
            if (terminalElements.length > 0) {
              const terminalId = terminalElements[0].getAttribute('data-terminal-id');
              if (terminalId) {
                const outputResult = await window.electronAPI.terminal.getOutput(terminalId);
                if (outputResult.success && outputResult.output) {
                  const cleanOutput = outputResult.output.replace(/\x1b\[[0-9;]*m/g, '');
                  terminalOutputContext = `\n\nRecent terminal output:\n\`\`\`\n${cleanOutput.slice(-2000)}\n\`\`\``;
                }
              }
            }
          } catch (err) {
            debug('Could not get terminal context:', err);
          }
          
          // Build comprehensive error message with context
          const errorMessage = {
            role: 'user',
            content: `🔴 COMMAND FAILED - FIX IT IMMEDIATELY

You are autonomous - you don't ask for permission. FIX THIS NOW.

Command that failed:
\`\`\`bash
${command}
\`\`\`

Error output:
\`\`\`
${result.error || result.stderr || 'Unknown error'}
\`\`\`

Standard output (if any):
\`\`\`
${result.stdout || 'No output'}
\`\`\`
${workspaceContext}
${terminalOutputContext}

Working directory: ${workspaceFolder || 'Not set'}

IMMEDIATE ACTION REQUIRED:
1. Analyze what caused this error
2. Provide the COMPLETE FIX with all necessary files and corrected commands
3. DO NOT ask me to do anything - provide the solution immediately
4. Include all files that need to be created/modified with filename= attribute
5. Include all commands that need to run in bash code blocks

I will automatically execute everything you provide. Just give me the fix NOW.`
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
            const fixResponse = await ClaudeService.getClaudeCompletion(errorMessage.content, 20000);
            
            console.log('🤖 Fix response received:', fixResponse?.success);
            
            if (fixResponse && fixResponse.success) {
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
              throw new Error(fixResponse && fixResponse.error ? fixResponse.error : 'Claude fix failed');
            }
          } catch (fixError) {
            console.error('❌ Error getting AI fix:', fixError);
            
            // Show error message to user
            setMessages(prev => {
              const filtered = prev.filter(msg => msg.id !== fixMessageId);
              return [
                ...filtered,
                {
                  id: Date.now(),
                  role: 'assistant',
                  content: `❌ **Error getting fix from AI:** ${fixError.message}\n\nPlease try asking me to fix this issue manually.`
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
        setMessages(prev => prev.map(msg => {
          if (msg.id === commandId) {
            return {
              ...msg,
              content: `🔴 Failed to execute command:\n\`\`\`bash\n${command}\n\`\`\`\n\nError: ${error.message}`,
              commandStatus: 'failed',
              isError: true
            };
          }
          return msg;
        }));
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
    debug('📁 handleCreateFilesAutomatically called');
    debug('📂 Workspace folder:', workspaceFolder);
    
    if (!workspaceFolder) {
      debug('⚠️ No workspace folder - skipping file creation');
      return; // Silently fail if no workspace
    }

    const codeBlocks = extractCodeBlocks(messageContent);
    
    debug('📦 Code blocks extracted:', codeBlocks.length);
    
    // Filter out command blocks (bash, sh, shell) - those are for execution, not file creation
    const fileBlocks = codeBlocks.filter(block => {
      const lang = block.language.toLowerCase();
      return !['bash', 'sh', 'shell', 'zsh', 'fish', 'powershell', 'cmd'].includes(lang);
    });
    
    debug('📄 File blocks (after filtering commands):', fileBlocks.length);
    
    if (fileBlocks.length === 0) {
      debug('⚠️ No file code blocks found - skipping file creation');
      return; // No code blocks for files, nothing to do
    }

    debug('✨ Starting automatic file creation for', fileBlocks.length, 'code blocks');
    
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
        // Use filename from the code block if provided, otherwise generate smart filename
        let fileName = block.filename || generateSmartFilename(block.code, block.language);
        
        debug('📝 Using filename:', fileName, block.filename ? '(from AI)' : '(generated)');
        
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
            
            // Mark as created
            setCodeBlockStates(prev => ({
              ...prev,
              [blockId]: { status: 'created', filename: fileName }
            }));
            
            // Trigger callback for EACH file to refresh explorer
            if (onFileCreated) {
              console.log('🔄 Calling onFileCreated callback for:', fileName);
              onFileCreated(filePath);
            } else {
              console.log('⚠️ No onFileCreated callback available');
            }
            
            // Add small delay between file operations to ensure filesystem sync
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            console.error('❌ Failed to write file:', writeResult.error);
            
            // Mark as failed
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
    
    // Final refresh to ensure all files are visible in explorer
    if (createdCount > 0 && onFileCreated) {
      console.log('🔄 Final explorer refresh after creating', createdCount, 'files');
      // Trigger one more refresh after all files are created
      await new Promise(resolve => setTimeout(resolve, 200));
      // Open the last created file to trigger final refresh
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
          <h3>AI Assistant</h3>
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
        {messages.map((msg, idx) => {
          const codeBlocks = extractCodeBlocks(msg.content);
          const hasCode = codeBlocks.length > 0;
          
          // Determine message class based on state
          let messageClass = `ai-message ${msg.role}`;
          if (msg.isStreaming) messageClass += ' streaming';
          if (msg.isExecuting) messageClass += ' executing';
          if (msg.isError) messageClass += ' error';
          
          return (
            <div 
              key={idx} 
              className={messageClass}
              data-command-status={msg.commandStatus || ''}
              data-scanning={msg.isScanning ? 'true' : 'false'}
            >
              <div className="message-content">
                {(() => {
                  let fileBlockIndex = 0; // Track file blocks separately
                  return msg.content.split('```').map((part, i) => {
                    if (i % 2 === 1) {
                      // Extract language from first line if present
                      const lines = part.split('\n');
                      const language = lines[0].trim();
                      const code = lines.slice(1).join('\n');
                      
                      // Skip command blocks (bash, sh, shell, etc)
                      const isCommand = ['bash', 'sh', 'shell', 'zsh', 'fish', 'powershell', 'cmd'].includes(language.toLowerCase());
                      
                      // Only file code blocks get tracked
                      const blockId = isCommand ? null : `${msg.id}-block-${fileBlockIndex}`;
                      if (!isCommand) fileBlockIndex++; // Increment only for file blocks
                      
                      const blockState = blockId ? codeBlockStates[blockId] : null;
                      const blockStatus = blockState?.status;
                      const fileName = blockState?.filename;
                      const isExpanded = blockId ? expandedBlocks[blockId] : false;
                      
                      const toggleExpand = () => {
                        if (blockId) {
                          setExpandedBlocks(prev => ({
                            ...prev,
                            [blockId]: !prev[blockId]
                          }));
                        }
                      };
                      
                      // Show status for file blocks, always expanded for command blocks
                      if (isCommand || isExpanded) {
                      return (
                        <div key={i} className="code-block-container">
                          <div className="code-block-header" onClick={!isCommand ? toggleExpand : undefined} style={{ cursor: !isCommand ? 'pointer' : 'default' }}>
                            <div className="code-header-left">
                              <span className="code-language">{language || 'code'}</span>
                              {!isCommand && fileName && (
                                <span className="code-filename">{fileName}</span>
                              )}
                            </div>
                            <div className="code-header-right">
                              {!isCommand && blockStatus === 'creating' && (
                                <span className="code-status creating">
                                  <FiLoader className="spinning" size={12} />
                                  Creating...
                                </span>
                              )}
                              {!isCommand && blockStatus === 'created' && (
                                <span className="code-status created">
                                  <FiCheck size={12} />
                                  Created
                                </span>
                              )}
                              {!isCommand && blockStatus === 'failed' && (
                                <span className="code-status failed">
                                  Failed
                                </span>
                              )}
                              {!isCommand && (
                                <span className="code-expand-icon">▼</span>
                              )}
                            </div>
                          </div>
                          <pre className="code-block">
                            <code>{code || part}</code>
                          </pre>
                        </div>
                      );
                    } else {
                      // Collapsed state
                      return (
                        <div key={i} className="code-block-container collapsed">
                          <div className="code-block-header" onClick={toggleExpand}>
                            <div className="code-header-left">
                              <span className="code-language">{language || 'code'}</span>
                              {fileName && (
                                <span className="code-filename">{fileName}</span>
                              )}
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
                              {!blockStatus && (
                                <span className="code-status">
                                  <FiEye size={12} />
                                  Click to view
                                </span>
                              )}
                              <span className="code-expand-icon">▶</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  }
                  // Render text content with basic markdown support
                  return part.split('\n').map((line, j) => {
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
                    
                    // Handle bold text
                    let content = line;
                    const boldRegex = /\*\*(.+?)\*\*/g;
                    const parts = [];
                    let lastIndex = 0;
                    let match;
                    
                    while ((match = boldRegex.exec(content)) !== null) {
                      if (match.index > lastIndex) {
                        parts.push(content.substring(lastIndex, match.index));
                      }
                      parts.push(<strong key={`bold-${j}-${match.index}`}>{match[1]}</strong>);
                      lastIndex = match.index + match[0].length;
                    }
                    
                    if (lastIndex < content.length) {
                      parts.push(content.substring(lastIndex));
                    }
                    
                    return <p key={`${i}-${j}`}>{parts.length > 0 ? parts : line}</p>;
                  });
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
        <div>
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
