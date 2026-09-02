import api, { setAccessToken } from './api';

export const authService = {
  async login(username, password) {
    const response = await api.post('/auth/login', { username, email: username, password });
    const { access_token, refresh_token } = response.data;

    setAccessToken(access_token);
    if (refresh_token) {
      localStorage.setItem('netriq_refresh_token', refresh_token);
    }
    return { access_token, refresh_token };
  },

  async logout() {
    const refreshToken = localStorage.getItem('netriq_refresh_token');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch (e) {
      // Best-effort remote logout notify
    } finally {
      setAccessToken(null);
      localStorage.removeItem('netriq_refresh_token');
    }
  },

  async refresh() {
    const refreshToken = localStorage.getItem('netriq_refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    const { access_token, refresh_token: newRefreshToken } = response.data;

    setAccessToken(access_token);
    if (newRefreshToken) {
      localStorage.setItem('netriq_refresh_token', newRefreshToken);
    }
    return access_token;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
