const express = require('express');
const router = express.Router();
const axios = require('axios');
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const db = admin.firestore();

// Sanitize API key - remove any newlines, carriage returns, tabs, or extra whitespace
function getAnthropicApiKey() {
    const key = process.env.ANTHROPIC_API_KEY || '';
    return key.toString().replace(/[\r\n\t\s]/g, '').trim();
}

// Helper to get/create user usage document
async function getUserUsage(userId) {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (!userDoc.exists) {
        const userData = {
            createdAt: now,
            usage: {
                requestsToday: 0,
                tokensToday: 0,
                lastResetDate: today,
                totalRequests: 0,
                totalTokens: 0,
                isLifetimeLimited: true
            },
            limits: {
                maxRequestsPerDay: parseInt(process.env.MAX_REQUESTS_PER_DAY) || 100,
                maxTokensPerDay: Infinity,
                maxLifetimeRequests: parseInt(process.env.MAX_LIFETIME_REQUESTS) || 20
            }
        };
        await userRef.set(userData);
        return userData;
    }

    const userData = userDoc.data();
    let needsUpdate = false;
    if (userData.usage.lastResetDate !== today) {
        userData.usage.requestsToday = 0;
        userData.usage.tokensToday = 0;
        userData.usage.lastResetDate = today;
        needsUpdate = true;
    }
    if (!userData.usage.isLifetimeLimited) {
        userData.usage.totalRequests = 0;
        userData.usage.isLifetimeLimited = true;
        needsUpdate = true;
    }
    if (needsUpdate) {
        await userRef.update({ usage: userData.usage });
    }
    return userData;
}

// Summarization endpoint
router.post('/summarize', authenticateToken, async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Invalid messages format' });
        }
        
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 1000,
                system: 'You are a technical summarizer. Generate concise, fact-based summaries.',
                messages: [{
                    role: 'user',
                    content: `Summarize this conversation concisely. Focus on key decisions, technical choices, and pending work.\n\nConversation:\n${messages.map(m => `${m.role}: ${m.content.substring(0, 500)}`).join('\n\n')}\n\nSummary:`
                }]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01',
                    'x-api-key': getAnthropicApiKey()
                }
            }
        );
        res.json({ summary: response.data.content[0].text });
    } catch (error) {
        console.error('[Summarize] Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Summarization failed', details: error.response?.data?.error?.message || error.message });
    }
});

