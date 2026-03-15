import { getAuth } from 'firebase/auth';

class CommandExplanationService {
  constructor() {
    this.cacheKey = 'command_explanations_cache';
    this.cache = this._loadCache();
  }

  _loadCache() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error('[CommandExplanationService] Error loading cache:', error);
      return {};
    }
  }

  _saveCache() {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(this.cache));
    } catch (error) {
      console.error('[CommandExplanationService] Error saving cache:', error);
    }
  }

  _hashCommand(command) {
    // Simple hash for caching - use command as key
    // Remove timestamps, file paths, and other variable parts
    const normalized = command
      .trim()
      .replace(/\d{4}-\d{2}-\d{2}/g, 'DATE') // dates
      .replace(/\d{2}:\d{2}:\d{2}/g, 'TIME') // times
      .replace(/\d+\.\d+\.\d+/g, 'VERSION') // versions
      .toLowerCase();
    
    return normalized;
  }

  async explainCommand(command, output) {
    const cacheKey = this._hashCommand(command);
    
    // Check cache first
    if (this.cache[cacheKey]) {
      console.log('[CommandExplanationService] Cache hit for:', command);
      return this.cache[cacheKey];
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const functionUrl = import.meta.env.VITE_FIREBASE_FUNCTION_URL;
      if (!functionUrl) {
        throw new Error('Firebase function URL not configured');
      }

      const idToken = await user.getIdToken();

      // Truncate output if too long (keep last 2000 chars which are most relevant)
      const truncatedOutput = output.length > 2000 
        ? '...' + output.slice(-2000) 
        : output;

      const response = await fetch(`${functionUrl}/api/openai/explainCommand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          command: command.trim(),
          output: truncatedOutput,
          userId: user.uid
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to explain command');
      }

      const data = await response.json();
      const explanation = data.explanation;

      // Cache the result
      this.cache[cacheKey] = explanation;
      this._saveCache();

      return explanation;
    } catch (error) {
      console.error('[CommandExplanationService] Error explaining command:', error);
      throw error;
    }
  }

  clearCache() {
    this.cache = {};
    this._saveCache();
  }
}

export default new CommandExplanationService();
