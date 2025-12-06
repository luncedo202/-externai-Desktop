# Panel Features - Quick Reference Card

## 🎯 Quick Start

### Test Output Panel (10 seconds)
1. Open app
2. Press `Cmd+Option+I` (DevTools)
3. In Console: `window.electronAPI.output.log('Test', 'Hello!', 'info')`
4. Check Output tab ✅

### Test Problems Panel (10 seconds)
1. File > Open File
2. Select: `/Users/sonelisepakade/eletr0/test-diagnostics.js`
3. Click Problems tab
4. See 7 warnings + 2 info messages ✅

### Test Debug Console (10 seconds)
1. Click Debug Console tab
2. Type: `2 + 2`
3. Press Enter
4. See result: `4 (number)` ✅

---

## 📊 Output Panel

### What It Shows
Logs from builds, tasks, and commands

### Key Features
- 📺 Multi-channel support
- ⬇️ Auto-scroll toggle
- 🗑️ Clear output
- 🎨 Color-coded (info/warning/error/success)
- ⏰ Timestamps

### Quick Commands
```javascript
// Log message
window.electronAPI.output.log('Channel', 'Message', 'info');

// Run command with output
window.electronAPI.process.run('npm test', '/path');
```

### Message Types
- **Info**: White text
- **Warning**: Yellow text
- **Error**: Red text
- **Success**: Green text

---

## ⚠️ Problems Panel

### What It Shows
Code issues, warnings, and suggestions

### Key Features
- 🔍 Auto-analysis on save
- 🎯 Filter by severity
- 📁 Group by file
- 📊 Statistics counter
- 🗑️ Clear problems

### Detects
- `console.log()` → Warning
- `debugger` → Warning
- `var` → Warning (use let/const)
- `// TODO` → Info
- `// FIXME` → Info
- Python `print()` → Info
- CSS `!important` → Warning

### Filter Buttons
- **All**: Show everything
- **❌**: Errors only
- **⚠️**: Warnings only
- **ℹ️**: Info only

---

## 🐛 Debug Console

### What It Does
Interactive JavaScript expression evaluator

### Key Features
- ⌨️ REPL interface
- 📜 Command history (↑/↓)
- 🔒 Safe evaluation (1s timeout)
- 📊 Type information
- 🌐 Node.js API access

### Try These
```javascript
2 + 2                  // Math
"test".toUpperCase()   // Strings
{name: "test"}         // Objects
process.platform       // System info
[1,2,3].map(x => x*2) // Arrays
```

### Keyboard
- **Enter**: Execute
- **↑**: Previous command
- **↓**: Next command

---

## 📝 API Reference

### Output
```javascript
// Log
window.electronAPI.output.log(channel, message, type);

// Clear
window.electronAPI.output.clear(channel);

// Run command
window.electronAPI.process.run(cmd, cwd);
```

### Diagnostics
```javascript
// Analyze
window.electronAPI.diagnostics.analyze(filePath);

// Clear
window.electronAPI.diagnostics.clear(filePath);
```

### Debug
```javascript
// Evaluate
window.electronAPI.debug.evaluate(expression);

// Log
window.electronAPI.debug.log(message, level);
```

---

## 🎮 Common Tasks

### View Build Output
1. Switch to Output tab
2. Select "Tasks" channel
3. Run build command in terminal
4. See output in real-time

### Find Code Issues
1. Open any JS/TS/Python/CSS file
2. Save the file
3. Check Problems tab
4. Click issue to see details

### Quick Calculations
1. Open Debug Console
2. Type expression
3. Press Enter
4. See result with type

### Monitor Multiple Channels
1. Log to different channels
2. Use dropdown to switch
3. Each channel isolated
4. Clear individually

---

## 🔧 Troubleshooting

### Panel Not Showing
- Check you're on correct tab
- Toggle panel: `Cmd+`` (backtick)
- Restart app if needed

### No Output
- Check correct channel selected
- Try: `window.electronAPI.output.log('Test', 'Hi', 'info')`
- Open DevTools for errors

### No Problems
- Ensure file is saved
- Check file extension (.js, .py, .css)
- Try opening test-diagnostics.js

### Debug Not Working
- Check expression syntax
- Look for DevTools errors
- Remember: runs in main process

---

## 📚 Documentation Files

1. **PANEL_USAGE_GUIDE.md** - Complete usage guide
2. **QUICK_TEST_GUIDE.md** - Step-by-step tests
3. **PANEL_FEATURES.md** - Technical details
4. **IMPLEMENTATION_SUMMARY.md** - Architecture
5. **IMPLEMENTATION_CHECKLIST.md** - What's done

---

## ✅ Status

**All panels**: ✅ Fully functional
**App status**: ✅ Running successfully
**Errors**: ✅ None
**Ready to use**: ✅ Yes

**Quick test**: Open DevTools console and run:
```javascript
window.electronAPI.output.log('QuickTest', '🎉 All panels working!', 'success');
```

Then check the Output tab! 🚀
