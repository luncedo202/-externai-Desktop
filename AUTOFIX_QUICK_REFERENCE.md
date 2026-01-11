# Auto-Fix Quick Reference

## Error Type Detection

| Error Pattern | Type | Common Causes |
|--------------|------|---------------|
| `Cannot find module`, `module not found` | MISSING_DEPENDENCY | Package not installed |
| `ENOENT`, `no such file` | FILE_NOT_FOUND | Missing file/directory |
| `SyntaxError`, `Unexpected token` | SYNTAX_ERROR | Code syntax issue |
| `EADDRINUSE`, `port already in use` | PORT_IN_USE | Port conflict |
| `Permission denied`, `EACCES` | PERMISSION_ERROR | File/command permissions |
| `command not found`, `not recognized` | COMMAND_NOT_FOUND | Missing CLI tool |
| `npm ERR!`, `yarn error` | PACKAGE_MANAGER_ERROR | Package manager issue |
| `Failed to compile`, `compilation error` | COMPILATION_ERROR | Build/compile failure |

## Quick Fixes by Type

### MISSING_DEPENDENCY
```bash
# What auto-fix does:
1. Updates package.json with missing package
2. Runs: npm install
```

**Manual Fix:**
```json
// package.json
{
  "dependencies": {
    "missing-package": "^1.0.0"
  }
}
```
```bash
npm install
```

---

### FILE_NOT_FOUND
```bash
# What auto-fix does:
1. Creates missing file with complete code
2. Uses filename= format for immediate creation
```

**Manual Fix:**
```bash
# Check what file is missing from error
# Create it with complete implementation
touch src/missing-file.js
```

---

### SYNTAX_ERROR
```bash
# What auto-fix does:
1. Identifies file with syntax error
2. Provides complete corrected file
3. Checks all brackets, quotes, semicolons
```

**Manual Fix:**
```bash
# Check error message for file:line
# Fix syntax in that file
# Common issues: missing ), }, ], or ;
```

---

### PORT_IN_USE
```bash
# What auto-fix does:
1. Updates config with new port
2. Provides updated vite.config.js or server config
```

**Manual Fix:**
```javascript
// vite.config.js
export default {
  server: { port: 5174 } // Change from 5173
}
```

**Or kill process:**
```bash
# macOS/Linux
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

---

### COMMAND_NOT_FOUND
```bash
# What auto-fix does:
1. Identifies missing tool
2. Provides installation command
3. Or suggests alternative command
```

**Manual Fix:**
```bash
# Install missing tool
npm install -g <tool-name>

# Or check if it's a typo in package.json scripts
```

---

### COMPILATION_ERROR
```bash
# What auto-fix does:
1. Reads compilation error details
2. Fixes imports, types, exports
3. Provides complete corrected file
```

**Manual Fix:**
```bash
# Read compilation error carefully
# Fix ALL issues listed:
# - Missing imports
# - Type errors
# - Export mismatches
```

---

## When Auto-Fix Isn't Available

### Backend Not Running
```bash
cd backend
npm install  # First time only
npm start    # Start backend server

# Wait for: "Server running on port 5000"
# Then retry command
```

### Rate Limit Hit
```bash
# Wait 1-2 minutes
# AI service has cooldown period
# Then retry command
```

### Timeout
```bash
# Complex fixes may timeout
# Try:
1. Break down the problem
2. Fix simpler issues first
3. Or fix manually
```

---

## Best Practices

### ✅ Do's
- Let auto-fix try first
- Monitor terminal output after fix
- Read AI's explanation of the fix
- Click retry if backend was offline
- Verify fix worked before continuing

### ❌ Don'ts
- Don't manually intervene while auto-fix running
- Don't ignore fix validation warnings
- Don't retry immediately if rate limited
- Don't assume fix worked without checking
- Don't edit files while AI is processing

---

## Troubleshooting Auto-Fix

### Issue: "Auto-fix unavailable"
**Solution:**
```bash
cd backend && npm start
# Wait for server ready message
```

### Issue: "Fix response lacks actionable fixes"
**Solution:**
- AI provided explanation instead of files
- Ask: "Provide the complete file with filename="
- Or manually implement suggestion

### Issue: Multiple Retries Failing
**Solution:**
1. Check backend logs: `cd backend && tail -f logs.txt`
2. Verify API key: `backend/.env` has `ANTHROPIC_API_KEY`
3. Check firewall: Allow port 5000
4. Fix manually and move on

### Issue: Fix Applied But Still Fails
**Solution:**
1. Read new error message carefully
2. May be cascade error (fix caused new issue)
3. Let auto-fix try again with new error
4. Or ask: "Why did that fix not work?"

---

## Advanced: Customizing Auto-Fix

### Adding New Error Type
```javascript
// In AIAssistant.jsx analyzeErrorType()
if (combined.includes('your-pattern')) {
  return 'YOUR_ERROR_TYPE';
}

// In switch statement
case 'YOUR_ERROR_TYPE':
  errorAnalysis = '**Error Type:** Your Description';
  suggestedActions = `
**Required Actions:**
1. What to do
2. What files to provide
3. What commands to run
`;
  break;
```

### Adjusting Timeouts
```javascript
// In AIAssistant.jsx around line 1688
const fixResponse = await ClaudeService.getClaudeCompletion(
  fixConversation,
  20000,  // Max tokens (increase for longer fixes)
  90000   // Timeout in ms (increase for complex fixes)
);
```

---

## Statistics & Monitoring

Monitor auto-fix effectiveness:
- Check console for `✅ Auto-fix completed` messages
- Count files created vs errors remaining
- Track retry rates
- Note error types most common in your project

---

**Pro Tip:** Auto-fix learns from context. The more files you have, the better it fixes. Keep package.json, config files, and main source files for best results.

**Last Updated:** January 11, 2026
