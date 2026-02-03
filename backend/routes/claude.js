const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const database = require('../models/database');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
        isLifetimeLimited: true,
        dailyPromptsRemaining: 0,
        hasUsedInitialPrompts: false
      },
      limits: {
        maxRequestsPerDay: parseInt(process.env.MAX_REQUESTS_PER_DAY) || 100,
        maxTokensPerDay: Infinity, // Unlimited
        maxLifetimeRequests: parseInt(process.env.MAX_LIFETIME_REQUESTS) || 20,
        dailyPromptsAfterInitial: 4
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
    
    // If user has used initial 20 prompts, give them 4 daily prompts
    const maxLifetimeRequests = userData.limits?.maxLifetimeRequests || 20;
    if (userData.usage.totalRequests >= maxLifetimeRequests || userData.usage.hasUsedInitialPrompts) {
      userData.usage.dailyPromptsRemaining = userData.limits?.dailyPromptsAfterInitial || 4;
      userData.usage.hasUsedInitialPrompts = true;
    }
    
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

// Summarization endpoint (Layer 3: Conversation pruning)
router.post('/summarize', authenticateToken, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    console.log(`[Summarize] Generating summary for ${messages.length} messages`);

    // Call Claude to summarize
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      system: 'You are a technical summarizer. Generate concise, fact-based summaries.',
      messages: [
        {
          role: 'user',
          content: `Summarize this conversation concisely. Focus on:
- Key decisions made
- Technical choices and rationale
- Open tasks or pending work
- Important context that should be remembered

Keep it under 300 words. Be technical and precise.

Conversation:
${messages.map(m => `${m.role}: ${m.content.substring(0, 500)}`).join('\n\n')}

Summary:`
        }
      ],
    });

    const summary = msg.content[0].text;
    console.log(`[Summarize] Generated summary: ${summary.substring(0, 100)}...`);

    res.json({ summary });
  } catch (error) {
    console.error('[Summarize] Error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Summarization failed',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

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
    if (!userData.limits.dailyPromptsAfterInitial) {
      userData.limits.dailyPromptsAfterInitial = 4;
    }

    // Check if user still has initial prompts
    if (userData.usage.totalRequests < maxLifetimeRequests && !userData.usage.hasUsedInitialPrompts) {
      // User is using initial 20 prompts - no need to check daily
    } else {
      // User has used initial 20, check daily prompts
      if (!userData.usage.dailyPromptsRemaining || userData.usage.dailyPromptsRemaining <= 0) {
        return res.status(403).json({
          error: 'Daily prompts exhausted',
          message: 'You have used all 4 daily prompts. Come back tomorrow for more, or upgrade for unlimited access.',
          usage: userData.usage,
          limits: userData.limits
        });
      }
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
    const { messages, max_tokens = 20000, system, projectState, conversationSummary } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    // Optimized System Prompt - AI as Software Developer
    let defaultSystemPrompt = `You are a software developer. Execute instructions immediately. No confirmations needed.

═══════════════════════════════════════════
CRITICAL RULES (READ FIRST)
═══════════════════════════════════════════

1. FIRST RESPONSE MUST DELIVER A WORKING APP
   • Create ALL files needed (not just 3 config files)
   • Install ALL dependencies
   • Run the development server
   • User MUST see their app running after your FIRST response
   • NEVER ask "Shall I proceed?" or "Would you like me to continue?"
   • NEVER stop after creating config files only

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
   • "Shall I proceed?" or "Should I continue?"
   • "Let me know if you want me to create the rest"

═══════════════════════════════════════════
EXECUTION FLOW - MOST IMPORTANT
═══════════════════════════════════════════

FIRST RESPONSE - COMPLETE WORKING APPLICATION:
When user describes what they want to build:

1. Create ALL necessary files in ONE response:
   • package.json (with ALL dependencies)
   • All config files (vite.config.js, tailwind.config.js, postcss.config.js)
   • index.html
   • src/main.jsx (entry point)
   • src/App.jsx (main component with FULL functionality)
   • src/index.css (with Tailwind directives)
   • ALL additional components needed
   • ANY other files required

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

CRITICAL: Do ALL of this in your FIRST response. Never split into multiple responses.

FOLLOW-UP RESPONSES:
• If app is already running and user requests changes/features, implement them directly
• Only ask for clarification if user request is genuinely ambiguous

RESPONSE FORMAT (mandatory at end of every response):

(All code blocks with filename= format)
(npm install command)
(npm run dev command)

---
**Summary**

[Write a 6-sentence paragraph explaining what you built in VERY SIMPLE language. Imagine you're talking to someone who has never touched code before. Start with what you built and give a brief description of what it does. Then explain the first main feature and what it lets the user do. Follow that with the second main feature and its benefit. Add the third main feature and what it does. Confirm everything is set up and running, mentioning they can see their app in the preview window on the right side of the screen. End with encouragement to click around and explore all the different parts to see how it works. Write this as ONE flowing paragraph, not a list.

NEVER use words like: components, dependencies, npm, terminal, server, API, frontend, backend, config, modules, render, state, props, hooks]

**Next Step**

[Write 2 suggestions as paragraphs, each with 4 sentences:

✨ **[First suggestion title]**

Write a flowing 4-sentence paragraph. Explain what this feature would add to the app. Describe how users would interact with it. Explain why this is valuable or useful for visitors. Finish by describing how it would make the app feel more complete or professional.

✨ **[Second suggestion title]**

Write a flowing 4-sentence paragraph. Explain what this feature would add to the app. Describe how users would interact with it. Explain why this is valuable or useful for visitors. Finish by describing how it would make the app feel more complete or professional.

Keep suggestions practical and focused on what the USER would experience, not technical implementation details.]

═══════════════════════════════════════════
DEFAULT TECH STACK
═══════════════════════════════════════════

Unless user specifies otherwise:
• Frontend: Vite + React + Tailwind CSS
• Backend: Node.js + Express
• Simple pages: HTML + CSS + vanilla JS

WORKSPACE RULES:
• Work in current folder directly
• NEVER run: npx create-vite, create-react-app, mkdir project-name
• Use relative paths: src/, public/, components/
• Config files in root: package.json, vite.config.js

═══════════════════════════════════════════
COMPLETE PROJECT TEMPLATE (use as baseline)
═══════════════════════════════════════════

For ANY React project, always create ALL of these files:

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

\`\`\`html filename=index.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
\`\`\`

\`\`\`jsx filename=src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
\`\`\`

\`\`\`css filename=src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;
\`\`\`

\`\`\`jsx filename=src/App.jsx
// COMPLETE APP IMPLEMENTATION HERE
// This must contain ALL the functionality the user requested
\`\`\`

Then ALWAYS end with:
\`\`\`bash
npm install
\`\`\`

\`\`\`bash
npm run dev
\`\`\`

═══════════════════════════════════════════
ERROR HANDLING & AUTO-FIX
═══════════════════════════════════════════

WHEN A COMMAND FAILS - FOLLOW THIS EXACT PROCESS:

1. READ ERROR THOROUGHLY
   • Identify error type (dependency, syntax, file missing, etc.)
   • Find exact file and line number if mentioned

2. PROVIDE COMPLETE FIX
   • Always use filename= format for code
   • Provide ENTIRE file contents, not just changed lines
   • Include all imports, exports, and dependencies

COMMON ERROR PATTERNS & FIXES:

Module Not Found:
✅ Add to package.json dependencies, then npm install

File Not Found:
✅ Create the missing file with complete code

Syntax Error:
✅ Rewrite entire file with correct syntax

═══════════════════════════════════════════
ABSOLUTELY FORBIDDEN
═══════════════════════════════════════════

❌ "Would you like me to..." - Just do it
❌ "Should I create..." - Just create it  
❌ "Shall I proceed?" - NO! Create everything now
❌ "Let me know if you want the rest" - NO! Give it all now
❌ Creating only 3-4 config files and stopping - Create EVERYTHING
❌ Asking for confirmation before continuing - Just continue
❌ Splitting a simple app into multiple responses - Do it all at once
❌ Code without filename= - Files won't be created
❌ Incomplete code - Every file must be complete

You are the developer. In your FIRST response, deliver a COMPLETE, RUNNING application. Every file. Dependencies installed. Server running. No questions asked.`;

    // Inject Project State (Layer 2) if provided
    if (projectState) {
      defaultSystemPrompt += `\n\n${projectState}`;
    }

    // Inject Conversation Summary (Layer 3) if provided
    if (conversationSummary) {
      defaultSystemPrompt += `\n\n## CONVERSATION HISTORY SUMMARY\n\n${conversationSummary}\n`;
    }

    // Use provided system prompt or default
    const finalSystemPrompt = system || defaultSystemPrompt;

    // Start Anthropic stream
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: Math.min(max_tokens, 20000),
      system: finalSystemPrompt,
      messages: messages,
    });

    let totalTokens = 0;

    // Handle stream events
    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text } })}\n\n`);
    });

    stream.on('message', (message) => {
      if (message.usage) {
        totalTokens = message.usage.output_tokens || 0;
      }
    });

    stream.on('end', async () => {
      // Update user usage in Firestore
      const userRef = db.collection('users').doc(userId);
      
      const updates = {
        'usage.requestsToday': admin.firestore.FieldValue.increment(1),
        'usage.tokensToday': admin.firestore.FieldValue.increment(totalTokens),
        'usage.totalRequests': admin.firestore.FieldValue.increment(1),
        'usage.totalTokens': admin.firestore.FieldValue.increment(totalTokens)
      };
      
      // If user is in daily prompts mode, decrement daily prompts
      const maxLifetimeRequests = userData.limits.maxLifetimeRequests || 20;
      if (userData.usage.hasUsedInitialPrompts || userData.usage.totalRequests >= maxLifetimeRequests) {
        updates['usage.dailyPromptsRemaining'] = admin.firestore.FieldValue.increment(-1);
        updates['usage.hasUsedInitialPrompts'] = true;
      }
      
      await userRef.update(updates);

      res.write(`data: ${JSON.stringify({ done: true, tokens: totalTokens })}\n\n`);
      res.end();
    });

    stream.on('error', (error) => {
      console.error('SERVER LOG: Stream error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message || 'Stream error' })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('SERVER LOG: Claude API Error Details:');
    console.error('- Status:', error.response?.status);
    console.error('- Status Text:', error.response?.statusText);

    // Try to read error data if it's a stream
    if (error.response?.data) {
      try {
        let errorData = '';
        if (typeof error.response.data.on === 'function') {
          error.response.data.on('data', (chunk) => {
            errorData += chunk.toString();
          });
          error.response.data.on('end', () => {
            console.error('- Error Data:', errorData);
          });
        } else {
          console.error('- Error Data:', error.response.data);
        }
      } catch (e) {
        console.error('- Could not parse error data');
      }
    }

    console.error('- Message:', error.message);

    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded on AI service' });
    }

    res.status(500).json({
      error: 'Failed to process AI request',
      details: error.response?.data?.error?.message || error.message,
      model_used: 'claude-sonnet-4-5-20250929'
    });
  }
});

// Get user usage stats
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const userData = await getUserUsage(req.userId);

    const maxLifetimeRequests = userData.limits.maxLifetimeRequests || 20;
    const totalRequests = userData.usage.totalRequests || 0;
    
    // Determine which mode the user is in
    let remainingRequests;
    let promptsMode;
    
    if (userData.usage.hasUsedInitialPrompts || totalRequests >= maxLifetimeRequests) {
      // User is in daily prompts mode
      remainingRequests = userData.usage.dailyPromptsRemaining || 0;
      promptsMode = 'daily';
    } else {
      // User still has initial prompts
      remainingRequests = Math.max(0, maxLifetimeRequests - totalRequests);
      promptsMode = 'initial';
    }

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
        maxFreePrompts: maxLifetimeRequests,
        promptsMode: promptsMode,
        dailyPromptsLimit: userData.limits.dailyPromptsAfterInitial || 4
      }
    });
  } catch (error) {
    console.error('Usage fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

module.exports = router;
