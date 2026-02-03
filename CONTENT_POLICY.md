# Extern AI Content Policy Implementation

## Overview

This document describes the comprehensive content policy system implemented in Extern AI to prevent the platform from being used to build competing IDE, code editor, or AI coding assistant platforms.

## Policy Summary

**Extern AI cannot and will not help users build:**

❌ Code editors, text editors, or IDEs  
❌ AI coding assistants or copilot-style tools  
❌ Clones or replicas of VS Code, Sublime, Atom, or any IDE  
❌ Online coding environments (like Replit, CodeSandbox)  
❌ Platforms that help users write or generate code  
❌ Clones or replicas of Extern AI itself  
❌ Syntax highlighters, code completion engines, or IDE features  
❌ Integrated development environments of any kind  

✅ **Users CAN build:** Web applications, mobile apps, games, business software, e-commerce platforms, dashboards, APIs, backends, portfolios, landing pages, and educational projects.

## Implementation Architecture

The content policy is enforced at **3 layers** for maximum protection:

### 1. Backend API Validation (`backend/middleware/contentPolicy.js`)

**Purpose:** Server-side validation before requests reach the AI  
**Location:** `/backend/middleware/contentPolicy.js`

- Validates incoming user messages before they reach Claude API
- Checks both current message and conversation history (last 5 messages)
- Returns HTTP 403 with detailed error message when policy is violated
- Integrated into `/api/claude/stream` endpoint in `backend/routes/claude.js`

**Key Features:**
- Pattern-based detection using regex
- Educational exemptions (allows learning about IDEs, just not building them)
- Comprehensive category detection (IDE editors, AI platforms, competitors, etc.)
- Context-aware validation (analyzes conversation history)

### 2. Electron Main Process Validation (`src/main/contentPolicy.js`)

**Purpose:** Client-side validation for desktop app (Electron)  
**Location:** `/src/main/contentPolicy.js`

- Validates requests in the Electron main process before sending to backend
- Identical pattern matching to backend for consistency
- Integrated into `ClaudeProxy.js` IPC handler
- Returns error immediately without making network request

### 3. AI System Prompt Instructions

**Purpose:** Instruct the AI model itself to refuse prohibited requests  
**Locations:**
- `/backend/routes/claude.js` (system prompt)
- `/src/main/ClaudeProxy.js` (system prompt)

The system prompt includes clear instructions at the top:

```
⚠️ CONTENT POLICY - READ FIRST ⚠️

EXTERN AI CANNOT AND WILL NOT:
❌ Build code editors, text editors, or IDEs
❌ Build AI coding assistants or copilot-style tools
...

If a user asks for any of these, IMMEDIATELY respond with:
"I'm sorry, but I cannot help build code editors, IDEs..."
```

This ensures even if validation is bypassed, the AI model itself will refuse.

## Detection Patterns

### Categories of Prohibited Content

1. **IDE/Editors** - Building code/text editors
2. **AI Coding Platforms** - AI-powered coding assistants
3. **Extern AI Clones** - Replicating Extern AI itself
4. **IDE Features** - File explorers, terminals, syntax highlighters for IDEs
5. **Development Environments** - Online coding platforms/REPLs
6. **Competitors** - Cloning specific products (VS Code, Replit, etc.)

### Example Patterns

```javascript
// Detects: "build a code editor", "create an IDE"
/\b(build|create|make|develop|clone)\s+(a|an|my|our|own)?\s*(code|text|source)?\s*(editor|ide)\b/gi

// Detects: "AI coding assistant", "AI-powered code helper"
/\b(build|create|make|develop)\b.*\b(ai|artificial\s*intelligence)\b.*\b(coding|programming|developer|code)\s*(assistant|helper|copilot|companion|tool|platform)\b/gi

// Detects: "VS Code clone", "like VS Code"
/\b(vscode|visual\s*studio\s*code|vs\s*code)\b.*\b(clone|copy|replica|similar|alternative|like)\b/gi
```

### Educational Exemptions

The system allows educational queries but prevents building:

✅ Allowed:
- "How does VS Code work?"
- "What is syntax highlighting?"
- "Explain how code editors work"

❌ Blocked:
- "Build a VS Code clone"
- "Create a code editor with syntax highlighting"
- "Make an AI coding assistant"

## User Experience

### Error Message Display

When a policy violation is detected, users see a friendly, informative message:

**UI Components:**
- Orange warning banner with alert icon
- Clear explanation of what's prohibited
- List of what they CAN build
- List of what's prohibited
- Encouragement to build something else

**Message Structure:**
```
🚨 Content Policy Restriction

Extern AI is designed to help you build applications, but it cannot 
be used to create platforms that compete with code editors, IDEs, 
or AI coding assistants.

✅ What You Can Build:
• Web applications, mobile apps, games, and tools
• Business software, e-commerce platforms, dashboards
• APIs, microservices, and backend systems
...

❌ Prohibited Projects:
• Code editors or IDEs (like VS Code, Sublime, Atom)
• AI coding assistants or copilot-style tools
...

Would you like to build something else instead?
```

