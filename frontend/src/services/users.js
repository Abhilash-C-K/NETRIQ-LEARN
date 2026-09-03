import api from './api';

export const userService = {
  /**
   * Retrieves all users. Requires MANAGE_USERS capability (Admin only).
   */
  async listUsers() {
    const response = await api.get('/users');
    return response.data;
  },

  /**
   * Updates user role or profile attributes.
   */
  async updateUser(userId, updates) {
    const response = await api.patch(`/users/${userId}`, updates);
    return response.data;
  },

  /**
   * Soft-deactivates user and invalidates all active sessions.
   */
  async deactivateUser(userId) {
    const response = await api.patch(`/users/${userId}/deactivate`);
    return response.data;
  },
};
