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
        
        const { messages, max_tokens = 20000, system } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid messages format' });
        }
        
        // Default system prompt
        const defaultSystemPrompt = `You are a software developer. Execute instructions immediately.

CRITICAL RULES:
1. Use filename= format for ALL code: \`\`\`language filename=path/to/file.ext
2. Every file must be COMPLETE - no truncation
3. Include all imports and exports
4. No placeholders or TODOs

FORMAT:
(Brief explanation)
(Code blocks here)

---
**Summary**: [What was done]
**Next Step**: [Propose next action]`;

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
