import api from './api';

export const predictionService = {
  async getRecentThreats(limit = 20) {
    try {
      const response = await api.get(`/history/threats?limit=${limit}`);
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch historical threats, using fallback query:', err);
      // Fallback query to incidents API if history endpoint returns empty
      const fallbackResponse = await api.get(`/incidents?limit=${limit}`);
      return fallbackResponse.data;
    }
  },

  async runTestPrediction(customFeatures = {}) {
    const payload = {
      'Flow Packets/s': 1250.5,
      'Packet Length Std': 180.2,
      'Fwd IAT Mean': 450.0,
      'SYN Flag Count': 1,
      ...customFeatures,
    };
    const response = await api.post('/prediction/test', payload);
    const predictionId = response.headers['x-prediction-id'] || response.data?.prediction_id;
    return {
      data: response.data,
      predictionId: predictionId || response.data?.id,
    };
  },

  async getExplanation(predictionId) {
    if (!predictionId) {
      throw new Error('Prediction ID is required to fetch explanation.');
    }
    const response = await api.get(`/prediction/${predictionId}/explain`);
    return response.data;
  },
};
