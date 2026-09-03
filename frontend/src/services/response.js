import api from './api';

export const responseService = {
  /**
   * Enforces forward Layer 2 device quarantine via SDN.
   * Requires TRIGGER_QUARANTINE capability (Admin / Analyst).
   */
  async triggerQuarantine({ target_ip, target_mac = null, reason = 'Manual SOC quarantine' }) {
    const response = await api.post('/response/quarantine', {
      target_ip,
      target_mac,
      reason,
    });
    return response.data;
  },

  /**
   * Reverses a previous response action (unblock firewall IP or release SDN quarantine).
   * Requires REVERSE_RESPONSE_ACTION capability (Admin / Analyst).
   */
  async reverseAction({ action, target_ip, target_mac = null }) {
    const response = await api.post('/response/reverse', {
      action,
      target_ip,
      target_mac,
    });
    return response.data;
  },
};
