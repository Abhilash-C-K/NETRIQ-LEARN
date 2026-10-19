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

  async getNetworkTelemetry() {
    const response = await api.get('/monitoring/telemetry');
    return response.data;
  },

  async getLocalTopology() {
    const response = await api.get('/monitoring/local-topology');
    return response.data;
  },

  async resolveIpDns(ip) {
    if (!ip) return null;
    const response = await api.get('/monitoring/resolve-dns', { params: { ip } });
    return response.data?.domain || null;
  },

  async resolveIpDnsBatch(ips = []) {
    if (!ips || ips.length === 0) return {};
    const response = await api.post('/monitoring/resolve-dns-batch', { ips });
    return response.data?.results || {};
  },
};
