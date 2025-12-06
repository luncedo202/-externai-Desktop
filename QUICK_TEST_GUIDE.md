# Quick Panel Test Guide

## Testing Output Panel

### Method 1: Using Browser Console
1. Launch the app
2. Press `Cmd+Option+I` (macOS) to open DevTools
3. Go to Console tab
4. Run these commands:

```javascript
// Test different log types
window.electronAPI.output.log('Test', 'Info message', 'info');
window.electronAPI.output.log('Test', 'Warning message', 'warning');
window.electronAPI.output.log('Test', 'Error message', 'error');
window.electronAPI.output.log('Test', 'Success message', 'success');

// Test different channels
window.electronAPI.output.log('Build', 'Building project...', 'info');
window.electronAPI.output.log('Extensions', 'Extension loaded', 'info');
```

### Method 2: Using Process Runner
```javascript
// Run a command and see output
window.electronAPI.process.run('echo "Hello from process!"', '/Users/sonelisepakade/eletr0');
window.electronAPI.process.run('ls -la', '/Users/sonelisepakade/eletr0');
```

## Testing Problems Panel

### Method 1: Open Test File
1. In the app, use File > Open File (or Cmd+O)
2. Select `/Users/sonelisepakade/eletr0/test-diagnostics.js`
3. The file will open in the editor
4. Click the "Problems" tab in the bottom panel
5. You should see multiple warnings and info messages

### Method 2: Create New File with Issues
1. Create a new file (Cmd+N)
2. Add this code:
```javascript
console.log("test");
var x = 10;
debugger;
// TODO: test todo
```
3. Save the file (Cmd+S)
4. Check the Problems panel

## Testing Debug Console

1. Click the "Debug Console" tab in the bottom panel
2. Try these expressions:

### Basic Math
```
2 + 2
10 * 5
Math.sqrt(16)
```

### String Operations
```
"Hello " + "World"
"test".toUpperCase()
```

### Objects
```
{name: "test", value: 42}
JSON.stringify({a: 1, b: 2}, null, 2)
```

### Node.js APIs
```
process.platform
process.version
process.cwd()
__dirname
```

### Array Operations
```
[1, 2, 3, 4, 5].map(x => x * 2)
[1, 2, 3].reduce((a, b) => a + b)
```

## Panel Features to Test

### Output Panel
- ✅ Switch between channels using dropdown
- ✅ Auto-scroll toggle (⬇ button)
- ✅ Clear output (🗑 button)
- ✅ Color-coded messages
- ✅ Timestamps

### Problems Panel
- ✅ Filter by severity (All, Errors, Warnings, Info)
- ✅ Group by file toggle (📁 button)
- ✅ Clear problems (🗑 button)
- ✅ Problem counts
- ✅ Click on problems (navigation coming soon)

### Debug Console
- ✅ Expression evaluation
- ✅ Command history (↑/↓ arrows)
- ✅ Error handling
- ✅ Type information
- ✅ Auto-scroll
- ✅ Clear console (🗑 button)

## Expected Results

### Test Diagnostics File Should Show:
- 4 console.log warnings
- 2 var usage warnings  
- 1 debugger warning
- 2 TODO info messages

Total: 7 warnings, 2 info messages

### Debug Console Should:
- Evaluate expressions correctly
- Show result type
- Handle errors gracefully
- Maintain command history

### Output Panel Should:
- Show all logged messages
- Filter by channel
- Auto-scroll to latest
- Display timestamps

## Troubleshooting

If panels don't work:
1. Check browser console for errors
2. Ensure app is fully loaded
3. Try restarting the app
4. Check that `window.electronAPI` is available

## Next Steps

After testing, try:
1. Run real build commands: `window.electronAPI.process.run('npm install', cwd)`
2. Analyze real project files
3. Use Debug Console for quick calculations
4. Monitor output from terminal commands
