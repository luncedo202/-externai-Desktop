/**
 * ExplanationService - Generates plain English explanations of code files
 * Uses GPT-4o-mini for fast, cheap explanations
 */

class ExplanationService {
  constructor() {
    this.cache = this._loadCache();
  }

  /**
   * Load cached explanations from localStorage
   */
  _loadCache() {
    try {
      const raw = localStorage.getItem('file_explanations_cache');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Save cache to localStorage
   */
  _saveCache() {
    try {
      localStorage.setItem('file_explanations_cache', JSON.stringify(this.cache));
    } catch (e) {
      console.warn('Could not save explanation cache:', e);
    }
  }

  /**
   * Generate a simple hash of file content for cache key
   */
  _hashContent(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Get explanation for a file
   * @param {string} filePath - Path to the file
   * @param {string} content - File content
   * @param {string} language - File language/extension
   * @returns {Promise<{success: boolean, explanation?: string, error?: string}>}
   */
  async explainFile(filePath, content, language) {
    // Check cache first
    const contentHash = this._hashContent(content);
    const cacheKey = `${filePath}_${contentHash}`;
    
    if (this.cache[cacheKey]) {
      return { success: true, explanation: this.cache[cacheKey] };
    }

    // If content is too large, truncate it
    const maxLength = 8000; // Keep it reasonable for API
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + '\n\n// ... (file truncated for analysis)'
      : content;

    try {
      const response = await window.electronAPI.openai.explain({
        filePath,
        content: truncatedContent,
        language
      });

      if (response.success && response.explanation) {
        // Cache the result
        this.cache[cacheKey] = response.explanation;
        this._saveCache();
        
        return { success: true, explanation: response.explanation };
      } else {
        return { 
          success: false, 
          error: response.error || 'Failed to generate explanation' 
        };
      }
    } catch (error) {
      console.error('Explanation error:', error);
      return { 
        success: false, 
        error: 'Could not connect to explanation service' 
      };
    }
  }

  /**
   * Clear all cached explanations
   */
  clearCache() {
    this.cache = {};
    localStorage.removeItem('file_explanations_cache');
  }

  /**
   * Remove specific file from cache
   */
  invalidateFile(filePath) {
    const keysToRemove = Object.keys(this.cache).filter(key => key.startsWith(filePath + '_'));
    keysToRemove.forEach(key => delete this.cache[key]);
    this._saveCache();
  }
}

export default new ExplanationService();
