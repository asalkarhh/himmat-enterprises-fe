import apiClient from './client';
import { ApiResponse, PageResponse } from '../types/api.types';
import {
  InventoryItemDto,
  InventoryFilterParams,
  StockMovementDto,
  StockMovementFilterParams,
  CreateManualAdjustmentRequest,
  ManualAdjustmentResponse,
} from '../types/inventory.types';

export const inventoryApi = {
  /**
   * List inventory balances with search, brand, category, subcategory, active, and stockStatus filters.
   */
  getInventory: async (
    params?: InventoryFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<InventoryItemDto>> => {
    const cleanParams: Record<string, unknown> = {};
    if (params) {
      if (params.search?.trim()) cleanParams.search = params.search.trim();
      if (params.brandId !== undefined && params.brandId !== '') cleanParams.brandId = params.brandId;
      if (params.categoryId !== undefined && params.categoryId !== '') cleanParams.categoryId = params.categoryId;
      if (params.subcategoryId !== undefined && params.subcategoryId !== '') cleanParams.subcategoryId = params.subcategoryId;
      if (params.isActive !== undefined) cleanParams.isActive = params.isActive;
      if (params.stockStatus && params.stockStatus !== 'ALL') cleanParams.stockStatus = params.stockStatus;
      if (params.page !== undefined) cleanParams.page = params.page;
      if (params.size !== undefined) cleanParams.size = params.size;
      if (params.sort) cleanParams.sort = params.sort;
    }

    const response = await apiClient.get<PageResponse<InventoryItemDto>>('/inventory', {
      params: cleanParams,
      signal,
    });
    return response.data;
  },

  /**
   * Get current inventory balance and hierarchy for a single variant.
   */
  getInventoryByVariantId: async (
    variantId: string | number,
    signal?: AbortSignal
  ): Promise<InventoryItemDto> => {
    const response = await apiClient.get<ApiResponse<InventoryItemDto>>(
      `/inventory/variants/${variantId}`,
      { signal }
    );
    return response.data.data;
  },

  /**
   * List global immutable stock movements with filters.
   */
  getMovements: async (
    params?: StockMovementFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<StockMovementDto>> => {
    const cleanParams: Record<string, unknown> = {};
    if (params) {
      if (params.variantId !== undefined && params.variantId !== '') cleanParams.variantId = params.variantId;
      if (params.movementType) cleanParams.movementType = params.movementType;
      if (params.direction) cleanParams.direction = params.direction;
      if (params.sourceEntityType) cleanParams.sourceEntityType = params.sourceEntityType;
      if (params.businessEventId) cleanParams.businessEventId = params.businessEventId;
      if (params.fromDate) cleanParams.fromDate = params.fromDate;
      if (params.toDate) cleanParams.toDate = params.toDate;
      if (params.page !== undefined) cleanParams.page = params.page;
      if (params.size !== undefined) cleanParams.size = params.size;
      if (params.sort) cleanParams.sort = params.sort;
    }

    const response = await apiClient.get<PageResponse<StockMovementDto>>('/inventory/movements', {
      params: cleanParams,
      signal,
    });
    return response.data;
  },

  /**
   * List immutable stock movements scoped to a specific variant.
   */
  getVariantMovements: async (
    variantId: string | number,
    params?: StockMovementFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<StockMovementDto>> => {
    const cleanParams: Record<string, unknown> = {};
    if (params) {
      if (params.movementType) cleanParams.movementType = params.movementType;
      if (params.direction) cleanParams.direction = params.direction;
      if (params.sourceEntityType) cleanParams.sourceEntityType = params.sourceEntityType;
      if (params.businessEventId) cleanParams.businessEventId = params.businessEventId;
      if (params.fromDate) cleanParams.fromDate = params.fromDate;
      if (params.toDate) cleanParams.toDate = params.toDate;
      if (params.page !== undefined) cleanParams.page = params.page;
      if (params.size !== undefined) cleanParams.size = params.size;
      if (params.sort) cleanParams.sort = params.sort;
    }

    const response = await apiClient.get<PageResponse<StockMovementDto>>(
      `/inventory/variants/${variantId}/movements`,
      {
        params: cleanParams,
        signal,
      }
    );
    return response.data;
  },

  /**
   * Perform authorized operational stock adjustments (IN/OUT) with optimistic locking and idempotency.
   */
  createAdjustment: async (
    request: CreateManualAdjustmentRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<ManualAdjustmentResponse> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await apiClient.post<ApiResponse<ManualAdjustmentResponse>>(
      '/inventory/adjustments',
      request,
      {
        headers,
        signal,
      }
    );
    return response.data.data;
  },
};
