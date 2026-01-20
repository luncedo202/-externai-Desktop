const express = require('express');
const router = express.Router();
const axios = require('axios');
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');

const db = admin.firestore();

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
                messages: [{
                    role: 'user',
                    content: `Summarize this conversation concisely...\n\nConversation:\n${messages.map(m => `${m.role}: ${m.content.substring(0, 500)}`).join('\n\n')}\n\nSummary:`
                }],
                system: 'You are a technical summarizer. Generate concise, fact-based summaries.'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01',
                    'x-api-key': process.env.ANTHROPIC_API_KEY
                }
            }
        );
        res.json({ summary: response.data.content[0].text });
    } catch (error) {
        res.status(500).json({ error: 'Summarization failed' });
    }
});

router.post('/stream', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const userData = await getUserUsage(userId);
        const maxLifetimeRequests = parseInt(process.env.MAX_LIFETIME_REQUESTS) || 20;

        if (userData.usage.totalRequests >= maxLifetimeRequests) {
            return res.status(403).json({ error: 'Free prompts exhausted' });
        }

        if (userData.usage.requestsToday >= userData.limits.maxRequestsPerDay) {
            return res.status(429).json({ error: 'Daily limit exceeded' });
        }

        const { messages, max_tokens = 20000, system } = req.body;
        const finalSystemPrompt = system || "You are a software developer...";

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: Math.min(max_tokens, 20000),
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
        response.data.on('data', (chunk) => {
            // Stream forwarding logic
            res.write(chunk);
        });

        response.data.on('end', async () => {
            await db.collection('users').doc(userId).update({
                'usage.requestsToday': admin.firestore.FieldValue.increment(1),
                'usage.totalRequests': admin.firestore.FieldValue.increment(1)
            });
            res.end();
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.get('/usage', authenticateToken, async (req, res) => {
    try {
        const userData = await getUserUsage(req.userId);
        res.json({ usage: userData.usage, limits: userData.limits });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

module.exports = router;