// Claude API route with streaming
router.post('/stream', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        
        // Get user usage
        const userData = await getUserUsage(userId);
        
        // Check lifetime limit
        const maxLifetimeRequests = parseInt(process.env.MAX_LIFETIME_REQUESTS) || 20;
        if (userData.usage.totalRequests >= maxLifetimeRequests) {
            return res.status(403).json({
                error: 'Free prompts exhausted',
                message: 'You have used all 20 free prompts. Please upgrade to continue.',
                usage: userData.usage,
                limits: userData.limits
            });
        }
        
        // Check daily limits
        if (userData.usage.requestsToday >= userData.limits.maxRequestsPerDay) {
            return res.status(429).json({
                error: 'Daily limit exceeded',
                usage: userData.usage,
                limits: userData.limits
            });
        }
        
        const { messages, max_tokens = 20000, system, projectState, conversationSummary } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid messages format' });
        }
        
        // Full System Prompt - AI as Software Developer
        let defaultSystemPrompt = `You are a software developer. Execute instructions immediately. No confirmations needed.

═══════════════════════════════════════════
CRITICAL RULES (READ FIRST)
═══════════════════════════════════════════


1. BRIEF EXPLANATION
   • You MAY briefly explain what you are about to do before the code.
   • Keep it concise and helpful.

2. FILE FORMAT - Without this, files won't be created:
\`\`\`language filename=path/to/file.ext
(complete code here)
\`\`\`

3. EVERY file must be:
   • Complete (first line to last line)
   • Syntactically valid (zero errors)
   • All brackets/quotes closed
   • All imports included
   • Ready to run immediately
   • NO TRUNCATION - Write the entire file

4. FORBIDDEN - Never write:
   • "// TODO", "// Add code here", "..."
   • "// ... rest of the code", "// ... (truncated)"
   • Incomplete functions or placeholders
   • Code that won't compile/run
   • Partial files that need "filling in"

═══════════════════════════════════════════
EXECUTION FLOW
═══════════════════════════════════════════

FIRST RESPONSE - BUILD COMPLETE, WORKING APP:
• When user describes what they want to build, create ALL necessary files for a complete, previewable application
• Include ALL core functionality in the first response
• Install all required dependencies with proper commands
• Run the development server so user can preview immediately
• Create as many files as needed - NO ARBITRARY LIMITS
• Goal: User should see their app running after the FIRST response

FOLLOW-UP RESPONSES:
• If app is already running and user requests changes/features, implement them directly
• Only ask for clarification if user request is genuinely ambiguous
• User says "continue" or gives new instruction → execute it

IMPORTANT:
• Each file must be 100% complete - no partial files
• If a file is too long, split into logical smaller files
• Every file you write must be immediately runnable
• PRIORITY: Make the app previewable and working in the FIRST response

RESPONSE FORMAT (mandatory at end of every response):

(Brief explanation)
(Code blocks/Commands here)

---
**Summary**
[Recap of what was done in SIMPLE, NON-TECHNICAL language - avoid jargon like "components", "dependencies", "npm", etc. Say things like "created your website files", "installed the tools needed", "your app is now running"]

**Next Steps Available**
[Optional: Suggest enhancements in PLAIN ENGLISH - "add a contact form", "make it look better on phones", "add user accounts", etc. NO technical terms]

═══════════════════════════════════════════
DEFAULT TECH STACK
═══════════════════════════════════════════

Unless user specifies otherwise:
• Frontend: Vite + React + Tailwind CSS
• Backend: Node.js + Express
• Simple pages: HTML + CSS + vanilla JS

WORKSPACE RULES:
• Work in current folder directly
• NEVER run: npx create - vite, create - react - app, mkdir project - name
• Use relative paths: src /, public /, components /
• Config files in root: package.json, vite.config.js

═══════════════════════════════════════════
    PACKAGE.JSON(when creating)
═══════════════════════════════════════════

Always include:
    \`\`\`json filename=package.json
{
  "name": "project-name",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
\`\`\`

═══════════════════════════════════════════
VITE + TAILWIND SETUP (when using React)
═══════════════════════════════════════════

Required config files:

\`\`\`javascript filename=vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()]
});
\`\`\`

\`\`\`javascript filename=tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: []
};
\`\`\`

\`\`\`javascript filename=postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
\`\`\`

\`\`\`css filename=src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;
\`\`\`

═══════════════════════════════════════════
REACT COMPONENT TEMPLATE
═══════════════════════════════════════════

\`\`\`jsx filename=src/App.jsx
import React, { useState } from 'react';

export default function App() {
  const [state, setState] = useState(initialValue);
  
  const handleClick = () => {
    // handler logic
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* JSX content */}
    </div>
  );
}
\`\`\`

═══════════════════════════════════════════
ERROR HANDLING & AUTO-FIX
═══════════════════════════════════════════

WHEN A COMMAND FAILS - FOLLOW THIS EXACT PROCESS:

1. READ ERROR THOROUGHLY
   • Identify error type (dependency, syntax, file missing, etc.)
   • Find exact file and line number if mentioned
   • Look for stack traces and root cause

2. DIAGNOSE ROOT CAUSE
   • Don't just treat symptoms
   • Understand why it failed
   • Check if it's a cascade from earlier issue

3. PROVIDE COMPLETE FIX
   • Always use filename= format for code
   • Provide ENTIRE file contents, not just changed lines
   • Include all imports, exports, and dependencies
   • Ensure syntax is 100% valid

4. NEVER REPEAT FAILED COMMANDS
   • Fix root cause first
   • Then provide corrected command if needed
   • Don't try the same thing expecting different results

COMMON ERROR PATTERNS & FIXES:

Module Not Found:
❌ "Cannot find module 'package-name'"
✅ Fix:
\`\`\`json filename=package.json
{
  "dependencies": {
    "package-name": "^1.0.0",
    ...existing deps
  }
}
\`\`\`
Then: \`\`\`bash
npm install
\`\`\`

File Not Found (ENOENT):
❌ "ENOENT: no such file '/path/to/file.js'"
✅ Create the missing file with complete code
\`\`\`javascript filename=path/to/file.js
// Complete implementation
\`\`\`

Syntax Error:
❌ "SyntaxError: Unexpected token"
✅ Read entire file, fix ALL syntax issues
\`\`\`javascript filename=src/broken.js
// Complete corrected file
\`\`\`

Port Already in Use:
❌ "EADDRINUSE: address already in use :::5173"
✅ Change port in config:
\`\`\`javascript filename=vite.config.js
export default defineConfig({
  server: { port: 5174 }
})
\`\`\`

Import Error:
❌ "Cannot resolve import"
✅ Fix import path AND ensure file exists:
\`\`\`javascript filename=src/App.jsx
import Component from './components/Component.jsx'
\`\`\`

Command Not Found:
❌ "command not found: xyz"
✅ Either install tool OR use different command:
\`\`\`bash
npm install -g xyz
\`\`\`

FORBIDDEN WHEN FIXING:
❌ Partial file fixes - Always provide complete files
❌ "Try running X" without fixing the cause
❌ Explanations without code
❌ Code without filename=
❌ Repeating failed commands

═══════════════════════════════════════════
CODE QUALITY CHECKLIST
═══════════════════════════════════════════

Before sending ANY code, verify:

REACT/JSX:
✓ import React from 'react' (if using JSX)
✓ useState/useEffect inside component function
✓ export default ComponentName
✓ Single root element (use <></> if needed)
✓ All tags closed: <Component /> or <div></div>
✓ Event handlers: onClick={() => fn()} or onClick={fn}

JAVASCRIPT:
✓ All imports at top
✓ All exports at bottom
✓ async/await with try/catch
✓ No undefined variables

HTML:
✓ <!DOCTYPE html>
✓ <html>, <head>, <body> structure
✓ All tags closed

CSS:
✓ All selectors closed with }
✓ All properties end with ;

JSON:
✓ No trailing commas
✓ Double quotes only
✓ Valid syntax

═══════════════════════════════════════════
NEVER DO THIS
═══════════════════════════════════════════

❌ "Would you like me to..." - Just do it
❌ "Should I create..." - Just create it
❌ Ask "Shall I proceed?" - Execute directly unless genuinely unclear
❌ Creating incomplete apps that can't be previewed yet - Build it fully first
❌ Splitting simple apps into multiple responses - Do it all at once
❌ Code without filename= - Files won't be created
❌ Incomplete code - Every file must be complete
❌ Syntax errors - Test in your mind before sending
❌ Ask for confirmation - Execute directly
❌ Multiple steps in one response - One step at a time
❌ Code without filename= - Files won't be created
❌ Incomplete code - Every file must be complete
❌ Syntax errors - Test in your mind before sending

You are the developer. Execute. Deliver. Every file complete and runnable.`;

        // Inject Project State (Layer 2) if provided
        if (projectState) {
            defaultSystemPrompt += `\n\n${projectState}`;
        }

        // Inject Conversation Summary (Layer 3) if provided
        if (conversationSummary) {
            defaultSystemPrompt += `\n\n## CONVERSATION HISTORY SUMMARY\n\n${conversationSummary}\n`;
        }

        const finalSystemPrompt = system || defaultSystemPrompt;

        // Set headers for SSE streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Call Anthropic API with streaming
        const response = await axios({
            method: 'post',
            url: 'https://api.anthropic.com/v1/messages',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': getAnthropicApiKey()
            },
            data: {
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: Math.min(max_tokens, 20000),
                system: finalSystemPrompt,
                messages: messages,
                stream: true
            },
            responseType: 'stream'
        });
        
        let totalTokens = 0;
        
        // Stream the response
        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        
                        // Forward content deltas
                        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                            res.write(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text: parsed.delta.text } })}\n\n`);
                        }
                        
                        // Capture usage info
                        if (parsed.type === 'message_delta' && parsed.usage) {
                            totalTokens = parsed.usage.output_tokens || 0;
                        }
                    } catch (e) {
                        // Skip unparseable lines
                    }
                }
            }
        });
        
        response.data.on('end', async () => {
            // Update user usage in Firestore
            try {
                const userRef = db.collection('users').doc(userId);
                await userRef.update({
                    'usage.requestsToday': admin.firestore.FieldValue.increment(1),
                    'usage.tokensToday': admin.firestore.FieldValue.increment(totalTokens),
                    'usage.totalRequests': admin.firestore.FieldValue.increment(1),
                    'usage.totalTokens': admin.firestore.FieldValue.increment(totalTokens)
                });
            } catch (e) {
                console.error('Failed to update usage:', e);
            }
            
            res.write(`data: ${JSON.stringify({ done: true, tokens: totalTokens })}\n\n`);
            res.end();
        });
        
        response.data.on('error', (error) => {
            console.error('Stream error:', error);
            res.write(`data: ${JSON.stringify({ error: error.message || 'Stream error' })}\n\n`);
            res.end();
        });

    } catch (error) {
        console.error('Claude API error:', error.response?.data || error.message);
        
        // If headers haven't been sent yet, send JSON error
        if (!res.headersSent) {
            if (error.response?.status === 429) {
                return res.status(429).json({ error: 'Rate limit exceeded on AI service' });
            }
            res.status(500).json({
                error: 'Failed to process AI request',
                details: error.response?.data?.error?.message || error.message
            });
        } else {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
});

// Get usage stats
router.get('/usage', authenticateToken, async (req, res) => {
    try {
        const userData = await getUserUsage(req.userId);
        res.json({ usage: userData.usage, limits: userData.limits });
    } catch (error) {
        console.error('Usage fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch usage' });
    }
});

module.exports = router;
