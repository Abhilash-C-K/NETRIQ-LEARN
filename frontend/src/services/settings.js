import api from './api';

export const settingsService = {
  /**
   * Retrieves active system configuration. Requires MANAGE_SETTINGS capability (Admin only).
   */
  async getSettings() {
    const response = await api.get('/settings');
    return response.data;
  },

  /**
   * Updates system configuration attributes.
   */
  async updateSettings(updates) {
    const response = await api.patch('/settings', updates);
    return response.data;
  },
};
