import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { apiClient } from '../src/api/client';
import { authStore } from '../src/api/authStore';
import { ApiError } from '../src/types/api.types';

describe('API Client & Interceptors', () => {
  beforeEach(() => {
    authStore.clearToken();
    vi.clearAllMocks();
  });

  it('attaches Bearer token header when in-memory token exists', async () => {
    authStore.setToken('test-access-token');

    const reqInterceptor = (apiClient.interceptors.request as any).handlers[0]?.fulfilled;
    const config = await reqInterceptor({
      headers: axios.AxiosHeaders.from({}),
    });

    expect(config.headers.Authorization).toBe('Bearer test-access-token');
  });

  it('does not attach Bearer token header when token is null', async () => {
    authStore.clearToken();

    const reqInterceptor = (apiClient.interceptors.request as any).handlers[0]?.fulfilled;
    const config = await reqInterceptor({
      headers: axios.AxiosHeaders.from({}),
    });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('normalizes structured error responses with code, message, fields, and requestId', async () => {
    const errorResponse = {
      response: {
        status: 422,
        data: {
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: 'Requested: 10, On hand: 5',
            fields: [{ field: 'quantity', message: 'Exceeds stock' }],
          },
          requestId: 'req-uuid-1234',
        },
        headers: {},
      },
    };

    const resInterceptor = (apiClient.interceptors.response as any).handlers[0]?.rejected;

    await expect(resInterceptor(errorResponse)).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      code: 'INSUFFICIENT_STOCK',
      message: 'Requested: 10, On hand: 5',
      fields: [{ field: 'quantity', message: 'Exceeds stock' }],
      requestId: 'req-uuid-1234',
    });
  });

  it('triggers unauthorized notification on 401 response', async () => {
    authStore.setToken('expired-token');
    const unauthorizedSpy = vi.fn();
    const unsub = authStore.onUnauthorized(unauthorizedSpy);

    const errorResponse = {
      response: {
        status: 401,
        data: {
          error: { code: 'UNAUTHORIZED', message: 'Session expired' },
        },
        headers: {},
      },
    };

    const resInterceptor = (apiClient.interceptors.response as any).handlers[0]?.rejected;

    await expect(resInterceptor(errorResponse)).rejects.toBeInstanceOf(ApiError);
    expect(unauthorizedSpy).toHaveBeenCalledTimes(1);
    expect(authStore.getToken()).toBeNull();

    unsub();
  });

  it('does NOT log out or clear token on 403 Forbidden response', async () => {
    authStore.setToken('valid-manager-token');
    const unauthorizedSpy = vi.fn();
    const unsub = authStore.onUnauthorized(unauthorizedSpy);

    const errorResponse = {
      response: {
        status: 403,
        data: {
          error: { code: 'FORBIDDEN', message: 'Access denied to profit report' },
        },
        headers: {},
      },
    };

    const resInterceptor = (apiClient.interceptors.response as any).handlers[0]?.rejected;

    await expect(resInterceptor(errorResponse)).rejects.toBeInstanceOf(ApiError);
    expect(unauthorizedSpy).not.toHaveBeenCalled();
    expect(authStore.getToken()).toBe('valid-manager-token');

    unsub();
  });
});
