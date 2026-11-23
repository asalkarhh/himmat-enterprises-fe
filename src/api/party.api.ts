import apiClient from './client';
import { ApiResponse, PageResponse } from '../types/api.types';
import {
  CustomerDto,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerFilterParams,
  CustomerSiteDto,
  CreateCustomerSiteRequest,
  UpdateCustomerSiteRequest,
  CustomerSiteFilterParams,
  SupplierDto,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierFilterParams,
} from '../types/party.types';

// --- Customer API ---
export const customerApi = {
  getCustomers: async (
    params?: CustomerFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<CustomerDto>> => {
    const res = await apiClient.get<PageResponse<CustomerDto>>('/customers', { params, signal });
    return res.data;
  },

  getCustomerById: async (id: string | number, signal?: AbortSignal): Promise<CustomerDto> => {
    const res = await apiClient.get<ApiResponse<CustomerDto>>(`/customers/${id}`, { signal });
    return res.data.data;
  },

  createCustomer: async (
    payload: CreateCustomerRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<CustomerDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.post<ApiResponse<CustomerDto>>('/customers', payload, { headers, signal });
    return res.data.data;
  },

  updateCustomer: async (
    id: string | number,
    payload: UpdateCustomerRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<CustomerDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.patch<ApiResponse<CustomerDto>>(`/customers/${id}`, payload, { headers, signal });
    return res.data.data;
  },
};

// --- Customer Sites API ---
export const customerSiteApi = {
  getSites: async (
    customerId: string | number,
    params?: CustomerSiteFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<CustomerSiteDto>> => {
    const res = await apiClient.get<PageResponse<CustomerSiteDto>>(`/customers/${customerId}/sites`, {
      params,
      signal,
    });
    return res.data;
  },

  getSiteById: async (
    customerId: string | number,
    siteId: string | number,
    signal?: AbortSignal
  ): Promise<CustomerSiteDto> => {
    const res = await apiClient.get<ApiResponse<CustomerSiteDto>>(
      `/customers/${customerId}/sites/${siteId}`,
      { signal }
    );
    return res.data.data;
  },

  createSite: async (
    customerId: string | number,
    payload: CreateCustomerSiteRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<CustomerSiteDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.post<ApiResponse<CustomerSiteDto>>(
      `/customers/${customerId}/sites`,
      payload,
      { headers, signal }
    );
    return res.data.data;
  },

  updateSite: async (
    customerId: string | number,
    siteId: string | number,
    payload: UpdateCustomerSiteRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<CustomerSiteDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.patch<ApiResponse<CustomerSiteDto>>(
      `/customers/${customerId}/sites/${siteId}`,
      payload,
      { headers, signal }
    );
    return res.data.data;
  },
};

// --- Supplier API ---
export const supplierApi = {
  getSuppliers: async (
    params?: SupplierFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<SupplierDto>> => {
    const res = await apiClient.get<PageResponse<SupplierDto>>('/suppliers', { params, signal });
    return res.data;
  },

  getSupplierById: async (id: string | number, signal?: AbortSignal): Promise<SupplierDto> => {
    const res = await apiClient.get<ApiResponse<SupplierDto>>(`/suppliers/${id}`, { signal });
    return res.data.data;
  },

  createSupplier: async (
    payload: CreateSupplierRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<SupplierDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.post<ApiResponse<SupplierDto>>('/suppliers', payload, { headers, signal });
    return res.data.data;
  },

  updateSupplier: async (
    id: string | number,
    payload: UpdateSupplierRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<SupplierDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.patch<ApiResponse<SupplierDto>>(`/suppliers/${id}`, payload, { headers, signal });
    return res.data.data;
  },
};
