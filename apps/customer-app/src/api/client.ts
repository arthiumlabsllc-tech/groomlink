import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://api.groomlinkgh.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
//
// Single-flight refresh: concurrent 401s must share ONE refresh call,
// otherwise refresh-token rotation revokes the family and every parallel
// refresh fails, wiping the session.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) {
        throw Object.assign(new Error('No refresh token'), { definitive: true });
      }

      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });

      // The API returns { data: { accessToken, refreshToken, tokens: {...} } }.
      // Accept every shape defensively so a response change can never
      // wipe a valid session again.
      const payload = response.data?.data ?? response.data;
      const tokens = payload?.tokens ?? payload;
      const accessToken = tokens?.accessToken;
      const newRefreshToken = tokens?.refreshToken;

      if (!accessToken) {
        throw Object.assign(new Error('Invalid token response from refresh endpoint'), {
          definitive: true,
        });
      }

      await SecureStore.setItemAsync('accessToken', accessToken);
      if (newRefreshToken) {
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);
      }

      return accessToken;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
  await SecureStore.deleteItemAsync('user');
  await SecureStore.deleteItemAsync('isNewUser');
  await SecureStore.deleteItemAsync('registrationEmail');
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError: any) {
        console.log('Token refresh failed:', refreshError?.message);

        // Check if this is a new user in registration flow
        // New users have a temporary token that will fail - don't clear tokens
        const isNewUser = await SecureStore.getItemAsync('isNewUser');
        if (isNewUser === 'true') {
          console.log('New user token refresh failed - keeping registration state');
          return Promise.reject(error);
        }

        // Only wipe the session when the server explicitly rejected the
        // refresh token (400/401). Network failures and 5xx errors are
        // transient — keep the tokens so the user stays logged in.
        const status = refreshError?.response?.status;
        if (refreshError?.definitive || status === 400 || status === 401) {
          await clearSession();
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
