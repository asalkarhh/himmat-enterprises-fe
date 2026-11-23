/**
 * Inventory & Stock Movement Types matching Himmat BE04A contracts.
 */

import { PricingMethod } from './catalog.types';

export type StockMovementType =
  | 'MANUAL_ADJUSTMENT_IN'
  | 'MANUAL_ADJUSTMENT_OUT'
  | 'PURCHASE_RECEIPT'
  | 'PURCHASE_RETURN'
  | 'SALE'
  | 'CUSTOMER_RETURN'
  | 'REVERSAL'
  | (string & {});

export type StockMovementDirection = 'IN' | 'OUT';

export type StockStatusFilter = 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK';

export interface InventoryItemDto {
  variantId: string; // BIGINT serialized as string
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
  mrpInclTax?: string | null;
  fixedPriceInclTax?: string | null;
  quantityOnHand: number; // Integer whole pieces
  lowStockThreshold?: number | null;
  isLowStock: boolean;
  openingConfirmed: boolean;
  version: number; // Concurrency version for optimistic locking
  isActive: boolean;
  updatedAt?: string | null;
}

export interface InventoryFilterParams {
  brandId?: string | number;
  categoryId?: string | number;
  subcategoryId?: string | number;
  isActive?: boolean;
  search?: string;
  stockStatus?: StockStatusFilter;
  page?: number;
  size?: number;
  sort?: string;
}

export interface StockMovementDto {
  id: string; // BIGINT serialized as string
  variantId: string;
  sku: string;
  sizeLabel?: string;
  productId?: string;
  productName?: string;
  businessEventId?: string;
  movementType: StockMovementType;
  direction: StockMovementDirection;
  quantity: number; // Positive integer pieces
  quantityBefore: number;
  quantityAfter: number;
  sourceEntityType?: string;
  sourceEntityId?: string;
  sourceLineId?: string | number;
  sourceEffectKey?: string;
  reason?: string;
  actorId?: string | number;
  occurredAt: string; // ISO-8601 Instant
  createdAt?: string; // ISO-8601 Instant
}

export interface StockMovementFilterParams {
  variantId?: string | number;
  movementType?: StockMovementType;
  direction?: StockMovementDirection;
  sourceEntityType?: string;
  businessEventId?: string | number;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  page?: number;
  size?: number;
  sort?: string;
}

export interface ManualAdjustmentLineRequest {
  variantId: string | number;
  direction: StockMovementDirection;
  quantity: number; // Positive whole integer >= 1
  expectedVersion: number;
}

export interface CreateManualAdjustmentRequest {
  reason: string; // 3 to 500 characters
  lines: ManualAdjustmentLineRequest[];
}

export interface ManualAdjustmentLineResultDto {
  variantId: string;
  sku: string;
  productName: string;
  direction: StockMovementDirection;
  quantity: number;
  previousQuantityOnHand: number;
  newQuantityOnHand: number;
  previousVersion: number;
  newVersion: number;
  movementId?: string;
}

export interface ManualAdjustmentResponse {
  eventId?: string | number;
  eventKey?: string;
  reason: string;
  occurredAt: string;
  lines: ManualAdjustmentLineResultDto[];
}
