const express = require('express');
const router = express.Router();
require('dotenv').config();

/**
 * OpenAI File Explanation Route
 * POST /api/openai/explain
 * 
 * Generates plain English explanations of code files using GPT-4o-mini
 */
router.post('/explain', async (req, res) => {
  try {
    const { filePath, content, language, userId } = req.body;

    // Validate input
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'File content is required'
      });
    }

    // Get OpenAI API key from environment
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error('[OpenAI Explanation] API key not configured');
      return res.status(500).json({
        success: false,
        error: 'Service not configured'
      });
    }

    // Truncate large files
    const maxLength = 8000;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + '\n\n// ... (file truncated for analysis)'
      : content;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a code explainer for non-technical founders. Explain code files in simple, plain English without jargon. Return your explanation as a list of 4-7 bullet points, each starting with "- ". Each bullet point should explain one key aspect: what the file does, its purpose, key features, or important parts. No headings, no markdown, just plain bullet points.'
          },
          {
            role: 'user',
            content: `Explain this ${language || 'code'} file (${filePath}) in plain English for a non-technical founder:\n\n${truncatedContent}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAI Explanation] API error:', response.status, errorText);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate explanation'
      });
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content;

    if (!explanation) {
      return res.status(500).json({
        success: false,
        error: 'No explanation generated'
      });
    }

    // Log for analytics (optional)
    if (userId) {
      console.log(`[OpenAI Explanation] User: ${userId}, File: ${filePath}, Language: ${language}`);
    }

    return res.status(200).json({
      success: true,
      explanation
    });

  } catch (error) {
    console.error('[OpenAI Explanation] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * OpenAI Command Explanation Route
 * POST /api/openai/explainCommand
 * 
 * Generates plain English explanations of terminal commands and their output
 */
router.post('/explainCommand', async (req, res) => {
  try {
    const { command, output, userId } = req.body;

    // Validate input
    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      });
    }

    // Get OpenAI API key from environment
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error('[OpenAI Command Explanation] API key not configured');
      return res.status(500).json({
        success: false,
        error: 'Service not configured'
      });
    }

    // Truncate large output
    const maxLength = 2000;
    const truncatedOutput = output && output.length > maxLength 
      ? '...' + output.substring(output.length - maxLength)
      : output || '';

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a friendly command explainer for non-technical founders. Explain terminal commands and their results in simple, plain English. Pick up on a specific detail from the output — a number of packages installed, a file size, a compile time, a port number, a version, a warning — and mention it naturally to make your explanation feel grounded and specific. Be very brief (2-3 sentences max). No technical jargon. IMPORTANT: If the output contains a URL (like http://localhost:3000), your FIRST line must be: "Click here to open your app: [the URL]". Then explain what happened on the next line.'
          },
          {
            role: 'user',
            content: `Explain what this command did and its significance:\n\nCommand: ${command}\n\nOutput: ${truncatedOutput}`
          }
        ],
        max_tokens: 150,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAI Command Explanation] API error:', response.status, errorText);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate explanation'
      });
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content;

    if (!explanation) {
      return res.status(500).json({
        success: false,
        error: 'No explanation generated'
      });
    }

    // Log for analytics (optional)
    if (userId) {
      console.log(`[OpenAI Command Explanation] User: ${userId}, Command: ${command.substring(0, 50)}`);
    }

    return res.status(200).json({
      success: true,
      explanation
    });

  } catch (error) {
    console.error('[OpenAI Command Explanation] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
