import api from './api';

export const monitoringService = {
  async getStatus() {
    const response = await api.get('/monitoring/status');
    return response.data;
  },

  async startMonitoring(interfaceName = null) {
    const response = await api.post('/monitoring/start', { interface: interfaceName });
    return response.data;
  },

  async stopMonitoring() {
    const response = await api.post('/monitoring/stop');
    return response.data;
  },
};
