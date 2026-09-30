import api from './api';

export const dashboardService = {
  async getSummary() {
    try {
      const response = await api.get('/dashboard');
      return response.data;
    } catch (err) {
      console.warn('Dashboard summary fetch failed, using defaults:', err);
      return {
        total_threats_blocked: 0,
        active_incidents: 0,
        system_health: 'OPERATIONAL',
        recent_activity: [],
      };
    }
  },
};

export default dashboardService;
