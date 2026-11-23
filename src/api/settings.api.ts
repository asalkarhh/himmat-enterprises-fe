import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import { ShopSettingsResponse, UpdateShopSettingsRequest } from '../types/settings.types';

export const settingsApi = {
  getShopSettings: async (signal?: AbortSignal): Promise<ShopSettingsResponse> => {
    const res = await apiClient.get<ApiResponse<ShopSettingsResponse>>('/settings/shop', { signal });
    return res.data.data;
  },

  updateShopSettings: async (
    payload: UpdateShopSettingsRequest,
    signal?: AbortSignal
  ): Promise<ShopSettingsResponse> => {
    const res = await apiClient.patch<ApiResponse<ShopSettingsResponse>>('/settings/shop', payload, { signal });
    return res.data.data;
  },
};
