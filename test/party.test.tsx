import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../src/api/client';
import {
  customerApi,
  customerSiteApi,
  supplierApi,
} from '../src/api/party.api';
import {
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateCustomerSiteRequest,
  UpdateCustomerSiteRequest,
  CreateSupplierRequest,
  UpdateSupplierRequest,
} from '../src/types/party.types';

vi.mock('../src/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('FE03 Party API & Domain Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Customer API', () => {
    it('fetches paginated customers with search, customerType, and active filters', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: '101',
              customerCode: 'CUST-00001',
              customerType: 'CONTRACTOR',
              name: 'Patil Constructions',
              phone: '+91 9822334455',
              isActive: true,
              version: 1,
              createdAt: '2026-11-20T10:00:00Z',
              updatedAt: '2026-11-20T10:00:00Z',
            },
          ],
          page: 0,
          size: 15,
          totalElements: 1,
          totalPages: 1,
          requestId: 'req-cust-1',
        },
      };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await customerApi.getCustomers({
        search: 'Patil',
        customerType: 'CONTRACTOR',
        isActive: true,
        page: 0,
        size: 15,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/customers', {
        params: {
          search: 'Patil',
          customerType: 'CONTRACTOR',
          isActive: true,
          page: 0,
          size: 15,
        },
        signal: undefined,
      });
      expect(result.data.length).toBe(1);
      expect(result.data[0].customerCode).toBe('CUST-00001');
      expect(result.data[0].customerType).toBe('CONTRACTOR');
    });

    it('creates retail customer with name only, omitting optional phone and GSTIN', async () => {
      const payload: CreateCustomerRequest = {
        customerType: 'RETAIL',
        name: 'Sunil Walk-in Customer',
      };

      (apiClient.post as any).mockResolvedValue({
        data: {
          data: {
            id: '102',
            customerCode: 'CUST-00002',
            customerType: 'RETAIL',
            name: 'Sunil Walk-in Customer',
            phone: null,
            email: null,
            gstin: null,
            isActive: true,
            version: 0,
            createdAt: '2026-11-20T10:00:00Z',
            updatedAt: '2026-11-20T10:00:00Z',
          },
          requestId: 'req-cust-create-1',
        },
      });

      const customer = await customerApi.createCustomer(payload, 'idemp-cust-1');

      expect(apiClient.post).toHaveBeenCalledWith('/customers', payload, {
        headers: { 'Idempotency-Key': 'idemp-cust-1' },
        signal: undefined,
      });
      expect(customer.id).toBe('102');
      expect(customer.customerCode).toBe('CUST-00002');
      expect(customer.customerType).toBe('RETAIL');
      expect(customer.phone).toBeNull();
    });

    it('preserves phone number with leading plus sign and postal code as string', async () => {
      const payload: CreateCustomerRequest = {
        customerType: 'BUILDER',
        name: 'Pride Developers Pune',
        phone: '+91 9822001122',
        postalCode: '0411057', // Preserves string leading zero
        gstin: '27AAAAA1234A1Z5',
      };

      (apiClient.post as any).mockResolvedValue({
        data: {
          data: {
            id: '103',
            customerCode: 'CUST-00003',
            ...payload,
            isActive: true,
            version: 0,
            createdAt: '2026-11-20T10:00:00Z',
            updatedAt: '2026-11-20T10:00:00Z',
          },
          requestId: 'req-cust-create-2',
        },
      });

      const customer = await customerApi.createCustomer(payload);
      expect(customer.phone).toBe('+91 9822001122');
      expect(customer.postalCode).toBe('0411057');
    });

    it('updates customer sending expectedVersion and allows clearing optional fields with null', async () => {
      const updatePayload: UpdateCustomerRequest = {
        expectedVersion: 1,
        name: 'Patil Infrastructure Ltd',
        phone: null, // Explicitly clearing phone
        notes: 'Updated contact person details',
      };

      (apiClient.patch as any).mockResolvedValue({
        data: {
          data: {
            id: '101',
            customerCode: 'CUST-00001',
            customerType: 'CONTRACTOR',
            name: 'Patil Infrastructure Ltd',
            phone: null,
            version: 2,
            isActive: true,
          },
          requestId: 'req-cust-update-1',
        },
      });

      const updated = await customerApi.updateCustomer('101', updatePayload);

      expect(apiClient.patch).toHaveBeenCalledWith('/customers/101', updatePayload, {
        headers: undefined,
        signal: undefined,
      });
      expect(updated.version).toBe(2);
      expect(updated.phone).toBeNull();
    });
  });

  describe('Customer Sites API', () => {
    it('fetches sites nested under customerId', async () => {
      const mockSitesResponse = {
        data: {
          data: [
            {
              id: '501',
              customerId: '101',
              siteName: 'Greenwood Heights Phase 1',
              city: 'Pune',
              contactPerson: 'Supervisor Shinde',
              contactPhone: '9876543210',
              isActive: true,
              version: 1,
            },
          ],
          page: 0,
          size: 15,
          totalElements: 1,
          totalPages: 1,
          requestId: 'req-sites-1',
        },
      };
      (apiClient.get as any).mockResolvedValue(mockSitesResponse);

      const result = await customerSiteApi.getSites('101', { isActive: true });

      expect(apiClient.get).toHaveBeenCalledWith('/customers/101/sites', {
        params: { isActive: true },
        signal: undefined,
      });
      expect(result.data.length).toBe(1);
      expect(result.data[0].siteName).toBe('Greenwood Heights Phase 1');
      expect(result.data[0].customerId).toBe('101');
    });

    it('creates customer site bound strictly to parent customer', async () => {
      const createPayload: CreateCustomerSiteRequest = {
        siteName: 'Riverside Enclave Wing B',
        addressLine1: 'Survey 45, Baner Road',
        city: 'Pune',
        contactPerson: 'Kishore Engg',
        contactPhone: '+91 9888877777',
      };

      (apiClient.post as any).mockResolvedValue({
        data: {
          data: {
            id: '502',
            customerId: '101',
            ...createPayload,
            isActive: true,
            version: 0,
          },
          requestId: 'req-site-create-1',
        },
      });

      const site = await customerSiteApi.createSite('101', createPayload, 'idemp-site-1');

      expect(apiClient.post).toHaveBeenCalledWith('/customers/101/sites', createPayload, {
        headers: { 'Idempotency-Key': 'idemp-site-1' },
        signal: undefined,
      });
      expect(site.id).toBe('502');
      expect(site.customerId).toBe('101');
    });

    it('updates site with expectedVersion and optimistic locking', async () => {
      const updatePayload: UpdateCustomerSiteRequest = {
        expectedVersion: 0,
        siteName: 'Riverside Enclave Wing B (Complete)',
        isActive: true,
      };

      (apiClient.patch as any).mockResolvedValue({
        data: {
          data: {
            id: '502',
            customerId: '101',
            siteName: 'Riverside Enclave Wing B (Complete)',
            version: 1,
            isActive: true,
          },
          requestId: 'req-site-update-1',
        },
      });

      const updated = await customerSiteApi.updateSite('101', '502', updatePayload);

      expect(apiClient.patch).toHaveBeenCalledWith('/customers/101/sites/502', updatePayload, {
        headers: undefined,
        signal: undefined,
      });
      expect(updated.version).toBe(1);
    });
  });

  describe('Supplier API', () => {
    it('fetches paginated suppliers with search and active filters', async () => {
      const mockSuppliersResponse = {
        data: {
          data: [
            {
              id: '301',
              supplierCode: 'SUPP-00001',
              name: 'Asian Paints Regional Depot',
              contactPerson: 'Mr. Arvind Joshi',
              phone: '020-2445566',
              city: 'Pune',
              isActive: true,
              version: 1,
            },
          ],
          page: 0,
          size: 15,
          totalElements: 1,
          totalPages: 1,
          requestId: 'req-supp-1',
        },
      };
      (apiClient.get as any).mockResolvedValue(mockSuppliersResponse);

      const result = await supplierApi.getSuppliers({ search: 'Asian', isActive: true });

      expect(apiClient.get).toHaveBeenCalledWith('/suppliers', {
        params: { search: 'Asian', isActive: true },
        signal: undefined,
      });
      expect(result.data.length).toBe(1);
      expect(result.data[0].supplierCode).toBe('SUPP-00001');
      expect(result.data[0].name).toBe('Asian Paints Regional Depot');
    });

    it('creates supplier with server-generated supplierCode', async () => {
      const createPayload: CreateSupplierRequest = {
        name: 'Supreme Industries Distributorship',
        contactPerson: 'Rajesh Shah',
        phone: '+91 9422012345',
        gstin: '27AABCS1234D1Z2',
        city: 'Jalgaon',
      };

      (apiClient.post as any).mockResolvedValue({
        data: {
          data: {
            id: '302',
            supplierCode: 'SUPP-00002',
            ...createPayload,
            isActive: true,
            version: 0,
          },
          requestId: 'req-supp-create-1',
        },
      });

      const supplier = await supplierApi.createSupplier(createPayload, 'idemp-supp-1');

      expect(apiClient.post).toHaveBeenCalledWith('/suppliers', createPayload, {
        headers: { 'Idempotency-Key': 'idemp-supp-1' },
        signal: undefined,
      });
      expect(supplier.id).toBe('302');
      expect(supplier.supplierCode).toBe('SUPP-00002');
    });

    it('updates supplier with expectedVersion', async () => {
      const updatePayload: UpdateSupplierRequest = {
        expectedVersion: 0,
        phone: '+91 9422099999',
        notes: 'Changed primary dispatch coordinator',
      };

      (apiClient.patch as any).mockResolvedValue({
        data: {
          data: {
            id: '302',
            supplierCode: 'SUPP-00002',
            name: 'Supreme Industries Distributorship',
            phone: '+91 9422099999',
            notes: 'Changed primary dispatch coordinator',
            version: 1,
            isActive: true,
          },
          requestId: 'req-supp-update-1',
        },
      });

      const updated = await supplierApi.updateSupplier('302', updatePayload);

      expect(apiClient.patch).toHaveBeenCalledWith('/suppliers/302', updatePayload, {
        headers: undefined,
        signal: undefined,
      });
      expect(updated.version).toBe(1);
    });
  });
});
