import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  CustomerSelector,
  CustomerSiteSelector,
  SupplierSelector,
} from '../src/components/party';
import { customerApi, customerSiteApi, supplierApi } from '../src/api/party.api';
import { CustomerDto, CustomerSiteDto, SupplierDto } from '../src/types/party.types';

vi.mock('../src/api/party.api', () => ({
  customerApi: {
    getCustomers: vi.fn(),
  },
  customerSiteApi: {
    getSites: vi.fn(),
  },
  supplierApi: {
    getSuppliers: vi.fn(),
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('FE03 Reusable Party Selectors', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  describe('CustomerSelector', () => {
    it('loads active customers and displays code, name, and phone', async () => {
      const mockCustomers: CustomerDto[] = [
        {
          id: '101',
          customerCode: 'CUST-00001',
          customerType: 'CONTRACTOR',
          name: 'Patil Constructions',
          phone: '+91 9822334455',
          isActive: true,
          version: 1,
          createdAt: '',
          updatedAt: '',
        },
      ];
      (customerApi.getCustomers as any).mockResolvedValue({ data: mockCustomers });

      const handleChange = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <CustomerSelector value="" onChange={handleChange} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/\[CUST-00001\] Patil Constructions/i)).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '101' } });

      expect(handleChange).toHaveBeenCalledWith('101', mockCustomers[0]);
    });

    it('displays inactive historical customer reference with (Inactive) badge', async () => {
      (customerApi.getCustomers as any).mockResolvedValue({ data: [] });

      const historicalInactiveCustomer: CustomerDto = {
        id: '999',
        customerCode: 'CUST-00999',
        customerType: 'BUILDER',
        name: 'Defunct Builders Corp',
        isActive: false,
        version: 1,
        createdAt: '',
        updatedAt: '',
      };

      render(
        <QueryClientProvider client={queryClient}>
          <CustomerSelector
            value="999"
            onChange={vi.fn()}
            initialCustomer={historicalInactiveCustomer}
          />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Defunct Builders Corp \(BUILDER\) \(Inactive\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('CustomerSiteSelector', () => {
    it('is disabled and prompts when no customerId is provided', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <CustomerSiteSelector customerId={null} onChange={vi.fn()} />
        </QueryClientProvider>
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
      expect(screen.getByText(/Select a customer first/i)).toBeInTheDocument();
    });

    it('loads sites for the provided customer and allows "No specific site" selection', async () => {
      const mockSites: CustomerSiteDto[] = [
        {
          id: '501',
          customerId: '101',
          siteName: 'Greenwood Heights Phase 1',
          city: 'Pune',
          isActive: true,
          version: 1,
          createdAt: '',
          updatedAt: '',
        },
      ];
      (customerSiteApi.getSites as any).mockResolvedValue({ data: mockSites });

      const handleChange = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <CustomerSiteSelector
            customerId="101"
            value=""
            onChange={handleChange}
          />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Greenwood Heights Phase 1/i)).toBeInTheDocument();
      });

      expect(
        screen.getByText(/No specific site \(Direct counter \/ Shop delivery\)/i)
      ).toBeInTheDocument();

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '501' } });

      expect(handleChange).toHaveBeenCalledWith('501', mockSites[0]);
    });

    it('clears selected site when customerId changes to prevent cross-customer mismatch', () => {
      (customerSiteApi.getSites as any).mockResolvedValue({ data: [] });

      const handleChange = vi.fn();

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <CustomerSiteSelector
            customerId="101"
            value="501"
            onChange={handleChange}
          />
        </QueryClientProvider>
      );

      // Parent changes customer to 102
      rerender(
        <QueryClientProvider client={queryClient}>
          <CustomerSiteSelector
            customerId="102"
            value="501"
            onChange={handleChange}
          />
        </QueryClientProvider>
      );

      // Verifies that site was automatically cleared!
      expect(handleChange).toHaveBeenCalledWith('', undefined);
    });
  });

  describe('SupplierSelector', () => {
    it('loads active suppliers and triggers onChange on selection', async () => {
      const mockSuppliers: SupplierDto[] = [
        {
          id: '301',
          supplierCode: 'SUPP-00001',
          name: 'Asian Paints Regional Depot',
          contactPerson: 'Mr. Arvind Joshi',
          city: 'Pune',
          isActive: true,
          version: 1,
          createdAt: '',
          updatedAt: '',
        },
      ];
      (supplierApi.getSuppliers as any).mockResolvedValue({ data: mockSuppliers });

      const handleChange = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <SupplierSelector value="" onChange={handleChange} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/\[SUPP-00001\] Asian Paints Regional Depot/i)).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '301' } });

      expect(handleChange).toHaveBeenCalledWith('301', mockSuppliers[0]);
    });
  });
});
