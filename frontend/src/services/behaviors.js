import api from './api';

export const behaviorService = {
  /**
   * Retrieves all tracked device behavioral profiles and learned baselines.
   */
  async getDeviceBehaviors() {
    const response = await api.get('/behaviors');
    return response.data;
  },

  /**
   * Retrieves a specific device behavioral profile by MAC or IP.
   */
  async getDeviceBehavior(identifier) {
    const response = await api.get(`/behaviors/${encodeURIComponent(identifier)}`);
    return response.data;
  },

  /**
   * Updates a device's baseline operating hours and network policy.
   * Requires MANAGE_SETTINGS (Admin).
   */
  async updateDevicePolicy(mac, updates) {
    const response = await api.patch(`/behaviors/${encodeURIComponent(mac)}`, updates);
    return response.data;
  },

  /**
   * Simulates a behavioral anomaly for live SOC demonstration.
   */
  async simulateAnomaly({ ip, mac, hostname, type }) {
    const response = await api.post('/behaviors/simulate-anomaly', {
      ip,
      mac,
      hostname,
      type,
    });
    return response.data;
  },
};

