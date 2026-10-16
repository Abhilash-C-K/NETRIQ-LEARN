import api from './api';

export const historyService = {
  /**
   * Fetches historical raw logs from the database.
   * Requires VIEW_RAW_LOGS capability (Admin / Analyst).
   */
  async getRawLogs({ severity = null, limit = 50, offset = 0, search = null, ip = null, src_ip = null, dst_ip = null } = {}) {
    const params = { limit, offset };
    if (severity && severity !== 'ALL') {
      params.severity = severity.toLowerCase();
    }
    if (search) params.search = search;
    if (ip) params.ip = ip;
    if (src_ip) params.src_ip = src_ip;
    if (dst_ip) params.dst_ip = dst_ip;
    const response = await api.get('/history/logs', { params });
    return response.data;
  },

  /**
   * Fetches chronological activity trail for a specific source IP.
   * Accessible by all authenticated roles (Admin, Analyst, Viewer).
   */
  async getDeviceActivity(srcIp, { limit = 100, severity = null, startTime = null, endTime = null } = {}) {
    if (!srcIp) return [];
    const params = { src_ip: srcIp, limit };
    if (severity && severity !== 'ALL') {
      params.severity = severity.toLowerCase();
    }
    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;
    const response = await api.get('/history/logs', { params });
    return response.data;
  },
};
