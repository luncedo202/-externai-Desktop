# Panel Features Usage Guide

## Overview

Eletr0 Studio now includes three fully functional panels in addition to the Terminal:

1. **Output Panel** - View logs and command output
2. **Problems Panel** - See code issues and diagnostics
3. **Debug Console** - Evaluate expressions interactively

## Panel Access

All panels are located in the bottom panel area. Click the tabs to switch between them:
- **Terminal** - Full terminal emulation (already working)
- **Output** - Log viewer
- **Problems** - Code diagnostics
- **Debug Console** - Expression evaluator

## 1. Output Panel

### What It Does
Captures and displays output from various sources like build processes, tasks, and commands.

### How to Use

#### View Output
1. Click the "Output" tab in the bottom panel
2. Select a channel from the dropdown (e.g., "Tasks", "Build", "Extensions")
3. Output will appear in real-time

#### Log Messages Programmatically
Open DevTools (Cmd+Option+I) and run:

```javascript
// Simple log
window.electronAPI.output.log('MyApp', 'Application started', 'info');

// Warning message
window.electronAPI.output.log('MyApp', 'Warning: Low memory', 'warning');

// Error message
window.electronAPI.output.log('MyApp', 'Error: Connection failed', 'error');

// Success message
window.electronAPI.output.log('MyApp', 'Build completed successfully', 'success');
```

#### Run Commands with Output Capture
```javascript
// Run a shell command
const result = await window.electronAPI.process.run('npm install', '/path/to/project');

// Run multiple commands
await window.electronAPI.process.run('ls -la', '/Users/sonelisepakade/eletr0');
await window.electronAPI.process.run('echo "Hello World"', process.cwd());
```

#### Controls
- **Channel Dropdown**: Filter output by source
- **⬇ Button**: Toggle auto-scroll
- **🗑 Button**: Clear current channel output

### Message Types
- **Info** (white): General information
- **Warning** (yellow): Warnings and alerts
- **Error** (red): Errors and failures
- **Success** (green): Successful operations

## 2. Problems Panel

### What It Does
Automatically detects and displays code issues, warnings, and suggestions.

### How to Use

#### View Problems
1. Open any code file in the editor
2. The Problems panel automatically analyzes the file
3. Click the "Problems" tab to see detected issues

#### Detected Issues

**JavaScript/TypeScript**:
- Console statements (`console.log`)
- Debugger statements
- `var` declarations (suggests `let`/`const`)
- TODO/FIXME comments

**Python**:
- Print statements

**CSS**:
- `!important` usage

#### Test It
1. Open the test file: `/Users/sonelisepakade/eletr0/test-diagnostics.js`
2. The Problems panel will show:
   - 4 console.log warnings
   - 2 var usage warnings
   - 1 debugger warning
   - 2 TODO info messages

#### Filter Problems
Click the filter buttons:
- **All**: Show all problems
- **❌ N**: Show only errors
- **⚠️ N**: Show only warnings
- **ℹ️ N**: Show only info messages

#### Controls
- **Severity Filters**: Filter by error/warning/info
- **📁 Button**: Group problems by file
- **🗑 Button**: Clear all problems

#### Problem Details
Each problem shows:
- Icon indicating severity
- Error/warning message
- File name (if grouped)
- Line and column number
- Source (eslint, pylint, etc.)

## 3. Debug Console

### What It Does
Provides an interactive REPL for evaluating JavaScript expressions in the main process.

### How to Use

#### Basic Usage
1. Click the "Debug Console" tab
2. Type an expression in the input field
3. Press Enter to evaluate

#### Example Expressions

**Math Operations**:
```javascript
2 + 2
Math.sqrt(144)
Math.random() * 100
```

**String Operations**:
```javascript
"Hello " + "World"
"test".toUpperCase()
"hello".split("").reverse().join("")
```

**Objects and Arrays**:
```javascript
{name: "John", age: 30}
[1, 2, 3, 4, 5].map(x => x * 2)
[1, 2, 3].reduce((a, b) => a + b)
```

**JSON Operations**:
```javascript
JSON.stringify({name: "test", value: 42}, null, 2)
JSON.parse('{"key": "value"}')
```

**Node.js Process Info**:
```javascript
process.platform
process.version
process.arch
process.cwd()
__dirname
```

**System Information**:
```javascript
process.env.USER
process.env.HOME
process.memoryUsage()
```

#### Command History
- Press **↑** to go to previous command
- Press **↓** to go to next command
- History persists during session

