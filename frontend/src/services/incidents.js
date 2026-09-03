import api from './api';

export const incidentService = {
  /**
   * Retrieves incidents from the backend.
   * Viewers receive server-side stripped records (no affected_assets, notes, or technical action details).
   * Analysts and Admins receive full records.
   */
  async getIncidents(limit = 100) {
    const response = await api.get('/incidents', { params: { limit } });
    return response.data;
  },

  /**
   * Updates incident status and/or audit notes.
   * Requires REVERSE_RESPONSE_ACTION capability (Admin / Analyst).
   */
  async updateIncident(incidentId, { status, notes }) {
    const payload = {};
    if (status) payload.status = status;
    if (notes !== undefined) payload.notes = notes;

    const response = await api.patch(`/incidents/${incidentId}`, payload);
    return response.data;
  },
};
