import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { authStore } from './authStore';
import { ApiError, ErrorResponse } from '../types/api.types';

export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach Bearer token from in-memory store
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = authStore.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// Response interceptor: structured error normalization & safe 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorResponse>) => {
    // Check if network error or timeout
    if (!error.response) {
      const isTimeout = error.code === 'ECONNABORTED';
      const networkMessage = isTimeout
        ? 'Request timed out. The server took too long to respond. The outcome may be uncertain.'
        : 'Network connection failed. Please verify your internet connection.';
      return Promise.reject(
        new ApiError(networkMessage, 0, isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR')
      );
    }

    const { status, data, headers } = error.response;
    const headerRequestId = headers['x-request-id'] || headers['x-correlation-id'];
    const bodyRequestId = data?.requestId;
    const requestId = (headerRequestId as string) || bodyRequestId;

    // Structured backend error extraction
    const errorDetails = data?.error;
    const code = errorDetails?.code || `HTTP_${status}`;
    const message = errorDetails?.message || error.message || 'An unexpected error occurred.';
    const fields = errorDetails?.fields || [];
    const currentVersion = errorDetails?.currentVersion;

    // 401 Unauthorized handling: expire session once without redirect/toast loops
    if (status === 401) {
      authStore.notifyUnauthorized();
      return Promise.reject(
        new ApiError(message || 'Session expired or invalid credentials.', 401, code, fields, currentVersion, requestId)
      );
    }

    // 403 Forbidden handling: access denied, DO NOT log user out
    if (status === 403) {
      return Promise.reject(
        new ApiError(message || 'Access denied. You do not have permission for this action.', 403, code, fields, currentVersion, requestId)
      );
    }

    // 409 Conflict: optimistic lock failure / stale version
    if (status === 409) {
      return Promise.reject(
        new ApiError(message || 'The record was modified by another user. Reload before editing.', 409, code, fields, currentVersion, requestId)
      );
    }

    // 429 Rate Limit
    if (status === 429) {
      return Promise.reject(
        new ApiError(message || 'Too many attempts. Please wait before trying again.', 429, code, fields, currentVersion, requestId)
      );
    }

    return Promise.reject(
      new ApiError(message, status, code, fields, currentVersion, requestId)
    );
  }
);

export default apiClient;
