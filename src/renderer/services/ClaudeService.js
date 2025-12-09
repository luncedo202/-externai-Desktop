// ClaudeService.js
// Service to call Claude API with Firebase authentication

import FirebaseService from './FirebaseService';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

async function getAuthToken() {
  try {
    const token = await FirebaseService.getIdToken();
    return token;
  } catch (error) {
    throw new Error('Not authenticated. Please log in.');
  }
}

async function getClaudeCompletion(prompt, maxTokens = 20000) {
  console.log('[ClaudeService] Calling Claude via backend proxy...');
  
  try {
    const token = await getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/claude/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        messages: Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    // Read stream response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.delta?.text) {
              fullText += data.delta.text;
            }
            if (data.done) {
              return { success: true, message: fullText };
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    return { success: true, message: fullText };
  } catch (error) {
    console.error('[ClaudeService] Exception:', error);
    return { success: false, error: error.message };
  }
}

async function getClaudeStream(prompt, onChunk, maxTokens = 20000) {
  console.log('[ClaudeService] Starting Claude stream via backend...');
  
  try {
    const token = await getAuthToken();
    const response = await fetch(`${BACKEND_URL}/api/claude/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        messages: Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    // Read stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.delta?.text) {
              const chunkText = data.delta.text;
              fullText += chunkText;
              if (onChunk) {
                onChunk(chunkText, fullText);
              }
            }
            
            if (data.done) {
              console.log('[ClaudeService] Stream completed. Length:', fullText.length);
              return { success: true, message: fullText };
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    return { success: true, message: fullText };
  } catch (error) {
    console.error('[ClaudeService] Stream error:', error);
    throw error;
  }
}

export default {
  getClaudeCompletion,
  getClaudeStream
};