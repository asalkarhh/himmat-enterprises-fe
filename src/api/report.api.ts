import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import {
  SalesReportDto,
  SalesReportFilterParams,
  PurchaseReportDto,
  PurchaseReportFilterParams,
  InventoryReportDto,
  InventoryReportFilterParams,
  CashMovementReportDto,
  CashMovementReportFilterParams,
  ProfitReportDto,
  ProfitReportFilterParams,
  ProductProfitItemDto,
} from '../types/report.types';

export const reportApi = {
  getSalesReport: async (
    params?: SalesReportFilterParams,
    signal?: AbortSignal
  ): Promise<SalesReportDto> => {
    const res = await apiClient.get<ApiResponse<SalesReportDto>>('/reports/sales', {
      params,
      signal,
    });
    return res.data.data;
  },

  getPurchaseReport: async (
    params?: PurchaseReportFilterParams,
    signal?: AbortSignal
  ): Promise<PurchaseReportDto> => {
    const res = await apiClient.get<ApiResponse<PurchaseReportDto>>('/reports/purchases', {
      params,
      signal,
    });
    return res.data.data;
  },

  getInventoryReport: async (
    params?: InventoryReportFilterParams,
    signal?: AbortSignal
  ): Promise<InventoryReportDto> => {
    const res = await apiClient.get<ApiResponse<InventoryReportDto>>('/reports/inventory', {
      params,
      signal,
    });
    return res.data.data;
  },

  getCashMovementReport: async (
    params?: CashMovementReportFilterParams,
    signal?: AbortSignal
  ): Promise<CashMovementReportDto> => {
    const res = await apiClient.get<ApiResponse<CashMovementReportDto>>('/reports/cash-movements', {
      params,
      signal,
    });
    return res.data.data;
  },

  getProfitReport: async (
    params?: ProfitReportFilterParams,
    signal?: AbortSignal
  ): Promise<ProfitReportDto> => {
    const res = await apiClient.get<ApiResponse<ProfitReportDto>>('/reports/profit', {
      params,
      signal,
    });
    return res.data.data;
  },

  getProductProfitReport: async (
    params?: ProfitReportFilterParams,
    signal?: AbortSignal
  ): Promise<ProductProfitItemDto[]> => {
    const res = await apiClient.get<ApiResponse<ProductProfitItemDto[]>>('/reports/profit/products', {
      params,
      signal,
    });
    return res.data.data;
  },
};
