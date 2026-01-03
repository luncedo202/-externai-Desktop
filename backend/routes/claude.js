const express = require('express');
const router = express.Router();
const axios = require('axios');
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const db = admin.firestore();

// Helper to get/create user usage document
async function getUserUsage(userId) {
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  if (!userDoc.exists) {
    // Create new user document
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
        maxTokensPerDay: Infinity, // Unlimited
        maxLifetimeRequests: parseInt(process.env.MAX_LIFETIME_REQUESTS) || 20
      }
    };
    await userRef.set(userData);
    return userData;
  }


  const userData = userDoc.data();

  // Reset daily usage if it's a new day
  let needsUpdate = false;

  if (userData.usage.lastResetDate !== today) {
    userData.usage.requestsToday = 0;
    userData.usage.tokensToday = 0;
    userData.usage.lastResetDate = today;
    needsUpdate = true;
  }

  // MIGRATION: Reset totalRequests for existing users to give them a fresh 30 prompts
  if (!userData.usage.isLifetimeLimited) {
    console.log(`[Migration] Resetting totalRequests for user ${userId} to start 30 prompt limit`);
    userData.usage.totalRequests = 0;
    userData.usage.isLifetimeLimited = true;
    needsUpdate = true;
  }

  if (needsUpdate) {
    await userRef.update({ usage: userData.usage });
  }

  return userData;
}

// Claude API proxy with streaming
router.post('/stream', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user usage
    const userData = await getUserUsage(userId);

    // Check if user has exceeded limits
    const maxLifetimeRequests = parseInt(process.env.MAX_LIFETIME_REQUESTS) || 20;

    // Ensure limits object has the lifetime limit
    if (!userData.limits.maxLifetimeRequests) {
      userData.limits.maxLifetimeRequests = maxLifetimeRequests;
    }

    if (userData.usage.totalRequests >= maxLifetimeRequests) {
      return res.status(403).json({
        error: 'Free prompts exhausted',
        message: 'You have used all 20 free prompts. Please upgrade to continue.',
        usage: userData.usage,
        limits: userData.limits
      });
    }

    if (userData.usage.requestsToday >= userData.limits.maxRequestsPerDay ||
      userData.usage.tokensToday >= userData.limits.maxTokensPerDay) {
      return res.status(429).json({
        error: 'Daily limit exceeded',
        usage: userData.usage,
        limits: userData.limits
      });
    }

    // Get request body
    const { messages, max_tokens = 20000, system } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    // Optimized System Prompt - AI as Software Developer
    const defaultSystemPrompt = `You are a software developer. Execute instructions immediately. No confirmations needed.

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

4. FORBIDDEN - Never write:
   • "// TODO", "// Add code here", "..."
   • Incomplete functions or placeholders
   • Code that won't compile/run

═══════════════════════════════════════════
EXECUTION FLOW
═══════════════════════════════════════════

ONE STEP AT A TIME:
• Max 3 files OR 2 commands per response
• Stop and wait after each batch

• User says anything (continue/next/ok/yes) → proceed
• User gives new instruction → switch to that

RESPONSE FORMAT (mandatory at end of every response):

(Brief explanation)
(Code blocks/Commands here)

---
**Summary**
[Recap of what was done]

**Next Step**
[Propose next step] - Shall I proceed?

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
ERROR HANDLING
═══════════════════════════════════════════

IF A COMMAND FAILS:
1. Read the error message carefully
2. Identify root cause (missing dep, syntax error, wrong path)
3. Provide complete fix with filename= format
4. Never repeat the same failed command without fixing

COMMON FIXES:
• "module not found" → Add to package.json dependencies
• "syntax error" → Fix the syntax, provide complete file
• "ENOENT" → Create missing file/directory
• "port in use" → Use different port or kill process

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
❌ Ask for confirmation - Execute directly
❌ Multiple steps in one response - One step at a time
❌ Code without filename= - Files won't be created
❌ Incomplete code - Every file must be complete
❌ Syntax errors - Test in your mind before sending

You are the developer. Execute. Deliver. Every file complete and runnable.`;

    // Use provided system prompt or default
    const finalSystemPrompt = system || defaultSystemPrompt;

    // Set headers for SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Make request to Anthropic API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-5',
        max_tokens: Math.min(max_tokens, 8192),
        messages,
        stream: true,
        system: finalSystemPrompt
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        responseType: 'stream'
      }
    );

    let totalTokens = 0;
    let buffer = '';

    // Stream the response
    response.data.on('data', (chunk) => {
      // Add chunk to buffer
      buffer += chunk.toString();

      // Process complete lines only
      const lines = buffer.split('\n');

      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);

          if (data === '[DONE]') {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            // Track tokens
            if (parsed.usage) {
              totalTokens = parsed.usage.output_tokens || 0;
            }

            // Forward to client immediately
            res.write(`data: ${data}\n\n`);
          } catch (e) {
            // Log parse errors for debugging
            console.error('JSON parse error:', e.message, 'Data:', data.substring(0, 100));
          }
        }
      }
    });

    response.data.on('end', async () => {
      // Update user usage in Firestore
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        'usage.requestsToday': admin.firestore.FieldValue.increment(1),
        'usage.tokensToday': admin.firestore.FieldValue.increment(totalTokens),
        'usage.totalRequests': admin.firestore.FieldValue.increment(1),
        'usage.totalTokens': admin.firestore.FieldValue.increment(totalTokens)
      });

      res.write(`data: ${JSON.stringify({ done: true, tokens: totalTokens })}\n\n`);
      res.end();
    });

    response.data.on('error', (error) => {
      console.error('SERVER LOG: Stream error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('SERVER LOG: Claude API Error Details:');
    console.error('- Status:', error.response?.status);
    console.error('- Status Text:', error.response?.statusText);
    console.error('- Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('- Message:', error.message);

    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded on AI service' });
    }

    res.status(500).json({
      error: 'Failed to process AI request',
      details: error.response?.data?.error?.message || error.message,
      model_used: 'claude-sonnet-4-5'
    });
  }
});

// Get user usage stats
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const userData = await getUserUsage(req.userId);

    const maxLifetimeRequests = userData.limits.maxLifetimeRequests || 20;
    const totalRequests = userData.usage.totalRequests || 0;
    const remainingRequests = Math.max(0, maxLifetimeRequests - totalRequests);

    res.json({
      usage: userData.usage,
      limits: userData.limits,
      remaining: {
        requests: userData.limits.maxRequestsPerDay - userData.usage.requestsToday,
        tokens: userData.limits.maxTokensPerDay - userData.usage.tokensToday
      },
      subscription: {
        tier: 'free',
        freePromptsRemaining: remainingRequests,
        maxFreePrompts: maxLifetimeRequests
      }
    });
  } catch (error) {
    console.error('Usage fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

module.exports = router;
