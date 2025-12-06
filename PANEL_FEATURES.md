# Panel Features Documentation

## Overview
This document demonstrates the new panel features implemented in Eletr0 Studio.

## 1. Output Panel

The Output panel captures and displays logs from various sources:

### Features:
- **Multi-channel support**: Separate channels for different output sources (Tasks, Extensions, etc.)
- **Auto-scroll**: Automatically scrolls to show latest output
- **Filterable**: Select specific channels to view
- **Clearable**: Clear output with one click
- **Timestamped**: All logs include timestamps
- **Color-coded**: Different colors for info, warning, error, and success messages

### Usage:
```javascript
// Log to output channel
window.electronAPI.output.log('Tasks', 'Build started...', 'info');
window.electronAPI.output.log('Tasks', 'Warning: Deprecated API used', 'warning');
window.electronAPI.output.log('Tasks', 'Build failed!', 'error');
window.electronAPI.output.log('Tasks', 'Build succeeded!', 'success');

// Clear output
window.electronAPI.output.clear('Tasks'); // Clear specific channel
window.electronAPI.output.clear(); // Clear all channels
```

### Process Runner:
```javascript
// Run a command and capture output
const result = await window.electronAPI.process.run('npm install', '/path/to/project');
// Output will automatically appear in the Output panel under "Tasks" channel
```

## 2. Problems Panel

The Problems panel displays diagnostics, errors, and warnings detected in your code:

### Features:
- **Severity filtering**: Filter by error, warning, or info
- **Group by file**: Organize problems by file or show all together
- **Click to navigate**: Click a problem to jump to the location (TODO: implement navigation)
- **Real-time analysis**: Problems are detected as you type
- **Multiple sources**: Supports different linters and analyzers (eslint, pylint, etc.)
- **Statistics**: Shows count of each problem type

### Detected Issues:
- **JavaScript/TypeScript**:
  - console.log statements (warning)
  - debugger statements (warning)
  - var declarations (warning - use let/const)
  - TODO/FIXME comments (info)

- **Python**:
  - print statements (info)

- **CSS**:
  - !important usage (warning)

### Usage:
```javascript
// Analyze a file
const result = await window.electronAPI.diagnostics.analyze('/path/to/file.js');
console.log(result.diagnostics);

// Clear diagnostics
window.electronAPI.diagnostics.clear('/path/to/file.js');
```

### Example Output:
```
❌ 2 errors
⚠️  5 warnings  
ℹ️  3 info messages
```

## 3. Debug Console

The Debug Console provides an interactive environment for evaluating expressions:

### Features:
- **Expression evaluation**: Run JavaScript expressions in the main process context
- **Command history**: Use ↑/↓ arrows to navigate command history
- **Auto-scroll**: Automatically shows latest output
- **Type detection**: Shows the type of evaluated expressions
- **Error handling**: Safely catches and displays errors
- **Context access**: Access to Node.js APIs (process, require, etc.)

### Usage Examples:
```javascript
// Simple math
> 2 + 2
4 (number)

// String manipulation
> "Hello " + "World"
"Hello World" (string)

// Object inspection
> {name: "test", value: 42}
{
  "name": "test",
  "value": 42
} (object)

// Process information
> process.platform
"darwin" (string)

// JSON operations
> JSON.stringify({name: "test"}, null, 2)
{
  "name": "test"
} (string)
```

### Keyboard Shortcuts:
- **↑**: Previous command in history
- **↓**: Next command in history
- **Enter**: Execute current command

## 4. Terminal Panel (Already Working)

The Terminal panel provides full terminal emulation:

### Features:
- **Multiple terminals**: Create and manage multiple terminal instances
- **Full PTY support**: Real shell integration with node-pty
- **Resizable**: Automatically adjusts to panel size
- **Tab management**: Switch between terminals with tabs
- **Working directory**: Starts in workspace folder

## Integration

All panels are now fully integrated into the main application:

### State Management:
- `outputLogs`: Array of output messages
- `diagnostics`: Array of detected problems
- `debugLogs`: Array of debug console messages

### IPC Communication:
- Output messages stream in real-time via IPC
- Diagnostics are analyzed when files change
- Debug evaluations run in main process for security

## Testing the Features

### Test Output Panel:
1. Open the Output panel (bottom panel, "Output" tab)
2. Open the browser DevTools Console (Cmd+Option+I)
3. Run: `window.electronAPI.output.log('Test', 'Hello from output!', 'info')`
4. See the message appear in the Output panel

### Test Problems Panel:
1. Create a new JavaScript file
2. Add: `console.log("test");` and `var x = 10;`
3. Save the file
4. Open Problems panel - you'll see warnings

### Test Debug Console:
1. Open Debug Console panel (bottom panel, "Debug Console" tab)
2. Type: `2 + 2` and press Enter
3. Try: `process.platform`
4. Try: `JSON.stringify({test: true}, null, 2)`

## Future Enhancements

- [ ] Click to navigate from Problems panel to code location
- [ ] More sophisticated code analysis (TypeScript, ESLint integration)
- [ ] Debug breakpoint support
- [ ] Variable inspection in Debug Console
- [ ] Output panel search functionality
- [ ] Export logs functionality
- [ ] Custom problem matchers for build tools
