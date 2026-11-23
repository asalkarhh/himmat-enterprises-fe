import apiClient from './client';
import { ApiResponse, PageResponse } from '../types/api.types';
import { CreateUserRequest, UpdateUserRequest, UserFilterParams } from '../types/user.types';
import { UserSummaryDto } from '../types/auth.types';

export const userApi = {
  getUsers: async (
    params?: UserFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<UserSummaryDto>> => {
    const res = await apiClient.get<PageResponse<UserSummaryDto>>('/users', {
      params,
      signal,
    });
    return res.data;
  },

  createUser: async (
    payload: CreateUserRequest,
    signal?: AbortSignal
  ): Promise<UserSummaryDto> => {
    const res = await apiClient.post<ApiResponse<UserSummaryDto>>('/users', payload, { signal });
    return res.data.data;
  },

  updateUser: async (
    id: string,
    payload: UpdateUserRequest,
    signal?: AbortSignal
  ): Promise<UserSummaryDto> => {
    const res = await apiClient.patch<ApiResponse<UserSummaryDto>>(`/users/${id}`, payload, { signal });
    return res.data.data;
  },
};
