// claude-proxy.js
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.CLAUDE_PROXY_PORT || 5005;
const CLAUDE_API_KEY = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

app.use(cors());
app.use(express.json());

app.post('/claude', async (req, res) => {
  const { prompt, maxTokens } = req.body;
  if (!CLAUDE_API_KEY) {
    return res.status(400).json({ success: false, error: 'Missing Anthropic API key' });
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
        max_tokens: maxTokens || 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ success: false, error: err });
    }
    const data = await response.json();
    res.json({ success: true, message: data.content[0].text });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Claude proxy server running on http://localhost:${PORT}`);
});
