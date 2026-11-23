import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import { DashboardFilterParams, DashboardSummaryDto } from '../types/dashboard.types';

export const dashboardApi = {
  getSummary: async (
    params?: DashboardFilterParams,
    signal?: AbortSignal
  ): Promise<DashboardSummaryDto> => {
    const res = await apiClient.get<ApiResponse<DashboardSummaryDto>>('/dashboard/summary', {
      params,
      signal,
    });
    return res.data.data;
  },
};
