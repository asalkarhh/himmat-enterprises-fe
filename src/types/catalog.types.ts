/**
 * Catalog Types matching Himmat BE02 contracts.
 */

export type PricingMethod = 'MRP_DISCOUNT' | 'COST_PLUS' | 'FIXED';

// --- Brands ---
export interface BrandDto {
  id: string; // BIGINT serialized as string
  name: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandRequest {
  name: string;
}

export interface UpdateBrandRequest {
  expectedVersion: number;
  name?: string;
  isActive?: boolean;
}

export interface BrandFilterParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

// --- Categories ---
export interface CategoryDto {
  id: string;
  name: string;
  purchaseDiscountPct: string; // Decimal string 0-100
  salesDiscountPct: string; // Decimal string 0-100
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  purchaseDiscountPct?: string | null;
  salesDiscountPct?: string | null;
}

export interface UpdateCategoryRequest {
  expectedVersion: number;
  name?: string;
  purchaseDiscountPct?: string | null;
  salesDiscountPct?: string | null;
  isActive?: boolean;
}

export interface CategoryFilterParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

// --- Subcategories ---
export interface SubcategoryDto {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubcategoryRequest {
  categoryId: string | number;
  name: string;
}

export interface UpdateSubcategoryRequest {
  expectedVersion: number;
  name?: string;
  isActive?: boolean;
}

export interface SubcategoryFilterParams {
  categoryId?: string | number;
  search?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

// --- Products ---
export interface ProductDto {
  id: string;
  brandId: string;
  brandName: string;
  subcategoryId: string;
  subcategoryName: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  brandId: string | number;
  subcategoryId: string | number;
  name: string;
  description?: string | null;
}

export interface UpdateProductRequest {
  expectedVersion: number;
  brandId?: string | number;
  subcategoryId?: string | number;
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface ProductFilterParams {
  brandId?: string | number;
  categoryId?: string | number;
  subcategoryId?: string | number;
  search?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

// --- Product Variants ---
export interface ProductVariantDto {
  id: string;
  productId: string;
  productName: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  sku: string;
  sizeLabel: string;
  pricingMethod: PricingMethod;
  mrpInclTax?: string | null; // Decimal string
  fixedPriceInclTax?: string | null; // Decimal string
  purchaseCostExclTax?: string | null; // Decimal string
  profitPct?: string | null; // Decimal string
  gstRatePct?: string | null; // Decimal string
  hsnCode?: string | null;
  lowStockThreshold: number;
  quantityOnHand: number;
  openingConfirmed: boolean;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductVariantRequest {
  productId: string | number;
  sku: string;
  sizeLabel: string;
  pricingMethod: PricingMethod;
  mrpInclTax?: string | null;
  fixedPriceInclTax?: string | null;
  purchaseCostExclTax?: string | null;
  profitPct?: string | null;
  gstRatePct?: string | null;
  hsnCode?: string | null;
  lowStockThreshold?: number;
}

export interface UpdateProductVariantRequest {
  expectedVersion: number;
  sku?: string;
  sizeLabel?: string;
  pricingMethod?: PricingMethod;
  mrpInclTax?: string | null;
  fixedPriceInclTax?: string | null;
  purchaseCostExclTax?: string | null;
  profitPct?: string | null;
  gstRatePct?: string | null;
  hsnCode?: string | null;
  lowStockThreshold?: number;
  isActive?: boolean;
  overrideReason?: string;
}

export interface VariantFilterParams {
  productId?: string | number;
  search?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}
