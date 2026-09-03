import api from './api';

export const analyticsService = {
  /**
   * Fetches threat velocity and trend series.
   * Requires VIEW_SMART_SUMMARY capability (All roles).
   */
  async getTrends({ start_time = null, end_time = null } = {}) {
    const params = {};
    if (start_time) params.start_time = start_time;
    if (end_time) params.end_time = end_time;
    const response = await api.get('/analytics/trends', { params });
    return response.data;
  },
};
