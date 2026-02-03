# Content Policy - Quick Reference

## What's Blocked?

🚫 **Prohibited Projects:**
- Code editors / text editors / IDEs
- AI coding assistants (like GitHub Copilot, Cursor)
- VS Code clones or alternatives
- Online coding environments (Replit, CodeSandbox)
- Syntax highlighters for IDEs
- Code completion engines
- File explorers for code editing
- Integrated terminals for IDEs
- Extern AI clones

## Implementation Files

### Backend (Required for Security)
- `backend/middleware/contentPolicy.js` - Pattern validation logic
- `backend/routes/claude.js` - Integration point (lines 7, 175-208, 233-261)

### Frontend (Electron)
- `src/main/contentPolicy.js` - Client-side validation
- `src/main/ClaudeProxy.js` - IPC handler integration (lines 4, 23-55, 60-87)

### Frontend (React)
- `src/renderer/components/AIAssistant.jsx` - Error handling & UI (lines 932-966, 3063-3114)
- `src/renderer/components/AIAssistant.css` - Error styling (lines 2437-2576)
- `src/renderer/services/ClaudeService.js` - API error handling (lines 70-91, 186-196)

## Testing

```bash
# Quick test - should be blocked
"Build me a code editor"
"Create an AI coding assistant"
"Make a VS Code clone"
"Build an online IDE like Replit"

# Should work (educational)
"How does VS Code work?"
"What is syntax highlighting?"

# Should work (normal apps)
"Build a to-do app"
"Create an e-commerce website"
```

## HTTP Response

**Status Code:** 403 Forbidden

**Response Body:**
```json
{
  "error": "Prohibited Content Detected",
  "message": "Extern AI is designed to help you build applications...",
  "reason": "Extern AI cannot be used to build code editors or IDEs.",
  "category": "ide_editors",
  "whatYouCanDo": ["Web apps", "Mobile apps", ...],
  "prohibited": ["Code editors", "AI assistants", ...]
}
```

## Adding New Patterns

Edit both files:
1. `backend/middleware/contentPolicy.js`
2. `src/main/contentPolicy.js`

```javascript
PROHIBITED_PATTERNS: {
  category_name: [
    /pattern here/gi,
  ]
}
```

## Monitoring

Check analytics for violations:
```javascript
AnalyticsService.trackAIRequest('content_policy_violation', {
  message: error.message
});
```

## Emergency Disable

If false positives occur, temporarily bypass by commenting out in:
- `backend/routes/claude.js` (lines 175-208)
- `src/main/ClaudeProxy.js` (lines 23-55)

⚠️ **DO NOT deploy without validation!**

## Support Scenarios

**User says:** "Your AI blocked my request"

**Response:** "Extern AI has content policies that prevent building code editors, IDEs, or AI coding assistants. This protects our platform. You can build web apps, mobile apps, games, business tools, and much more! What would you like to create?"

## Key Files Summary

| File | Purpose | Lines |
|------|---------|-------|
| `backend/middleware/contentPolicy.js` | Validation logic | All |
| `backend/routes/claude.js` | Backend integration | 7, 175-208, 233-261 |
| `src/main/contentPolicy.js` | Client validation | All |
| `src/main/ClaudeProxy.js` | Electron integration | 4, 23-55, 60-87 |
| `AIAssistant.jsx` | Error UI | 932-966, 3063-3114 |
| `AIAssistant.css` | Error styling | 2437-2576 |
| `ClaudeService.js` | API handling | 70-91, 186-196 |

## Documentation

Full details: See `CONTENT_POLICY.md`
