// ClaudeService.js
// Service to call Anthropic Claude Sonnet 4.5 API via Electron IPC

async function getClaudeCompletion(prompt, maxTokens = 20000) {
  if (!window.electronAPI || !window.electronAPI.claude) {
    throw new Error('ClaudeService: Electron API not available');
  }
  console.log('[ClaudeService] Calling Claude via Electron IPC...');
  try {
    const result = await window.electronAPI.claude.complete(prompt, maxTokens);
    console.log('[ClaudeService] Result received:', result?.success, 'Message length:', result?.message?.length);
    if (result && result.success) {
      return { success: true, message: result.message };
    } else {
      console.error('[ClaudeService] Failed:', result?.error);
      return { success: false, error: result && result.error ? result.error : 'Claude completion failed' };
    }
  } catch (error) {
    console.error('[ClaudeService] Exception:', error);
    return { success: false, error: error.message };
  }
}

async function getClaudeStream(prompt, onChunk, maxTokens = 20000) {
  if (!window.electronAPI || !window.electronAPI.claude) {
    throw new Error('ClaudeService: Electron API not available');
  }
  
  console.log('[ClaudeService] Starting Claude stream...');
  
  return new Promise((resolve, reject) => {
    let fullText = '';
    
    // Set up listeners
    window.electronAPI.claude.onStreamChunk((data) => {
      fullText = data.fullText;
      if (onChunk) {
        onChunk(data.chunk, data.fullText);
      }
    });
    
    window.electronAPI.claude.onStreamDone((data) => {
      console.log('[ClaudeService] Stream completed. Length:', data.fullText?.length);
      window.electronAPI.claude.removeStreamListeners();
      resolve({ success: true, message: data.fullText });
    });
    
    window.electronAPI.claude.onStreamError((data) => {
      console.error('[ClaudeService] Stream error:', data.error);
      window.electronAPI.claude.removeStreamListeners();
      reject(new Error(data.error));
    });
    
    // Start the stream
    window.electronAPI.claude.stream(prompt, maxTokens)
      .then(result => {
        if (!result.success) {
          window.electronAPI.claude.removeStreamListeners();
          reject(new Error(result.error));
        }
      })
      .catch(error => {
        window.electronAPI.claude.removeStreamListeners();
        reject(error);
      });
  });
}

export default {
  getClaudeCompletion,
  getClaudeStream
};