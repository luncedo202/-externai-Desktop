// VercelService.js
// Service to handle Vercel deployment via AI assistant

import ClaudeService from './ClaudeService';

class VercelService {
  /**
   * Deploy the current project to Vercel using AI assistance
   * @param {string} workspaceFolder - Path to the project folder
   * @param {Function} onMessage - Callback for AI messages during deployment
   * @returns {Promise<Object>} Deployment result
   */
  static async deployToVercel(workspaceFolder, onMessage) {
    if (!workspaceFolder) {
      throw new Error('No workspace folder selected. Please open a project first.');
    }

    try {
      // Send deployment request to AI assistant
      const deploymentPrompt = `I need to deploy this project to Vercel. Please help me:

1. Check if this project has a valid structure for deployment (HTML/CSS/JS, React, Next.js, etc.)
2. Check if Vercel CLI is installed, if not install it globally
3. Check if there's a vercel.json config file, if not create one with optimal settings
4. Run the deployment command: vercel --prod
5. Provide me with the deployment URL once complete

Project location: ${workspaceFolder}

Please execute all necessary commands and guide me through the deployment process.`;

      // Stream deployment process through AI
      let deploymentResult = '';
      
      await ClaudeService.streamCompletion(
        deploymentPrompt,
        (chunk) => {
          deploymentResult += chunk;
          if (onMessage) {
            onMessage(chunk);
          }
        },
        (error) => {
          throw new Error(`Deployment failed: ${error.message}`);
        }
      );

      return {
        success: true,
        message: 'Deployment initiated successfully',
        fullResponse: deploymentResult
      };
    } catch (error) {
      console.error('[VercelService] Deployment error:', error);
      throw error;
    }
  }

  /**
   * Check Vercel CLI installation status
   * @returns {Promise<boolean>}
   */
  static async isVercelInstalled() {
    try {
      const result = await window.electron.executeCommand('vercel --version');
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Install Vercel CLI
   * @returns {Promise<Object>}
   */
  static async installVercelCLI() {
    try {
      const result = await window.electron.executeCommand('npm install -g vercel');
      return result;
    } catch (error) {
      throw new Error(`Failed to install Vercel CLI: ${error.message}`);
    }
  }

  /**
   * Get deployment status and history
   * @returns {Promise<Object>}
   */
  static async getDeploymentStatus() {
    try {
      const result = await window.electron.executeCommand('vercel ls');
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default VercelService;
