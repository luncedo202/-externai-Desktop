/**
 * IntegrationCredentialsService - Stores integration API keys in Firestore
 * Allows users to reuse credentials across different projects
 */

import FirebaseService from './FirebaseService';

class IntegrationCredentialsService {
  /**
   * Save integration credentials for a user
   * @param {string} integrationId - Integration identifier (e.g., 'stripe', 'openai')
   * @param {Object} credentials - Key-value pairs of credentials
   * @returns {Promise<void>}
   */
  async saveCredentials(integrationId, credentials) {
    try {
      const user = FirebaseService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const db = FirebaseService.getFirestore();
      const docRef = db.collection('integrationCredentials').doc(user.uid);

      await docRef.set({
        [integrationId]: {
          ...credentials,
          updatedAt: new Date().toISOString(),
        }
      }, { merge: true });

      console.log(`✅ Saved credentials for ${integrationId}`);
    } catch (error) {
      console.error('Failed to save credentials:', error);
      throw error;
    }
  }

  /**
   * Get all saved credentials for the current user
   * @returns {Promise<Object>} Object with integration IDs as keys
   */
  async getAllCredentials() {
    try {
      const user = FirebaseService.getCurrentUser();
      if (!user) {
        return {};
      }

      const db = FirebaseService.getFirestore();
      const docRef = db.collection('integrationCredentials').doc(user.uid);
      const doc = await docRef.get();

      if (doc.exists) {
        return doc.data() || {};
      }
      return {};
    } catch (error) {
      console.error('Failed to load credentials:', error);
      return {};
    }
  }

  /**
   * Get credentials for a specific integration
   * @param {string} integrationId - Integration identifier
   * @returns {Promise<Object|null>} Credentials object or null if not found
   */
  async getCredentials(integrationId) {
    try {
      const allCredentials = await this.getAllCredentials();
      return allCredentials[integrationId] || null;
    } catch (error) {
      console.error(`Failed to load credentials for ${integrationId}:`, error);
      return null;
    }
  }

  /**
   * Check if credentials exist for an integration
   * @param {string} integrationId - Integration identifier
   * @returns {Promise<boolean>}
   */
  async hasCredentials(integrationId) {
    const credentials = await this.getCredentials(integrationId);
    return credentials !== null && Object.keys(credentials).length > 1; // More than just 'updatedAt'
  }

  /**
   * Delete credentials for a specific integration
   * @param {string} integrationId - Integration identifier
   * @returns {Promise<void>}
   */
  async deleteCredentials(integrationId) {
    try {
      const user = FirebaseService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const db = FirebaseService.getFirestore();
      const docRef = db.collection('integrationCredentials').doc(user.uid);

      await docRef.update({
        [integrationId]: FirebaseService.getFirestore().FieldValue.delete()
      });

      console.log(`🗑️ Deleted credentials for ${integrationId}`);
    } catch (error) {
      console.error('Failed to delete credentials:', error);
      throw error;
    }
  }

  /**
   * Delete all credentials for the current user
   * @returns {Promise<void>}
   */
  async deleteAllCredentials() {
    try {
      const user = FirebaseService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const db = FirebaseService.getFirestore();
      const docRef = db.collection('integrationCredentials').doc(user.uid);

      await docRef.delete();
      console.log('🗑️ Deleted all credentials');
    } catch (error) {
      console.error('Failed to delete all credentials:', error);
      throw error;
    }
  }

  /**
   * Get list of integrations that have saved credentials
   * @returns {Promise<string[]>} Array of integration IDs
   */
  async getSavedIntegrations() {
    try {
      const allCredentials = await this.getAllCredentials();
      return Object.keys(allCredentials);
    } catch (error) {
      console.error('Failed to get saved integrations:', error);
      return [];
    }
  }
}

export default new IntegrationCredentialsService();
