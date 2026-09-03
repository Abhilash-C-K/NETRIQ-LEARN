import api from './api';

export const historyService = {
  /**
   * Fetches historical raw logs from the database.
   * Requires VIEW_RAW_LOGS capability (Admin / Analyst).
   */
  async getRawLogs({ severity = null, limit = 50, offset = 0 } = {}) {
    const params = { limit, offset };
    if (severity && severity !== 'ALL') {
      params.severity = severity.toLowerCase();
    }
    const response = await api.get('/history/logs', { params });
    return response.data;
  },
};
