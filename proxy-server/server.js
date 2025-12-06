require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: '*', // In production, restrict to your app's origin
  methods: ['POST'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Claude API proxy endpoint
app.post('/api/claude', async (req, res) => {
  try {
    const { messages, model = 'claude-sonnet-4-20250514', max_tokens = 8000 } = req.body;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Invalid request: messages array is required' 
      });
    }

    // Get API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not set in environment');
      return res.status(500).json({ 
        error: 'Server configuration error' 
      });
    }

    // Call Claude API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        max_tokens,
        messages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        timeout: 120000 // 2 minute timeout
      }
    );

    // Log usage for monitoring (optional)
    const tokensUsed = response.data.usage?.total_tokens || 0;
    console.log(`[${new Date().toISOString()}] Request processed - Tokens: ${tokensUsed}`);

    // Return response to client
    res.json(response.data);

  } catch (error) {
    console.error('Proxy error:', error.message);

    if (error.response) {
      // Forward API errors to client
      res.status(error.response.status).json({
        error: error.response.data
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        error: 'Request timeout - please try again'
      });
    } else {
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ExternAI Proxy Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 API endpoint: http://localhost:${PORT}/api/claude`);
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  WARNING: ANTHROPIC_API_KEY not set in environment!');
  }
});
