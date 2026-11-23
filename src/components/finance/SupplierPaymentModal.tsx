import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { CreditCard, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ErrorMessage } from '../ui/ErrorMessage';
import { PaymentComponentsInput } from './PaymentComponentsInput';
import { supplierFinanceApi, purchaseApi } from '../../api/purchase.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import {
  CreateSupplierPaymentRequest,
  PaymentComponentDto,
  PaymentAllocationRequest,
} from '../../types/purchase.types';
import { SupplierDto } from '../../types/party.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';
import { generateIdempotencyKey, parseApiError } from '../../api/apiHelpers';

export interface SupplierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierDto;
  onSuccess?: () => void;
}

export const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [components, setComponents] = useState<PaymentComponentDto[]>([
    { method: 'CASH', amount: '', onlineReference: '' },
  ]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch unpaid purchases for this supplier
  const { data: purchasesData, isLoading: isLoadingPurchases } = useQuery({
    queryKey: queryKeys.purchases.list({ supplierId: supplier.id, status: 'POSTED', size: 100 }),
    queryFn: ({ signal }) =>
      purchaseApi.getPurchases(
        { supplierId: supplier.id, status: 'POSTED', size: 100 },
        signal
      ),
    enabled: isOpen && !!supplier.id,
  });

  const unpaidPurchases = (purchasesData?.data || []).filter(
    (p) => parseFloat(p.outstandingBalance) > 0
  );

  const handleAllocationChange = (purchaseId: string, val: string) => {
    if (val === '' || /^\d*(\.\d{0,2})?$/.test(val)) {
      setAllocations((prev) => ({ ...prev, [purchaseId]: val }));
    }
  };

  // Component total calculation
  let componentsTotal = new Decimal(0);
  components.forEach((c) => {
    if (c.amount && !isNaN(Number(c.amount))) {
      componentsTotal = componentsTotal.plus(new Decimal(c.amount));
    }
  });

  // Allocation total calculation
  let allocatedTotal = new Decimal(0);
  const allocationRequests: PaymentAllocationRequest[] = [];
  Object.entries(allocations).forEach(([purchaseId, amtStr]) => {
    if (amtStr && !isNaN(Number(amtStr)) && parseFloat(amtStr) > 0) {
      const dec = new Decimal(amtStr);
      allocatedTotal = allocatedTotal.plus(dec);
      allocationRequests.push({ purchaseId, amount: dec.toFixed(2) });
    }
  });

  const unallocatedAmount = Decimal.max(0, componentsTotal.minus(allocatedTotal));

  const validate = (): string | null => {
    if (componentsTotal.lessThanOrEqualTo(0)) {
      return 'Payment amount must be greater than 0.';
    }
    if (allocatedTotal.greaterThan(componentsTotal)) {
      return `Total allocated amount (${formatInr(
        allocatedTotal.toFixed(2)
      )}) cannot exceed total payment amount (${formatInr(componentsTotal.toFixed(2))}).`;
    }

    for (const alloc of allocationRequests) {
      const p = unpaidPurchases.find((item) => String(item.id) === String(alloc.purchaseId));
      if (p && new Decimal(alloc.amount).greaterThan(new Decimal(p.outstandingBalance))) {
        return `Allocation for ${p.purchaseNumber} (${formatInr(
          alloc.amount
        )}) exceeds its outstanding balance of ${formatInr(p.outstandingBalance)}.`;
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setSubmitError(err);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload: CreateSupplierPaymentRequest = {
      paymentDate: paymentDate || undefined,
      totalAmount: componentsTotal.toFixed(2),
      notes: notes.trim() || undefined,
      components: components
        .filter((c) => c.amount && parseFloat(c.amount) > 0)
        .map((c) => ({
          method: c.method,
          amount: new Decimal(c.amount).toFixed(2),
          onlineReference: c.onlineReference?.trim() || undefined,
        })),
      allocations: allocationRequests.length > 0 ? allocationRequests : undefined,
    };

    try {
      const idempotencyKey = generateIdempotencyKey();
      const response = await supplierFinanceApi.createPayment(supplier.id, payload, idempotencyKey);

      queryClient.invalidateQueries({ queryKey: queryKeys.supplierFinance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });

      toastSuccess(`Payment ${response.paymentNumber} recorded successfully!`);
      onSuccess?.();
      onClose();
    } catch (rawErr) {
      const parsed = parseApiError(rawErr);
      setSubmitError(parsed.message || 'Failed to record supplier payment.');
      toastError(parsed.message || 'Payment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Payment — [${supplier.supplierCode}] ${supplier.name}`}
      size="xl"
    >
      <div className="space-y-5">
        {submitError && <ErrorMessage error={submitError} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Payment Date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {/* Payment Components Input */}
        <PaymentComponentsInput
          components={components}
          onChange={setComponents}
          disabled={isSubmitting}
        />

        {/* Purchase Invoices Allocation Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs uppercase font-semibold text-slate-500">
              Allocate to Unpaid Invoices (Optional)
            </h4>
            <span className="text-xs text-slate-500">
              Allocated: <strong className="text-slate-900">{formatInr(allocatedTotal.toFixed(2))}</strong>
            </span>
          </div>

          {isLoadingPurchases ? (
            <div className="p-4 text-center text-xs text-slate-400">Loading unpaid invoices...</div>
          ) : unpaidPurchases.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
              No unpaid purchase bills found for this supplier. Entire payment will be recorded as <strong>Supplier Advance Credit</strong>.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Purchase #</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3 text-right">Payable</th>
                    <th className="py-2 px-3 text-right">Outstanding</th>
                    <th className="py-2 px-3 text-right w-32">Allocate (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unpaidPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                        {p.purchaseNumber}
                      </td>
                      <td className="py-2 px-3 text-slate-500">
                        {formatBusinessDate(p.purchaseDate)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 font-mono">
                        {formatInr(p.totalPayableAmount)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-red-700 font-mono">
                        {formatInr(p.outstandingBalance)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Input
                          placeholder="0.00"
                          value={allocations[p.id] || ''}
                          onChange={(e) => handleAllocationChange(String(p.id), e.target.value)}
                          disabled={isSubmitting}
                          className="py-1 text-xs text-right font-mono"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Advance Notice if Unallocated Excess */}
        {unallocatedAmount.greaterThan(0) && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-4 h-4 text-teal-700" />
              Unallocated Balance will be saved as Advance:
            </span>
            <strong className="text-sm font-bold text-teal-950">
              {formatInr(unallocatedAmount.toFixed(2))}
            </strong>
          </div>
        )}

        <Textarea
          label="Internal Notes"
          placeholder="Optional payment remarks, cheque number, or settlement details..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={1}
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={componentsTotal.lessThanOrEqualTo(0)}
            leftIcon={<CreditCard className="w-4 h-4" />}
          >
            Record Payment ({formatInr(componentsTotal.toFixed(2))})
          </Button>
        </div>
      </div>
    </Modal>
  );
};
