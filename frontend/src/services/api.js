import axios from 'axios';

let inMemoryAccessToken = typeof window !== 'undefined' ? localStorage.getItem('netriq_access_token') : null;
let onUnauthenticatedHandler = null;
let isRefreshing = false;
let failedQueue = [];

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('netriq_access_token', token);
    } else {
      localStorage.removeItem('netriq_access_token');
    }
  }
};

export const getAccessToken = () => inMemoryAccessToken;

export const setUnauthenticatedHandler = (handler) => {
  onUnauthenticatedHandler = handler;
};

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach bearer token if available in memory (except for public auth routes)
api.interceptors.request.use(
  (config) => {
    const isPublicAuthRoute =
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/refresh');

    if (inMemoryAccessToken && !config.headers.Authorization && !isPublicAuthRoute) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Single-flight mutex token refresh on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        // Enqueue concurrent request to wait for the single in-flight refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('netriq_refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        setAccessToken(null);
        if (onUnauthenticatedHandler) onUnauthenticatedHandler();
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post('/api/v1/auth/refresh', {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = refreshResponse.data;

        setAccessToken(access_token);
        if (newRefreshToken) {
          localStorage.setItem('netriq_refresh_token', newRefreshToken);
        }

        api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        processQueue(null, access_token);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAccessToken(null);
        localStorage.removeItem('netriq_refresh_token');
        if (onUnauthenticatedHandler) onUnauthenticatedHandler();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
