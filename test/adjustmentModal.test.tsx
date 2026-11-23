import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StockAdjustmentModal } from '../src/components/inventory/StockAdjustmentModal';
import { inventoryApi } from '../src/api/inventory.api';
import { variantApi } from '../src/api/catalog.api';
import { InventoryItemDto } from '../src/types/inventory.types';

vi.mock('../src/api/inventory.api', () => ({
  inventoryApi: {
    getInventoryByVariantId: vi.fn(),
    createAdjustment: vi.fn(),
  },
}));

vi.mock('../src/api/catalog.api', () => ({
  variantApi: {
    getVariants: vi.fn(),
  },
}));

vi.mock('../src/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('StockAdjustmentModal Component Tests', () => {
  let queryClient: QueryClient;

  const mockVariant1: InventoryItemDto = {
    variantId: '101',
    productId: '1',
    productName: 'Royale Luxury Emulsion',
    brandId: '10',
    brandName: 'Asian Paints',
    categoryId: '20',
    categoryName: 'Paints',
    subcategoryId: '30',
    subcategoryName: 'Emulsion',
    sku: 'ROYALE-1L',
    sizeLabel: '1 Litre',
    pricingMethod: 'MRP_DISCOUNT',
    quantityOnHand: 10,
    lowStockThreshold: 5,
    isLowStock: false,
    openingConfirmed: false,
    version: 2,
    isActive: true,
  };

  const mockVariant2: InventoryItemDto = {
    variantId: '102',
    productId: '1',
    productName: 'Royale Luxury Emulsion',
    brandId: '10',
    brandName: 'Asian Paints',
    categoryId: '20',
    categoryName: 'Paints',
    subcategoryId: '30',
    subcategoryName: 'Emulsion',
    sku: 'ROYALE-4L',
    sizeLabel: '4 Litre',
    pricingMethod: 'MRP_DISCOUNT',
    quantityOnHand: 0,
    lowStockThreshold: 2,
    isLowStock: true,
    openingConfirmed: false,
    version: 0,
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();

    (variantApi.getVariants as any).mockResolvedValue({
      data: [mockVariant1, mockVariant2],
      page: 0,
      size: 100,
      totalElements: 2,
      totalPages: 1,
    });

    (inventoryApi.getInventoryByVariantId as any).mockImplementation((id: string) => {
      if (id === '101') return Promise.resolve(mockVariant1);
      if (id === '102') return Promise.resolve(mockVariant2);
      return Promise.reject(new Error('Variant not found'));
    });
  });

  const renderComponent = (props: {
    isOpen: boolean;
    onClose?: () => void;
    preselectedItem?: InventoryItemDto | null;
    onSuccess?: () => void;
  }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <StockAdjustmentModal
          isOpen={props.isOpen}
          onClose={props.onClose || vi.fn()}
          preselectedItem={props.preselectedItem}
          onSuccess={props.onSuccess}
        />
      </QueryClientProvider>
    );
  };

  it('renders adjustment modal with preselected variant details and initial balance', async () => {
    renderComponent({ isOpen: true, preselectedItem: mockVariant1 });

    expect(screen.getByText('Manual Stock Adjustment')).toBeInTheDocument();
    expect(screen.getByLabelText(/Business Reason/i)).toBeInTheDocument();
    expect(screen.getByText(/Current on hand:/i)).toBeInTheDocument();
    expect(screen.getAllByText('10 pcs').length).toBeGreaterThanOrEqual(1);
  });

  it('blocks review if reason is empty or shorter than 3 characters', async () => {
    renderComponent({ isOpen: true, preselectedItem: mockVariant1 });

    const qtyInput = screen.getByPlaceholderText(/e\.g\. 5/i);
    fireEvent.change(qtyInput, { target: { value: '3' } });

    const reviewButton = screen.getByRole('button', { name: /Review Adjustment/i });
    fireEvent.click(reviewButton);

    expect(
      screen.getByText(/Adjustment reason is required \(minimum 3 characters\)/i)
    ).toBeInTheDocument();
  });

  it('calculates live IN adjustment preview correctly', async () => {
    renderComponent({ isOpen: true, preselectedItem: mockVariant1 });

    const qtyInput = screen.getByPlaceholderText(/e\.g\. 5/i);
    fireEvent.change(qtyInput, { target: { value: '5' } });

    // Direction defaults to IN
    // 10 pcs + 5 pcs = 15 pcs
    expect(screen.getByText('15 pcs')).toBeInTheDocument();
  });

  it('strictly blocks OUT adjustment when requested quantity exceeds available stock', async () => {
    renderComponent({ isOpen: true, preselectedItem: mockVariant1 });

    // Switch to OUT
    const outButton = screen.getByRole('button', { name: /- OUT/i });
    fireEvent.click(outButton);

    // Current stock is 10, request 15
    const qtyInput = screen.getByPlaceholderText(/e\.g\. 5/i);
    fireEvent.change(qtyInput, { target: { value: '15' } });

    // Live warning shown
    expect(screen.getByText(/Insufficient stock: Cannot reduce below 0/i)).toBeInTheDocument();

    // Fill in reason
    const reasonInput = screen.getByLabelText(/Business Reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Broken bottles count' } });

    // Attempt to proceed
    const reviewButton = screen.getByRole('button', { name: /Review Adjustment/i });
    fireEvent.click(reviewButton);

    // Review step must NOT be reached; inline error must be shown
    expect(
      screen.getByText(/Cannot deduct 15 pcs\. Available on hand is only 10 pcs\. Negative stock is strictly prohibited\./i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Please verify the adjustment details before applying/i)).not.toBeInTheDocument();
  });

  it('blocks negative stock deduction on variant with zero stock on hand', async () => {
    renderComponent({ isOpen: true, preselectedItem: mockVariant2 });

    const outButton = screen.getByRole('button', { name: /- OUT/i });
    fireEvent.click(outButton);

    const qtyInput = screen.getByPlaceholderText(/e\.g\. 5/i);
    fireEvent.change(qtyInput, { target: { value: '1' } });

    const reasonInput = screen.getByLabelText(/Business Reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Physical verification disposal' } });

    const reviewButton = screen.getByRole('button', { name: /Review Adjustment/i });
    fireEvent.click(reviewButton);

    expect(
      screen.getByText(/Cannot deduct 1 pcs\. Available on hand is only 0 pcs/i)
    ).toBeInTheDocument();
  });

  it('proceeds to review step and commits adjustment successfully', async () => {
    (inventoryApi.createAdjustment as any).mockResolvedValue({
      eventId: '2001',
      eventKey: 'ADJ-EVT-001',
      reason: 'Physical annual verification',
      occurredAt: '2026-11-23T12:00:00Z',
      lines: [
        {
          variantId: '101',
          sku: 'ROYALE-1L',
          productName: 'Royale Luxury Emulsion',
          direction: 'IN',
          quantity: 4,
          previousQuantityOnHand: 10,
          newQuantityOnHand: 14,
          previousVersion: 2,
          newVersion: 3,
        },
      ],
    });

    const handleSuccess = vi.fn();
    renderComponent({
      isOpen: true,
      preselectedItem: mockVariant1,
      onSuccess: handleSuccess,
    });

    // Reason
    const reasonInput = screen.getByLabelText(/Business Reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Physical annual verification' } });

    // Quantity: 4 (IN)
    const qtyInput = screen.getByPlaceholderText(/e\.g\. 5/i);
    fireEvent.change(qtyInput, { target: { value: '4' } });

    // Proceed to review
    const reviewButton = screen.getByRole('button', { name: /Review Adjustment/i });
    fireEvent.click(reviewButton);

    // Review step is rendered
    expect(
      screen.getByText(/Please verify the adjustment details before applying/i)
    ).toBeInTheDocument();
    expect(screen.getByText('+4 pcs')).toBeInTheDocument();
    expect(screen.getByText('14 pcs')).toBeInTheDocument();

    // Confirm submission
    const confirmButton = screen.getByRole('button', { name: /Confirm & Apply Adjustment/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(inventoryApi.createAdjustment).toHaveBeenCalledTimes(1);
    });

    expect(inventoryApi.createAdjustment).toHaveBeenCalledWith(
      {
        reason: 'Physical annual verification',
        lines: [
          {
            variantId: '101',
            direction: 'IN',
            quantity: 4,
            expectedVersion: 2,
          },
        ],
      },
      expect.any(String) // Idempotency key UUID
    );

    await waitFor(() => {
      expect(screen.getByText('Adjustment committed successfully')).toBeInTheDocument();
      expect(screen.getByText('Stock Adjustment Applied')).toBeInTheDocument();
    });

    expect(handleSuccess).toHaveBeenCalledTimes(1);
  });
});
