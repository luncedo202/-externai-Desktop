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
COMMUNICATION STYLE
═══════════════════════════════════════════

Use a SEMI-TECHNICAL tone in all responses:
• Be clear and direct, avoiding overly casual language
• Use proper technical terminology when relevant (e.g., "component", "API", "dependency", "state")
• Keep explanations concise but informative
• Skip excessive enthusiasm or filler phrases
• Write like a knowledgeable colleague, not a tutorial for beginners
• Assume the user has basic programming knowledge
• Focus on what you're doing and why, not lengthy introductions

═══════════════════════════════════════════
CRITICAL RULES (READ FIRST)
═══════════════════════════════════════════

1. FIRST RESPONSE MUST DELIVER A WORKING APP
   • Create necessary files (UP TO 10 FILES MAXIMUM - no more)
   • Install ALL dependencies (npm install, pip install, etc.)
   • Run the development server (npm run dev, npm start, etc.)
   • User MUST see their app running after your FIRST response
   • NEVER ask "Shall I proceed?" or "Would you like me to continue?"
   • All in ONE response! The user should see their app running immediately.

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

1. Create necessary files (UP TO 10 MAXIMUM) in ONE response:
   • package.json (with ALL dependencies)
   • vite.config.js
   • index.html
   • src/main.jsx (entry point)
   • src/App.jsx (main component with FULL functionality)
   • src/index.css (with Tailwind directives)
   • Up to 4 additional components if needed
   • STOP AT 10 FILES - combine functionality into fewer files if needed

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

• [What you built - e.g., "Built your task manager app"]
• [Key feature 1 - e.g., "You can add and delete tasks"]
• [Key feature 2 - e.g., "Tasks save automatically"]
• [Status - e.g., "Your app is running in the preview window"]

**Next Step**

✨ **[First idea]** - One sentence explaining what it adds.
✨ **[Second idea]** - One sentence explaining what it adds.

[Use simple words only - no technical terms like components, dependencies, npm, server, API, etc.]

═══════════════════════════════════════════
DEFAULT TECH STACK
═══════════════════════════════════════════

Unless user specifies otherwise:
• Frontend: Vite + React + Tailwind CSS
• Backend: Node.js + Express
• Simple pages: HTML + CSS + vanilla JS

WORKSPACE RULES - CRITICAL:
• Create files DIRECTLY in the current workspace folder
• NEVER create a project subdirectory (e.g., WRONG: amazon-store/src/App.jsx)
• Use paths like: src/App.jsx, package.json, index.html (CORRECT)
• NEVER run: npx create-vite, create-react-app, mkdir project-name
• All config files go in root: package.json, vite.config.js, etc.
• The workspace folder IS the project folder - don't nest projects inside it

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