### Frontend Implementation

**File:** `/src/renderer/components/AIAssistant.jsx`

Error handling in the `sendMessage` function:
```javascript
if (error.message.includes('Prohibited Content') || 
    error.message.includes('cannot be used to create platforms')) {
  setError('content_policy_violation');
  setMessages(prev => [
    ...prev.filter(msg => msg.id !== streamingMessageId),
    {
      role: 'content-policy-error',
      content: 'CONTENT_POLICY_ERROR',
      errorDetails: error.details
    }
  ]);
}
```

**CSS Styling:** `/src/renderer/components/AIAssistant.css`
- Gradient orange background
- Professional warning design
- Clear visual hierarchy
- Light/dark theme support

## API Response Codes

- **200 OK** - Request allowed, normal response
- **403 Forbidden** - Content policy violation detected
- **429 Too Many Requests** - Rate limit (different from policy)

**403 Response Structure:**
```json
{
  "error": "Prohibited Content Detected",
  "message": "Extern AI is designed to help you build applications...",
  "reason": "Extern AI cannot be used to build code editors or IDEs.",
  "category": "ide_editors",
  "whatYouCanDo": [...],
  "prohibited": [...]
}
```

## Testing the Implementation

### Test Cases

1. **Direct IDE Request**
   - Input: "Build me a code editor"
   - Expected: Policy violation error

2. **AI Coding Assistant**
   - Input: "Create an AI coding assistant like GitHub Copilot"
   - Expected: Policy violation error

3. **VS Code Clone**
   - Input: "Make a VS Code alternative"
   - Expected: Policy violation error

4. **Online IDE**
   - Input: "Build an online coding environment like Replit"
   - Expected: Policy violation error

5. **Educational Query** (Should Pass)
   - Input: "How does syntax highlighting work in code editors?"
   - Expected: Normal response (educational exemption)

6. **Regular App** (Should Pass)
   - Input: "Build me a to-do list web app"
   - Expected: Normal response

### Manual Testing

```bash
# Test backend API directly
curl -X POST https://api-bkrpnxig4a-uc.a.run.app/api/claude/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Build me a code editor"}
    ]
  }'

# Expected response: 403 with policy error
```

## Analytics & Monitoring

The system tracks content policy violations:

```javascript
AnalyticsService.trackAIRequest('content_policy_violation', {
  message: error.message
});
```

**Tracked Events:**
- `content_policy_violation` - When policy is triggered
- Category of violation
- User message (sanitized)

## Maintenance & Updates

### Adding New Patterns

To add new prohibited patterns, update both files:
1. `/backend/middleware/contentPolicy.js`
2. `/src/main/contentPolicy.js`

Add to the appropriate category:
```javascript
PROHIBITED_PATTERNS: {
  ide_editors: [
    /your new pattern here/gi,
    // existing patterns...
  ]
}
```

### Pattern Best Practices

1. **Be Specific** - Avoid false positives
2. **Use Word Boundaries** (`\b`) - Match whole words
3. **Case Insensitive** - Always use `/gi` flags
4. **Test Thoroughly** - Check against legitimate use cases
5. **Document Patterns** - Add comments explaining what each pattern matches

## Security Considerations

1. **Defense in Depth** - 3 layers of validation (backend, client, AI prompt)
2. **Server-Side Enforcement** - Primary validation on backend (can't be bypassed)
3. **Pattern Obfuscation** - Patterns in server-side code only
4. **No Client Trust** - Always validate on server
5. **Logging** - All violations logged for monitoring

## Compliance & Legal

This content policy helps:
- Protect Extern AI's competitive position
- Prevent unauthorized cloning of the platform
- Maintain Terms of Service compliance
- Protect against misuse of AI capabilities
- Ensure sustainable business model

## Support & FAQs

**Q: What if a legitimate request is blocked?**  
A: Educational exemptions are built in. If there's a false positive, users can rephrase or contact support.

**Q: Can users still learn about IDE development?**  
A: Yes! Educational queries are allowed. Users can ask "how does X work" but can't build it.

**Q: How do I report false positives?**  
A: Check analytics logs and adjust patterns. Consider adding to educational exemptions.

**Q: Can this be bypassed?**  
A: With 3 layers (backend validation, client validation, AI instructions), it's extremely difficult. Backend validation is the primary security layer.

## Future Enhancements

1. **Machine Learning Detection** - Use ML models for more sophisticated pattern detection
2. **Context Analysis** - Analyze full conversation context, not just recent messages
3. **User Reputation** - Track users with repeated violations
4. **Dynamic Patterns** - Update patterns based on attempted bypasses
5. **Rate Limiting** - Additional rate limits for suspected policy evasion

## Conclusion

This multi-layered content policy implementation provides robust protection against misuse while maintaining a positive user experience. The system is designed to be maintainable, extensible, and effective at preventing Extern AI from being used to build competing platforms.

---

**Implementation Date:** February 3, 2026  
**Version:** 1.0  
**Status:** ✅ Active  
