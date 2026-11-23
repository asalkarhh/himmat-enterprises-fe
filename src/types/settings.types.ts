/**
 * Shop Settings contract matching Himmat backend singleton.
 */

export interface ShopSettingsResponse {
  id: string; // BIGINT serialized as string
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  stateCode?: string | null;
  currency?: string | null;
  timezone?: string | null;
  creditDays?: number | null;
  invoicePrefix?: string | null;
  version: number;
  updatedAt: string;
}

export interface UpdateShopSettingsRequest {
  expectedVersion: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  stateCode?: string | null;
  currency?: string | null;
  timezone?: string | null;
  creditDays?: number | null;
  invoicePrefix?: string | null;
}
