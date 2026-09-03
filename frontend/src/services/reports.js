import api from './api';

export const reportService = {
  /**
   * Generates a new SOC audit/incident report.
   * Requires VIEW_SMART_SUMMARY capability (All roles).
   */
  async generateReport({ report_type = 'incident_summary', start_time = null, end_time = null, format = 'pdf' } = {}) {
    const response = await api.post('/reports/generate', {
      report_type,
      start_time: start_time || Date.now() - 86400000,
      end_time: end_time || Date.now(),
      format,
    });
    return response.data;
  },

  /**
   * Retrieves report status and metadata.
   */
  async getReport(reportId) {
    const response = await api.get(`/reports/${reportId}`);
    return response.data;
  },
};
