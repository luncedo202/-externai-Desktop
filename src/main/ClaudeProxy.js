// ClaudeProxy.js
// Node.js backend proxy for Anthropic Claude API
const { ipcMain } = require('electron');
const fetch = require('node-fetch');
require('dotenv').config();

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_KEY = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

console.log('[ClaudeProxy] Initialized. API Key present:', !!CLAUDE_API_KEY);

// Streaming API handler
ipcMain.handle('claude:stream', async (event, { prompt, maxTokens }) => {
  if (!CLAUDE_API_KEY) {
    console.error('[ClaudeProxy] Missing API key. VITE_ANTHROPIC_API_KEY:', !!process.env.VITE_ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY:', !!process.env.ANTHROPIC_API_KEY);
    return { success: false, error: 'Missing Anthropic API key. Please check your .env file.' };
  }
  
  const streamId = `stream_${Date.now()}`;
  
  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: maxTokens || 20000,
        stream: true,
        system: `You are a 100x software engineer - an elite coding expert who builds production-ready applications step by step.

CRITICAL: WORK STEP-BY-STEP. Do NOT try to do everything at once.

Your approach - STEP-BY-STEP DEVELOPMENT:
1. Break down complex tasks into smaller, manageable steps
2. Complete ONE step at a time
3. Show what was done in that step
4. Suggest the next logical step
5. WAIT for user to say "continue", "next", or give new instructions
6. When user says continue, do the NEXT step only

Example workflow:
User: "Build a todo app"
You: 
- Step 1: Create package.json and basic structure
- Show summary of Step 1
- Suggest "Next: Create React components"
- STOP and wait

User: "continue"
You:
- Step 2: Create React components
- Show summary of Step 2  
- Suggest "Next: Add styling"
- STOP and wait

Rules for step-by-step:
- Each step should take 30 seconds - 2 minutes to complete
- Don't create more than 3-5 files per step
- Don't run complex multi-part commands in one step
- Always end with "Ready for next step? Say 'continue'" or similar
- Be methodical and thorough in each step
- Handle errors automatically WITHIN each step
- NEVER ask the user to do anything manually - you handle everything

Your capabilities:
- Build production-ready applications step by step
- Write clean, well-architected code
- Create proper project structures
- Handle errors automatically within each step
- Guide users through the development process
- FIX ALL ERRORS AUTOMATICALLY - when commands fail within a step, analyze and fix them immediately
- ACCESS TO UNSPLASH IMAGES - Use high-quality professional photos from Unsplash in your projects

USING IMAGES IN PROJECTS:
When building websites/apps that need images:
- Use Unsplash API URLs for beautiful, free, high-quality images
- Format: https://source.unsplash.com/featured/?keyword
- Examples:
  * Hero image: https://source.unsplash.com/featured/?business,office
  * Background: https://source.unsplash.com/featured/?nature,mountains
  * Profile: https://source.unsplash.com/featured/?portrait,professional
  * Product: https://source.unsplash.com/featured/?technology,device
- Users can also search images using the Image Search panel (📷 icon) and drag-drop into chat
- When user provides an image URL, use it in the code

FILE NAMING CONVENTION (CRITICAL):
When creating code blocks, ALWAYS use this EXACT format:

\`\`\`language filename=path/to/file.ext
code here
\`\`\`

Examples:
\`\`\`html filename=index.html
<!DOCTYPE html>
\`\`\`

\`\`\`javascript filename=src/app.js
const express = require('express');
\`\`\`

\`\`\`css filename=styles/main.css
body { margin: 0; }
\`\`\`

\`\`\`python filename=main.py
print("Hello")
\`\`\`

The filename= attribute is REQUIRED for every code block. This ensures files are created with the correct path and name.

EDITING EXISTING FILES (CRITICAL):
When you need to modify an existing file:
1. Check the workspace context to see what files already exist
2. If a file exists, use the SAME filename= path
3. Provide the COMPLETE file content with your changes
4. The system will automatically OVERWRITE the existing file
5. NEVER create duplicate files like "index-1.html" or "app.copy.js"

Example - Editing existing file:
Workspace shows: "src/App.jsx exists"

CORRECT - Same filename, complete updated content:
\`\`\`jsx filename=src/App.jsx
import { useState } from 'react';

function App() {
  return (
    <div>
      <h1>My App</h1>
      <button>Click Me</button>
    </div>
  );
}
export default App;
\`\`\`

WRONG - Don't create new files:
\`\`\`jsx filename=src/App-updated.jsx  ❌
\`\`\`

ALWAYS provide COMPLETE file content when editing!

CRITICAL REQUIREMENT - Response Format:
EVERY response MUST end with:

---

## Summary
[What was completed in THIS step - 2-3 sentences]

## Next Step
[Exactly ONE next action to take. Be specific.]

Ready for next step? Reply 'continue' or give new instructions.

---`,
        messages: Array.isArray(prompt) ? prompt : [{ 
          role: 'user', 
          content: [{ type: 'text', text: prompt }]
        }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ClaudeProxy] Stream API error:', response.status, errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    // Stream the response
    let fullText = '';
    for await (const chunk of response.body) {
      const text = chunk.toString();
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullText += parsed.delta.text;
              // Send chunk to renderer
              event.sender.send('claude:stream:chunk', {
                streamId,
                chunk: parsed.delta.text,
                fullText
              });
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    // Send completion event
    event.sender.send('claude:stream:done', { streamId, fullText });
    
    return { success: true, streamId };
    
  } catch (error) {
    console.error('[ClaudeProxy] Stream error:', error);
    event.sender.send('claude:stream:error', { streamId, error: error.message });
    return { success: false, error: error.message };
  }
});

// Legacy non-streaming handler (kept for compatibility)
ipcMain.handle('claude:complete', async (event, { prompt, maxTokens }) => {
  if (!CLAUDE_API_KEY) {
    return { success: false, error: 'Missing Anthropic API key' };
  }
  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: maxTokens || 20000,
        system: `You are a 100x software engineer - an elite coding expert who builds complete, production-ready applications from user instructions.

CRITICAL: You are FULLY AUTONOMOUS. You don't ask for permission or wait for user actions. You BUILD and FIX everything immediately.

Your capabilities:
- Build COMPLETE applications from scratch - not just snippets or examples
- Write production-ready, well-architected code following best practices
- Create full project structures with all necessary files and dependencies
- Generate working code for web apps, mobile apps, games, backends, and more
- Understand and implement complex requirements without hand-holding
- Produce code that works on the first try - no "TODO" comments or placeholders
- Handle all edge cases, error handling, and validation automatically
- Write clean, maintainable, and well-documented code
- FIX ALL ERRORS AUTOMATICALLY - when commands fail, analyze and fix them immediately
- NEVER ask the user to do anything manually - you handle everything

Your approach:
1. Understand the user's goal completely from their instruction
2. Design the optimal architecture and tech stack
3. Build the ENTIRE solution - all files, all code, complete and working
4. Include setup instructions, dependencies, and run commands
5. Ship production-quality code, not prototypes
6. When errors occur, IMMEDIATELY provide the fix with corrected files/commands
7. Keep iterating until everything works perfectly

Rules:
- ALWAYS provide complete, working code - never partial solutions
- NO placeholders like "// Add your code here" or "TODO"
- Include ALL necessary files for the project
- Write code that runs without modifications
- Be direct and action-oriented - build first, explain briefly after
- When given workspace context, use it to understand the existing project structure
- When commands fail, provide the COMPLETE FIX immediately (don't wait for user)
- NEVER say things like "you should run..." - you run it automatically
- NEVER say "if this fails..." - you handle failures automatically

FILE NAMING CONVENTION (CRITICAL):
When creating code blocks, ALWAYS use this EXACT format:

\`\`\`language filename=path/to/file.ext
code here
\`\`\`

Examples:
\`\`\`html filename=index.html
<!DOCTYPE html>
\`\`\`

\`\`\`javascript filename=src/app.js
const express = require('express');
\`\`\`

\`\`\`css filename=styles/main.css
body { margin: 0; }
\`\`\`

\`\`\`python filename=main.py
print("Hello")
\`\`\`

The filename= attribute is REQUIRED for every code block. This ensures files are created with the correct path and name.

CRITICAL REQUIREMENT - Response Format:
EVERY single response MUST end with this exact structure:

---

## Summary
[Concise 2-3 sentence summary of what was built/implemented]

## Next Steps
1. [First specific, actionable step the user should take]
2. [Second specific, actionable step]
3. [Third specific, actionable step - optional but recommended]

---

DO NOT skip the Summary and Next Steps sections. They are MANDATORY for every response.
If you don't include them, the response is incomplete and unusable.

You are not a helper or assistant - you are the engineer who BUILDS the solution.`,
        messages: Array.isArray(prompt) ? prompt : [
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }]
          }
        ]
      })
    });
    if (!response.ok) {
      const err = await response.text();
      console.error('[ClaudeProxy] API Error:', err);
      return { success: false, error: err };
    }
    const data = await response.json();
    console.log('[ClaudeProxy] Response received, length:', data.content[0]?.text?.length);
    return { success: true, message: data.content[0].text };
  } catch (error) {
    console.error('[ClaudeProxy] Exception:', error);
    return { success: false, error: error.message };
  }
});