#### Controls
- **🗑 Button**: Clear console output

#### Result Display
Results show:
- The evaluated value
- Type information in parentheses
- Formatted JSON for objects

#### Error Handling
If an expression fails, you'll see:
```
Error: <error message>
```

## Integration Examples

### Example 1: Build Process with Output
```javascript
// Start a build
window.electronAPI.output.log('Build', '🔨 Starting build...', 'info');

// Run build command
const result = await window.electronAPI.process.run('npm run build', '/path/to/project');

if (result.success) {
  window.electronAPI.output.log('Build', '✅ Build succeeded!', 'success');
} else {
  window.electronAPI.output.log('Build', '❌ Build failed!', 'error');
}
```

### Example 2: File Analysis Workflow
```javascript
// Open a file in the editor
// The file is automatically analyzed
// Problems appear in the Problems panel

// You can also manually analyze:
const result = await window.electronAPI.diagnostics.analyze('/path/to/file.js');
console.log(result.diagnostics);
```

### Example 3: Debug Workflow
```javascript
// In Debug Console:

// Check if a value exists
> typeof myVariable
'undefined'

// Test a calculation
> 42 * 365
15330

// Inspect an object
> {id: 1, name: "test", active: true}
{
  "id": 1,
  "name": "test",
  "active": true
}
```

## Tips and Tricks

### Output Panel
- Use different channels for different purposes (Build, Test, Deploy)
- Keep auto-scroll on to see latest logs
- Clear output before starting new tasks

### Problems Panel
- Group by file when working on multiple files
- Use severity filters to focus on errors first
- TODO comments become info messages - use them for task tracking

### Debug Console
- Great for quick calculations
- Test expressions before adding to code
- Inspect process/system information
- Use command history to repeat tests

## Keyboard Shortcuts

### Debug Console
- **Enter**: Execute expression
- **↑**: Previous command
- **↓**: Next command

### General
- **Cmd+`** (backtick): Toggle panel visibility
- **Cmd+Option+I**: Open DevTools (for advanced testing)

## Troubleshooting

### Output Not Showing
1. Make sure you're on the "Output" tab
2. Check the channel dropdown - logs might be in a different channel
3. Try: `window.electronAPI.output.log('Test', 'Hello', 'info')`

### Problems Not Detected
1. Ensure the file is saved
2. Check that file extension is supported (.js, .jsx, .ts, .tsx, .py, .css)
3. Try opening `test-diagnostics.js` to verify functionality

### Debug Console Not Working
1. Make sure you're typing valid JavaScript
2. Check DevTools console for errors
3. Remember: expressions run in main process, not renderer

### General Issues
- Restart the app
- Check that `window.electronAPI` is defined
- Look for errors in DevTools console

## API Reference

### Output API
```javascript
// Log a message
window.electronAPI.output.log(channel, message, type);
// channel: string - "Tasks", "Build", etc.
// message: string - The log message
// type: 'info' | 'warning' | 'error' | 'success'

// Clear output
window.electronAPI.output.clear(channel);
// channel: string | undefined - specific channel or all

// Get logs
const result = await window.electronAPI.output.get(channel);
```

### Process API
```javascript
// Run command
const result = await window.electronAPI.process.run(command, cwd);
// command: string - Shell command to run
// cwd: string - Working directory
// Returns: { success, code, stdout, stderr, processId }
```

### Diagnostics API
```javascript
// Analyze file
const result = await window.electronAPI.diagnostics.analyze(filePath);
// filePath: string - Absolute path to file
// Returns: { diagnostics: [...] }

// Clear diagnostics
await window.electronAPI.diagnostics.clear(filePath);
```

### Debug API
```javascript
// Evaluate expression
const result = await window.electronAPI.debug.evaluate(expression);
// expression: string - JavaScript expression
// Returns: { success, result, error, type }

// Log to debug console
await window.electronAPI.debug.log(message, level);
// message: string - Message to log
// level: 'log' | 'error' | 'warning'
```

## Next Steps

1. Try the examples in this guide
2. Read `QUICK_TEST_GUIDE.md` for step-by-step testing
3. Check `PANEL_FEATURES.md` for technical details
4. Explore `IMPLEMENTATION_SUMMARY.md` for architecture info

## Support

For issues or questions:
1. Check the DevTools console for errors
2. Review the documentation files
3. Ensure all dependencies are installed
4. Try restarting the application

---

**Status**: ✅ All panels fully functional and ready to use!
