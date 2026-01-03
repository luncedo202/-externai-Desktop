# Project Issues & Potential Problems Analysis

**Date:** December 13, 2025  
**Status:** Comprehensive Audit Complete

---

## 🔴 CRITICAL ISSUES

### 1. **File Duplication Problem**
**Location:** `/src/renderer/components/AIAssistant.jsx` (Lines 1259-1350, 1380-1430)

**Problem:**
- AI creates duplicate files when it shouldn't
- Two separate file creation functions exist:
  - `handleCreateFilesAutomatically()` - Uses AI's `filename=` attribute
  - `handleCreateFiles()` - Generates smart filenames with counters
- Both can be triggered in different scenarios, causing confusion

**Root Cause:**
```javascript
// handleCreateFilesAutomatically (Line 1259)
// Uses filename from AI's ```language filename=path/file.ext
let fileName = block.filename || generateSmartFilename(block.code, block.language);

// handleCreateFiles (Line 1380)
// Always generates smart filename and adds -1, -2, -3 if file exists
let fileName = generateSmartFilename(block.code, block.language);
while (fileExists) {
  fileName = `${baseName}-${counter}.${ext}`; // Creates duplicates!
  counter++;
}
```

**Impact:**
- Users see `App-1.jsx`, `App-2.jsx` instead of updating `App.jsx`
- Workspace becomes cluttered with duplicate files
- AI doesn't understand which file to work on

**Solution:**
✅ **Make AI use existing filenames** - Check workspace context first
✅ **Remove auto-numbering** - Overwrite existing files instead
✅ **Single file creation function** - Merge both functions

---

### 2. **AI Repeats File Creation**
**Location:** Multiple triggers in workflow

**Problem:**
- AI creates the same file multiple times in one response
- Happens when AI doesn't check workspace context properly

**Root Causes:**
1. **System prompt doesn't emphasize checking existing files**
   ```javascript
   // Backend system prompt (claude.js:140-250)
   // Missing strong directive: "ALWAYS check [WORKSPACE CONTEXT] for existing files"
   ```

2. **No deduplication in file processing**
   ```javascript
   // AIAssistant.jsx handleCreateFilesAutomatically
   // Processes all code blocks without checking if filename already processed
   ```

3. **AI generates multiple code blocks with same filename**
   - Example: Creates `index.html` three times in one response

**Solution:**
✅ **Add deduplication logic** - Track filenames being created
✅ **Update system prompt** - Emphasize "Check for existing files FIRST"
✅ **Backend validation** - Return error if filename appears twice in one response

---

### 3. **Wrong Directory Command Execution**
**Location:** `/src/renderer/components/AIAssistant.jsx` (Line 705)

**Problem:**
```javascript
// AI runs: npm install
// But package.json is in: my-project/
// Result: Error - no package.json in workspace root
```

**Current Implementation:**
```javascript
if (workspaceFolder) {
  await window.electronAPI.terminalWrite(terminalId, `cd "${workspaceFolder}"\r`);
}
// Then runs command WITHOUT checking if it's the right subdirectory!
```

**Impact:**
- Commands fail with "package.json not found"
- User sees React/Vite logos (default app) instead of their project
- AI doesn't understand why commands fail

**Solution:**
✅ **Extract project directory from WORKSPACE CONTEXT**
✅ **Auto-detect package.json location**
✅ **CD into project subfolder before commands**

---

## ⚠️ HIGH PRIORITY ISSUES

### 4. **Unclear Working Status**
**Status:** ✅ FIXED (just implemented)

**What was done:**
- Added status messages for file creation: "📝 Creating 3 files..."
- Added status messages for commands: "📦 Installing dependencies..."
- Added animated visual feedback with spinning loader

---

### 5. **Missing Error Recovery**
**Location:** File creation doesn't retry on failure

**Problem:**
```javascript
if (!result.success) {
  console.error('❌ Failed to create file:', result.error);
  // Just marks as failed - doesn't try to fix!
}
```

**Impact:**
- Permission errors stop the entire workflow
- User has to manually intervene
- AI doesn't auto-fix directory creation issues

**Solution:**
✅ **Auto-create parent directories**
✅ **Retry with elevated permissions prompt**
✅ **Ask AI to suggest alternative path**

---

### 6. **Subscription Counter Not Visible**
**Location:** `/src/renderer/components/AIAssistant.jsx` (Line 1490)

**Problem:**
```javascript
{subscription && subscription.tier === 'free' && (
  <div className="subscription-status">
    <span className="prompts-remaining">
      {subscription.freePromptsRemaining || 0} free prompts left
    </span>
  </div>
)}
```

**Missing CSS styling** - Badge not styled properly

**Solution:**
✅ **Add CSS for `.subscription-status` class**
✅ **Make it prominent with yellow/orange color**
✅ **Add warning at 5 prompts left**

---

## 🟡 MEDIUM PRIORITY ISSUES

### 7. **No Workspace Context Validation**
**Problem:**
- AI receives workspace context but doesn't validate it
- Outdated file list causes wrong assumptions

**Example:**
```
User deletes src/App.jsx manually
AI still thinks it exists (stale context)
Creates new App.jsx in wrong location
```

**Solution:**
✅ **Refresh workspace context before each AI request**
✅ **Timestamp workspace scans**
✅ **Warn if context is >30 seconds old**

---

### 8. **Terminal Output Not Captured**
**Location:** Command execution doesn't show output in chat

**Problem:**
```javascript
const result = await window.electronAPI.terminalExecute(command, workspaceFolder);
// Result has stdout/stderr but it's not shown to user or AI
```

**Impact:**
- AI doesn't see error messages
- User doesn't know what went wrong
- Debugging is impossible

**Solution:**
✅ **Show command output in chat**
✅ **Pass errors back to AI for analysis**
✅ **Color-code success (green) / error (red)**

---

### 9. **File Path Detection Issues**
**Problem:**
- AI sometimes creates files with absolute paths: `/Users/...`
- Should be relative to workspace: `src/App.jsx`

**Current Check:**
```javascript
let filePath = `${workspaceFolder}/${fileName}`;
// If fileName="/Users/x/y", this creates wrong path!
```

**Solution:**
✅ **Strip absolute paths** - Only use relative
✅ **Validate filename format** - Block `/` at start
✅ **System prompt clarification** - "Use relative paths only"

---

### 10. **Browser Auto-Open Not Working**
**Location:** `/src/renderer/components/AIAssistant.jsx` (Line 1160)

**Problem:**
```javascript
await window.electronAPI.shell.openExternal(url);
// This API doesn't exist!
```

**Impact:**
- `npm run dev -- --open` works
- But manual browser open fails silently
- User doesn't see their app

**Solution:**
✅ **Fix API call** - Use correct Electron method
✅ **Fallback to system `open` command**
✅ **Show clickable link if opening fails**

---

## 🟢 LOW PRIORITY / POLISH

### 11. **Message Deduplication**
- Same system message shown twice (dev mode re-render)
- Add message ID tracking to prevent duplicates

### 12. **File Icon Detection**
- Explorer shows generic file icon
- Should detect language from extension
- Add proper icons for jsx, tsx, css, etc.

### 13. **No Undo for File Creation**
- Can't undo accidental file creation
- Add "Delete last created files" button

### 14. **Analytics Not Tracking All Events**
- File deletions not tracked
- Terminal sessions not tracked
- Add comprehensive event coverage

### 15. **localStorage Growing Large**
- Chat history stored forever
- Limit to last 100 messages
- Add "Clear history" option

---

## 📊 PERFORMANCE CONCERNS

### 16. **Workspace Scanning Slow**
**Current:** Scans entire workspace on every AI request

**Impact:**
- Large projects (1000+ files) slow down AI
- Unnecessary delays

**Solution:**
✅ **Cache workspace scan** for 30 seconds
✅ **Only rescan if files change**
✅ **Limit to top 500 files**

---

### 17. **Message Re-rendering**
**Current:** Entire chat re-renders on every message

**Solution:**
✅ **Memoize message components**
✅ **Virtual scrolling for long chats**
✅ **Lazy load old messages**

---

## 🔒 SECURITY CONCERNS

### 18. **API Key in Frontend**
**Location:** `.env` file with `VITE_ANTHROPIC_API_KEY`

**Problem:**
- API key exposed in frontend bundle
- Can be extracted from compiled code
- Should be backend-only

**Status:** ⚠️ Partially fixed (backend proxy exists)

**Action:**
✅ **Remove frontend API key**
✅ **Use backend proxy only**
✅ **Add rate limiting**

---

### 19. **No Input Sanitization**
**Problem:**
- AI responses rendered as HTML
- Potential XSS vulnerability

**Solution:**
✅ **Sanitize AI output**
✅ **Escape HTML entities**
✅ **Use safe markdown renderer**

---

## 🎯 QUICK WINS (Easy Fixes)

1. **Add CSS for subscription badge** (5 min)
2. **Fix browser open API** (10 min)
3. **Add file deduplication** (15 min)
4. **Show command output** (20 min)
5. **Update system prompt** (10 min)

---

## 🛠️ RECOMMENDED PRIORITY ORDER

**Week 1 - Critical:**
1. Fix file duplication (Issue #1)
2. Fix command directory execution (Issue #3)
3. Add workspace context refresh (Issue #7)

**Week 2 - High Priority:**
1. Add subscription badge styling (Issue #6)
2. Show terminal output in chat (Issue #8)
3. Fix browser auto-open (Issue #10)

**Week 3 - Polish:**
1. Add undo functionality (Issue #13)
2. Improve performance (Issues #16-17)
3. Security hardening (Issues #18-19)

---

## 📝 NOTES

**"Users file" issue mentioned:**
- Not clear what this refers to
- Possible causes:
  - AI creating config files (.env, .gitignore)
  - System files being included (.DS_Store)
  - Hidden files shown in Explorer
- **Action:** Need more details to investigate

**Smooth functioning blockers:**
1. File duplication (most reported)
2. Wrong directory commands (causes React logo issue)
3. No visual feedback (now fixed)
4. Subscription counter visibility

---

## ✅ FIXES ALREADY IMPLEMENTED (Today)

1. ✅ Added working status messages
2. ✅ Added spinner animations
3. ✅ Added command status tracking
4. ✅ Added subscription limit system
5. ✅ Added analytics tracking
6. ✅ Fixed system prompt (removed mandatory React/Vite)
7. ✅ Added workspace context checking rules

---

## 🔍 TESTING RECOMMENDATIONS

**Test Scenarios:**
1. Create new Vite project → Commands run in right directory?
2. Ask AI to edit existing file → Creates duplicate or overwrites?
3. Create 5 files at once → All get unique names?
4. Run `npm install` in subfolder → Detects package.json location?
5. Hit 25 prompt limit → Shows upgrade message?

**Load Testing:**
- 1000+ files in workspace → Scan performance?
- 100+ messages in chat → Rendering performance?
- Multiple terminals open → Memory usage?

---

## 📞 NEXT STEPS

**Immediate Actions:**
1. Fix file duplication logic (merge creation functions)
2. Update system prompt with stronger file-checking rules
3. Add CSS styling for subscription badge
4. Test command execution in subdirectories

**Questions for User:**
1. What is the "users file" issue? (need screenshot/example)
2. Which issue impacts workflow most?
3. Priority: Stability vs New Features?

---

**End of Analysis**
