import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import { PricingPreviewRequest, PricingPreviewResponse } from '../types/pricing.types';

export const pricingApi = {
  calculatePreview: async (
    payload: PricingPreviewRequest,
    signal?: AbortSignal
  ): Promise<PricingPreviewResponse> => {
    const res = await apiClient.post<ApiResponse<PricingPreviewResponse>>('/pricing/preview', payload, { signal });
    return res.data.data;
  },
};
