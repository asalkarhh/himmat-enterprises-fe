import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  UserSummaryDto,
} from '../types/auth.types';

export const authApi = {
  login: async (payload: LoginRequest, signal?: AbortSignal): Promise<LoginResponse> => {
    const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload, { signal });
    return res.data.data;
  },

  getCurrentUser: async (signal?: AbortSignal): Promise<UserSummaryDto> => {
    const res = await apiClient.get<ApiResponse<UserSummaryDto>>('/auth/me', { signal });
    return res.data.data;
  },

  changePassword: async (payload: ChangePasswordRequest, signal?: AbortSignal): Promise<UserSummaryDto> => {
    const res = await apiClient.post<ApiResponse<UserSummaryDto>>('/auth/change-password', payload, { signal });
    return res.data.data;
  },
};
