import apiClient from './client';
import { ApiResponse, PageResponse } from '../types/api.types';
import {
  BrandDto,
  CreateBrandRequest,
  UpdateBrandRequest,
  BrandFilterParams,
  CategoryDto,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryFilterParams,
  SubcategoryDto,
  CreateSubcategoryRequest,
  UpdateSubcategoryRequest,
  SubcategoryFilterParams,
  ProductDto,
  CreateProductRequest,
  UpdateProductRequest,
  ProductFilterParams,
  ProductVariantDto,
  CreateProductVariantRequest,
  UpdateProductVariantRequest,
  VariantFilterParams,
} from '../types/catalog.types';

// --- Brands API ---
export const brandApi = {
  getBrands: async (params?: BrandFilterParams, signal?: AbortSignal): Promise<PageResponse<BrandDto>> => {
    const res = await apiClient.get<PageResponse<BrandDto>>('/brands', { params, signal });
    return res.data;
  },

  getBrandById: async (id: string | number, signal?: AbortSignal): Promise<BrandDto> => {
    const res = await apiClient.get<ApiResponse<BrandDto>>(`/brands/${id}`, { signal });
    return res.data.data;
  },

  createBrand: async (payload: CreateBrandRequest, idempotencyKey?: string, signal?: AbortSignal): Promise<BrandDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.post<ApiResponse<BrandDto>>('/brands', payload, { headers, signal });
    return res.data.data;
  },

  updateBrand: async (
    id: string | number,
    payload: UpdateBrandRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<BrandDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.patch<ApiResponse<BrandDto>>(`/brands/${id}`, payload, { headers, signal });
    return res.data.data;
  },
};

// --- Categories API ---
export const categoryApi = {
  getCategories: async (params?: CategoryFilterParams, signal?: AbortSignal): Promise<PageResponse<CategoryDto>> => {
    const res = await apiClient.get<PageResponse<CategoryDto>>('/categories', { params, signal });
    return res.data;
  },

  getCategoryById: async (id: string | number, signal?: AbortSignal): Promise<CategoryDto> => {
    const res = await apiClient.get<ApiResponse<CategoryDto>>(`/categories/${id}`, { signal });
    return res.data.data;
  },

  createCategory: async (
    payload: CreateCategoryRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<CategoryDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.post<ApiResponse<CategoryDto>>('/categories', payload, { headers, signal });
    return res.data.data;
  },

  updateCategory: async (
    id: string | number,
    payload: UpdateCategoryRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<CategoryDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.patch<ApiResponse<CategoryDto>>(`/categories/${id}`, payload, { headers, signal });
    return res.data.data;
  },
};

// --- Subcategories API ---
export const subcategoryApi = {
  getSubcategories: async (
    params?: SubcategoryFilterParams,
    signal?: AbortSignal
  ): Promise<PageResponse<SubcategoryDto>> => {
    const res = await apiClient.get<PageResponse<SubcategoryDto>>('/subcategories', { params, signal });
    return res.data;
  },

  getSubcategoryById: async (id: string | number, signal?: AbortSignal): Promise<SubcategoryDto> => {
    const res = await apiClient.get<ApiResponse<SubcategoryDto>>(`/subcategories/${id}`, { signal });
    return res.data.data;
  },

  createSubcategory: async (
    payload: CreateSubcategoryRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<SubcategoryDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.post<ApiResponse<SubcategoryDto>>('/subcategories', payload, { headers, signal });
    return res.data.data;
  },

  updateSubcategory: async (
    id: string | number,
    payload: UpdateSubcategoryRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<SubcategoryDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.patch<ApiResponse<SubcategoryDto>>(`/subcategories/${id}`, payload, { headers, signal });
    return res.data.data;
  },
};

// --- Products API ---
export const productApi = {
  getProducts: async (params?: ProductFilterParams, signal?: AbortSignal): Promise<PageResponse<ProductDto>> => {
    const res = await apiClient.get<PageResponse<ProductDto>>('/products', { params, signal });
    return res.data;
  },

  getProductById: async (id: string | number, signal?: AbortSignal): Promise<ProductDto> => {
    const res = await apiClient.get<ApiResponse<ProductDto>>(`/products/${id}`, { signal });
    return res.data.data;
  },

  createProduct: async (
    payload: CreateProductRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<ProductDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.post<ApiResponse<ProductDto>>('/products', payload, { headers, signal });
    return res.data.data;
  },

  updateProduct: async (
    id: string | number,
    payload: UpdateProductRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<ProductDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.patch<ApiResponse<ProductDto>>(`/products/${id}`, payload, { headers, signal });
    return res.data.data;
  },
};

// --- Product Variants API ---
export const variantApi = {
  getVariants: async (params?: VariantFilterParams, signal?: AbortSignal): Promise<PageResponse<ProductVariantDto>> => {
    const res = await apiClient.get<PageResponse<ProductVariantDto>>('/variants', { params, signal });
    return res.data;
  },

  getVariantById: async (id: string | number, signal?: AbortSignal): Promise<ProductVariantDto> => {
    const res = await apiClient.get<ApiResponse<ProductVariantDto>>(`/variants/${id}`, { signal });
    return res.data.data;
  },

  createVariant: async (
    payload: CreateProductVariantRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<ProductVariantDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.post<ApiResponse<ProductVariantDto>>('/variants', payload, { headers, signal });
    return res.data.data;
  },

  updateVariant: async (
    id: string | number,
    payload: UpdateProductVariantRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<ProductVariantDto> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const res = await apiClient.patch<ApiResponse<ProductVariantDto>>(`/variants/${id}`, payload, { headers, signal });
    return res.data.data;
  },
};
