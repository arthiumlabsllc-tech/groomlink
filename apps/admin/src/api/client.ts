import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Use relative URL in development (Vite proxy handles it), production URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://api.groomlinkgh.com/api');

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('admin_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Track whether a token refresh is already in progress to avoid duplicate requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor - attempt token refresh on 401 before giving up
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('admin_refresh_token');

      if (!refreshToken) {
        // No refresh token available - log out
        isRefreshing = false;
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Use a fresh axios instance to avoid the interceptor loop
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newAccessToken = data.data?.accessToken || data.data?.tokens?.accessToken;
        const newRefreshToken = data.data?.refreshToken || data.data?.tokens?.refreshToken;

        if (!newAccessToken) {
          throw new Error('No access token in refresh response');
        }

        localStorage.setItem('admin_token', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('admin_refresh_token', newRefreshToken);
        }

        // Update the authorization header on the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Retry any queued requests
        processQueue(null);

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - tokens are truly invalid, log out
        processQueue(refreshError);
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh_token');
        localStorage.removeItem('admin_user');
        // Only redirect if we're not already on the login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
