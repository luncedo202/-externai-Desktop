import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import './Terminal.css';

/**
 * Terminal Component - A VS Code-style terminal using child_process
 * 
 * This terminal executes commands via IPC to the main process which uses
 * child_process.exec/spawn for command execution. It maintains a shell-like
 * interface with history navigation and command output display.
 */
const Terminal = forwardRef(({ 
  workspaceFolder, 
  onOutput,
  onStatusChange,
  terminalId 
}, ref) => {
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentInput, setCurrentInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [outputLines, setOutputLines] = useState([
    { type: 'info', content: 'Terminal ready. Type commands and press Enter.' }
  ]);
  
  const inputRef = useRef(null);
  const outputRef = useRef(null);
  const currentDir = useRef(workspaceFolder || '~');

  // Scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputLines]);

  // Focus input when terminal becomes visible
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Update current directory when workspace changes
  useEffect(() => {
    if (workspaceFolder) {
      currentDir.current = workspaceFolder;
    }
  }, [workspaceFolder]);

  // Get the prompt string
  const getPrompt = useCallback(() => {
    const dir = currentDir.current;
    const shortDir = dir.replace(/^\/Users\/[^/]+/, '~');
    return `${shortDir} $ `;
  }, []);

  // Handle command execution
  const executeCommand = useCallback(async (command) => {
    if (!command.trim()) return;

    const trimmedCommand = command.trim();
    
    // Add command to history
    setCommandHistory(prev => {
      const newHistory = [...prev.filter(c => c !== trimmedCommand), trimmedCommand];
      return newHistory.slice(-50); // Keep last 50 commands
    });
    setHistoryIndex(-1);

    // Show the command in output
    setOutputLines(prev => [...prev, {
      type: 'command',
      content: `${getPrompt()}${trimmedCommand}`
    }]);

    // Handle built-in commands
    if (trimmedCommand === 'clear' || trimmedCommand === 'cls') {
      setOutputLines([]);
      setCurrentInput('');
      return;
    }

    // Handle cd command
    if (trimmedCommand.startsWith('cd ')) {
      const newPath = trimmedCommand.slice(3).trim();
      let resolvedPath = newPath;
      
      if (newPath === '~') {
        // Let the main process resolve home directory
        resolvedPath = '~';
      } else if (newPath === '-') {
        // Go to previous directory (simplified - just stay)
        resolvedPath = currentDir.current;
      } else if (!newPath.startsWith('/')) {
        // Relative path
        resolvedPath = `${currentDir.current}/${newPath}`;
      }

      // Verify path exists via IPC
      try {
        const result = await window.electronAPI.terminal.runCommand(
          `cd "${resolvedPath}" && pwd`,
          currentDir.current
        );
        if (result.success) {
          currentDir.current = result.stdout.trim();
          setOutputLines(prev => [...prev, {
            type: 'output',
            content: `Changed to: ${currentDir.current}`
          }]);
        } else {
          setOutputLines(prev => [...prev, {
            type: 'error',
            content: `cd: no such file or directory: ${newPath}`
          }]);
        }
      } catch (err) {
        setOutputLines(prev => [...prev, {
          type: 'error',
          content: `cd: ${err.message}`
        }]);
      }
      setCurrentInput('');
      return;
    }

    // Execute command via IPC
    setIsExecuting(true);
    if (onStatusChange) {
      onStatusChange('running');
    }

    try {
      const result = await window.electronAPI.terminal.runCommand(
        trimmedCommand,
        currentDir.current
      );

      // Process output
      const output = result.stdout || '';
      const errorOutput = result.stderr || '';

      // Add stdout lines
      if (output) {
        const lines = output.split('\n');
        setOutputLines(prev => [
          ...prev,
          ...lines.map(line => ({ type: 'output', content: line }))
        ]);
      }

      // Add stderr lines (could be warnings, not necessarily errors)
      if (errorOutput) {
        const lines = errorOutput.split('\n');
        setOutputLines(prev => [
          ...prev,
          ...lines.map(line => ({ 
            type: result.success ? 'warning' : 'error', 
            content: line 
          }))
        ]);
      }

      // Notify parent of output
      if (onOutput) {
        onOutput(output + (errorOutput ? '\n' + errorOutput : ''));
      }

      // Update status
      if (onStatusChange) {
        onStatusChange(result.success ? 'success' : 'error');
      }

    } catch (error) {
      setOutputLines(prev => [...prev, {
        type: 'error',
        content: `Error: ${error.message}`
      }]);
      
      if (onStatusChange) {
        onStatusChange('error');
      }
    } finally {
      setIsExecuting(false);
      setCurrentInput('');
    }
  }, [getPrompt, onOutput, onStatusChange]);

  // Handle key presses
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !isExecuting) {
      executeCommand(currentInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 
          ? historyIndex + 1 
          : historyIndex;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentInput('');
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      // Ctrl+C - cancel current input
      if (!isExecuting) {
        setOutputLines(prev => [...prev, {
          type: 'command',
          content: `${getPrompt()}${currentInput}^C`
        }]);
        setCurrentInput('');
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      // Ctrl+L - clear screen
      e.preventDefault();
      setOutputLines([]);
    }
  }, [currentInput, commandHistory, historyIndex, isExecuting, executeCommand, getPrompt]);

  // Expose executeCommand to parent via ref
  useImperativeHandle(ref, () => ({
    executeCommand: (command) => {
      // Show the command as if user typed it
      setCurrentInput(command);
      // Execute it
      executeCommand(command);
    }
  }), [executeCommand]);

  // Focus input when clicking anywhere in terminal
  const handleTerminalClick = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="terminal" onClick={handleTerminalClick}>
      <div className="terminal-output" ref={outputRef}>
        {outputLines.map((line, index) => (
          <div 
            key={index} 
            className={`terminal-line ${line.type}`}
          >
            {line.content || '\u00A0'}
          </div>
        ))}
        
        {/* Current input line */}
        <div className="terminal-input-line">
          <span className="terminal-prompt">{getPrompt()}</span>
          <input
            ref={inputRef}
            type="text"
            className="terminal-input"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
          />
          {isExecuting && <span className="terminal-spinner">⠋</span>}
        </div>
      </div>
    </div>
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;
