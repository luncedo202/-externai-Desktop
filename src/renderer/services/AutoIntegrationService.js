/**
 * AutoIntegrationService - Automatically injects saved integration credentials
 * into project .env files so they work across all projects
 */

import IntegrationCredentialsService from './IntegrationCredentialsService';

class AutoIntegrationService {
  /**
   * Sync all saved credentials to a project's .env file
   * Called when a workspace folder is opened
   * @param {string} workspaceFolder - Path to workspace
   * @returns {Promise<{added: number, skipped: number}>}
   */
  async syncCredentialsToProject(workspaceFolder) {
    if (!workspaceFolder) return { added: 0, skipped: 0 };

    try {
      const allCredentials = await IntegrationCredentialsService.getAllCredentials();
      const integrationIds = Object.keys(allCredentials);

      if (integrationIds.length === 0) {
        console.log('No saved credentials to sync');
        return { added: 0, skipped: 0 };
      }

      // Read existing .env file
      let existingEnv = '';
      try {
        const result = await window.electronAPI.fs.readFile(`${workspaceFolder}/.env`);
        if (result.success) {
          existingEnv = result.content;
        }
      } catch (error) {
        console.log('.env file does not exist, will create new one');
      }

      let added = 0;
      let skipped = 0;
      const newLines = [];

      // Process each integration
      for (const integrationId of integrationIds) {
        const credentials = allCredentials[integrationId];
        if (!credentials) continue;

        // Remove metadata fields
        const { updatedAt, ...credKeys } = credentials;
        const keys = Object.keys(credKeys);

        if (keys.length === 0) continue;

        // Check if any of these keys already exist in .env
        const hasExisting = keys.some(key => {
          const regex = new RegExp(`^${key}=`, 'm');
          return regex.test(existingEnv);
        });

        if (hasExisting) {
          skipped++;
          continue;
        }

        // Add integration credentials
        newLines.push(`\n# ${this._getIntegrationName(integrationId)} (Auto-synced)`);
        keys.forEach(key => {
          newLines.push(`${key}=${credKeys[key]}`);
        });

        added++;
      }

      // Write to .env file if there are new credentials
      if (newLines.length > 0) {
        const updatedContent = existingEnv.trim() + '\n' + newLines.join('\n') + '\n';
        await window.electronAPI.fs.writeFile(`${workspaceFolder}/.env`, updatedContent);
        console.log(`✅ Auto-synced ${added} integration(s) to .env`);
      }

      return { added, skipped };
    } catch (error) {
      console.error('Failed to sync credentials:', error);
      return { added: 0, skipped: 0 };
    }
  }

  /**
   * Add a single integration's credentials to a project
   * @param {string} workspaceFolder - Path to workspace
   * @param {string} integrationId - Integration ID
   * @returns {Promise<boolean>} Success status
   */
  async addIntegrationToProject(workspaceFolder, integrationId) {
    if (!workspaceFolder) return false;

    try {
      const credentials = await IntegrationCredentialsService.getCredentials(integrationId);
      if (!credentials) return false;

      // Read existing .env
      let existingEnv = '';
      try {
        const result = await window.electronAPI.fs.readFile(`${workspaceFolder}/.env`);
        if (result.success) {
          existingEnv = result.content;
        }
      } catch (error) {
        // File doesn't exist, will create
      }

      const { updatedAt, ...credKeys } = credentials;
      const keys = Object.keys(credKeys);

      // Check if already exists
      const hasExisting = keys.some(key => {
        const regex = new RegExp(`^${key}=`, 'm');
        return regex.test(existingEnv);
      });

      if (hasExisting) {
        console.log(`${integrationId} credentials already exist in .env`);
        return true; // Already there, consider it success
      }

      // Add to .env
      const newLines = [
        `\n# ${this._getIntegrationName(integrationId)}`,
        ...keys.map(key => `${key}=${credKeys[key]}`)
      ];

      const updatedContent = existingEnv.trim() + '\n' + newLines.join('\n') + '\n';
      await window.electronAPI.fs.writeFile(`${workspaceFolder}/.env`, updatedContent);
      
      console.log(`✅ Added ${integrationId} credentials to .env`);
      return true;
    } catch (error) {
      console.error(`Failed to add ${integrationId} to project:`, error);
      return false;
    }
  }

  /**
   * Check which saved integrations are missing from current project
   * @param {string} workspaceFolder - Path to workspace
   * @returns {Promise<string[]>} Array of integration IDs missing from .env
   */
  async getMissingIntegrations(workspaceFolder) {
    if (!workspaceFolder) return [];

    try {
      const allCredentials = await IntegrationCredentialsService.getAllCredentials();
      const integrationIds = Object.keys(allCredentials);

      if (integrationIds.length === 0) return [];

      // Read .env file
      let existingEnv = '';
      try {
        const result = await window.electronAPI.fs.readFile(`${workspaceFolder}/.env`);
        if (result.success) {
          existingEnv = result.content;
        }
      } catch (error) {
        // No .env file means all are missing
        return integrationIds;
      }

      // Check which ones are missing
      const missing = [];
      for (const integrationId of integrationIds) {
        const credentials = allCredentials[integrationId];
        const { updatedAt, ...credKeys } = credentials;
        const keys = Object.keys(credKeys);

        const hasAny = keys.some(key => {
          const regex = new RegExp(`^${key}=`, 'm');
          return regex.test(existingEnv);
        });

        if (!hasAny) {
          missing.push(integrationId);
        }
      }

      return missing;
    } catch (error) {
      console.error('Failed to check missing integrations:', error);
      return [];
    }
  }

  /**
   * Get friendly name for integration
   * @private
   */
  _getIntegrationName(integrationId) {
    const names = {
      stripe: 'Stripe',
      openai: 'OpenAI',
      firebase: 'Firebase',
      anthropic: 'Anthropic',
      resend: 'Resend',
      cloudinary: 'Cloudinary',
      vercel: 'Vercel',
      netlify: 'Netlify',
      twilio: 'Twilio',
      'google-analytics': 'Google Analytics',
      sendgrid: 'SendGrid',
      mailchimp: 'Mailchimp',
      'google-maps': 'Google Maps',
      tailwind: 'Tailwind CSS',
      payfast: 'PayFast'
    };
    return names[integrationId] || integrationId;
  }
}

export default new AutoIntegrationService();
