/**
 * Party Domain Types (Customers, Sites, Suppliers)
 * Matching Himmat BE03 contracts and schema.
 */

// --- Customer Enums ---
export type CustomerType = 'RETAIL' | 'CONTRACTOR' | 'BUILDER';

// --- Customer DTOs ---
export interface CustomerDto {
  id: string; // BIGINT serialized as string
  customerCode: string; // Server-generated, read-only
  customerType: CustomerType;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  customerType: CustomerType;
  name: string;
  phone?: string;
  email?: string;
  gstin?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  notes?: string;
}

export interface UpdateCustomerRequest {
  expectedVersion: number;
  customerType?: CustomerType;
  name?: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface CustomerFilterParams {
  search?: string;
  customerType?: CustomerType;
  isActive?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

// --- Customer Site DTOs ---
export interface CustomerSiteDto {
  id: string; // BIGINT serialized as string
  customerId: string; // Parent customer ID
  customerName?: string;
  siteName: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerSiteRequest {
  siteName: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  contactPerson?: string;
  contactPhone?: string;
  notes?: string;
}

export interface UpdateCustomerSiteRequest {
  expectedVersion: number;
  siteName?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface CustomerSiteFilterParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

// --- Supplier DTOs ---
export interface SupplierDto {
  id: string; // BIGINT serialized as string
  supplierCode: string; // Server-generated, read-only
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierRequest {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  notes?: string;
}

export interface UpdateSupplierRequest {
  expectedVersion: number;
  name?: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface SupplierFilterParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}
