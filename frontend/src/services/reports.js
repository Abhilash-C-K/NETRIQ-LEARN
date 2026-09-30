import api from './api';

export const reportService = {
  /**
   * Generates a new SOC audit/incident report.
   * Requires VIEW_SMART_SUMMARY capability (All roles).
   */
  async generateReport({ report_type = 'incident_summary', start_time = null, end_time = null, format = 'pdf' } = {}) {
    const response = await api.post('/reports/generate', {
      report_type,
      start_time,
      end_time,
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

  /**
   * Downloads a generated PDF document directly from the backend.
   */
  async downloadReport(reportId, filename = 'netriq_soc_report.pdf') {
    const response = await api.get(`/reports/${reportId}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
