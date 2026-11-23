import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { Layers, AlertCircle, ArrowRight, Wand2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ErrorMessage } from '../ui/ErrorMessage';
import { supplierFinanceApi, purchaseApi } from '../../api/purchase.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import { SupplierDto } from '../../types/party.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';
import { generateIdempotencyKey, parseApiError } from '../../api/apiHelpers';

export interface SupplierAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierDto;
  onSuccess?: () => void;
}

export const SupplierAllocationModal: React.FC<SupplierAllocationModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch payments for this supplier
  const { data: paymentsData, isLoading: isLoadingPayments } = useQuery({
    queryKey: queryKeys.supplierFinance.payments(supplier.id),
    queryFn: ({ signal }) =>
      supplierFinanceApi.getPayments(supplier.id, undefined, undefined, 0, 100, signal),
    enabled: isOpen && !!supplier.id,
  });

  // Filter payments with positive unallocated credit
  const paymentsWithCredit = (paymentsData?.data || []).filter(
    (p) => parseFloat(p.unallocatedAmount) > 0
  );

  // Auto-select first payment with credit when loaded
  useEffect(() => {
    if (paymentsWithCredit.length > 0 && !selectedPaymentId) {
      setSelectedPaymentId(paymentsWithCredit[0].id);
    }
  }, [paymentsWithCredit, selectedPaymentId]);

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

  const selectedPayment = paymentsWithCredit.find((p) => p.id === selectedPaymentId);
  const availableCredit = selectedPayment ? new Decimal(selectedPayment.unallocatedAmount) : new Decimal(0);

  // Handle single line allocation change
  const handleAllocationChange = (purchaseId: string, val: string) => {
    if (val === '' || /^\d*(\.\d{0,2})?$/.test(val)) {
      setAllocations((prev) => ({ ...prev, [purchaseId]: val }));
    }
  };

  // Set max allocation for single line
  const handleSetMax = (purchaseId: string, outstanding: string) => {
    const outDec = new Decimal(outstanding);
    // Calculate currently allocated to other purchases
    let otherAllocated = new Decimal(0);
    Object.entries(allocations).forEach(([pId, amtStr]) => {
      if (pId !== purchaseId && amtStr && !isNaN(Number(amtStr))) {
        otherAllocated = otherAllocated.plus(new Decimal(amtStr));
      }
    });

    const maxCanAllocate = Decimal.max(0, Decimal.min(outDec, availableCredit.minus(otherAllocated)));
    setAllocations((prev) => ({
      ...prev,
      [purchaseId]: maxCanAllocate.toFixed(2),
    }));
  };

  // FIFO Auto-allocate
  const handleAutoAllocateFifo = () => {
    let creditRemaining = new Decimal(availableCredit);
    const newAllocations: Record<string, string> = {};

    for (const purchase of unpaidPurchases) {
      if (creditRemaining.lessThanOrEqualTo(0)) break;

      const outDec = new Decimal(purchase.outstandingBalance);
      const toAllocate = Decimal.min(outDec, creditRemaining);
      if (toAllocate.greaterThan(0)) {
        newAllocations[purchase.id] = toAllocate.toFixed(2);
        creditRemaining = creditRemaining.minus(toAllocate);
      }
    }

    setAllocations(newAllocations);
  };

  // Calculate total allocated
  let totalAllocated = new Decimal(0);
  Object.values(allocations).forEach((amtStr) => {
    if (amtStr && !isNaN(Number(amtStr)) && parseFloat(amtStr) > 0) {
      totalAllocated = totalAllocated.plus(new Decimal(amtStr));
    }
  });

  const remainingCredit = Decimal.max(0, availableCredit.minus(totalAllocated));
  const isOverAllocated = totalAllocated.greaterThan(availableCredit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) {
      setSubmitError('Please select a payment voucher with available credit.');
      return;
    }

    if (totalAllocated.lessThanOrEqualTo(0)) {
      setSubmitError('Please allocate an amount to at least one purchase invoice.');
      return;
    }

    if (isOverAllocated) {
      setSubmitError(`Total allocated (${formatInr(totalAllocated.toNumber())}) exceeds available payment credit (${formatInr(availableCredit.toNumber())}).`);
      return;
    }

    // Validate per-line limits
    for (const purchase of unpaidPurchases) {
      const allocatedStr = allocations[purchase.id];
      if (allocatedStr && !isNaN(Number(allocatedStr))) {
        const allocatedDec = new Decimal(allocatedStr);
        const outDec = new Decimal(purchase.outstandingBalance);
        if (allocatedDec.greaterThan(outDec)) {
          setSubmitError(
            `Allocated amount for ${purchase.purchaseNumber} (${formatInr(allocatedDec.toNumber())}) exceeds invoice balance (${formatInr(outDec.toNumber())}).`
          );
          return;
        }
      }
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const items = Object.entries(allocations)
        .filter(([, val]) => val && !isNaN(Number(val)) && parseFloat(val) > 0)
        .map(([purchaseId, val]) => ({
          paymentId: selectedPayment.id,
          purchaseId,
          amount: new Decimal(val).toFixed(2),
        }));

      const idempotencyKey = generateIdempotencyKey();
      await supplierFinanceApi.applyAllocations(
        supplier.id,
        { allocations: items },
        idempotencyKey
      );

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.supplierFinance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });

      toastSuccess(
        `Applied ${formatInr(totalAllocated.toNumber())} credit to ${items.length} purchase invoice(s).`
      );
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      setSubmitError(apiErr.message || 'Failed to apply allocations.');
      toastError(apiErr.message || 'Allocation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply Supplier Payment Credit"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {submitError && <ErrorMessage error={submitError} />}

        {isLoadingPayments || isLoadingPurchases ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Loading supplier credit and open invoices...
          </div>
        ) : paymentsWithCredit.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <span className="font-semibold block">No Unallocated Payment Credit Available</span>
              There are currently no recorded payments with remaining unallocated credit for{' '}
              <span className="font-semibold">{supplier.name}</span>. Record a payment first to create advance credit.
            </div>
          </div>
        ) : unpaidPurchases.length === 0 ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-800">
              <span className="font-semibold block">No Outstanding Invoices</span>
              All posted purchases for <span className="font-semibold">{supplier.name}</span> are fully settled. There are no unpaid invoices to allocate credit against.
            </div>
          </div>
        ) : (
          <>
            {/* Payment Selector */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select Payment Voucher with Credit <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={selectedPaymentId}
                onChange={(e) => {
                  setSelectedPaymentId(e.target.value);
                  setAllocations({});
                }}
              >
                {paymentsWithCredit.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.paymentNumber} ({formatBusinessDate(p.paymentDate)}) &mdash; Available Credit: {formatInr(parseFloat(p.unallocatedAmount))}
                  </option>
                ))}
              </select>

              {selectedPayment && (
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200">
                  <span>
                    Original Payment: <strong>{formatInr(parseFloat(selectedPayment.totalAmount))}</strong>
                  </span>
                  <span>
                    Available Credit:{' '}
                    <strong className="text-teal-700 text-sm">
                      {formatInr(parseFloat(selectedPayment.unallocatedAmount))}
                    </strong>
                  </span>
                  <span>
                    Remaining after allocation:{' '}
                    <strong className={isOverAllocated ? 'text-red-600 font-bold' : 'text-slate-900'}>
                      {formatInr(remainingCredit.toNumber())}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Invoices List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-600" />
                    Outstanding Purchase Invoices ({unpaidPurchases.length})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Allocate available credit to one or more unpaid invoices.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoAllocateFifo}
                  leftIcon={<Wand2 className="w-3.5 h-3.5 text-teal-600" />}
                >
                  Auto-Allocate (FIFO)
                </Button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                    <tr>
                      <th className="px-3 py-2">Invoice #</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Vendor Bill #</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Outstanding</th>
                      <th className="px-3 py-2 text-right w-44">Allocate (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unpaidPurchases.map((p) => {
                      const outNum = parseFloat(p.outstandingBalance);
                      const currentVal = allocations[p.id] || '';
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2.5 font-medium text-slate-900">{p.purchaseNumber}</td>
                          <td className="px-3 py-2.5 text-slate-600">{formatBusinessDate(p.purchaseDate)}</td>
                          <td className="px-3 py-2.5 text-slate-600 font-mono">{p.supplierInvoiceNumber || '—'}</td>
                          <td className="px-3 py-2.5 text-right text-slate-700">{formatInr(parseFloat(p.totalPayableAmount))}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-rose-700">
                            {formatInr(outNum)}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5 justify-end">
                              <Input
                                value={currentVal}
                                onChange={(e) => handleAllocationChange(p.id, e.target.value)}
                                placeholder="0.00"
                                className="w-28 text-right font-mono text-xs py-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetMax(p.id, p.outstandingBalance)}
                                className="text-[10px] px-1.5 py-0.5 h-7 text-teal-700 hover:bg-teal-50"
                              >
                                Max
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 text-xs font-semibold">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-slate-600">
                        Total Allocated:
                      </td>
                      <td colSpan={2} className="px-3 py-2 text-right">
                        <span className={isOverAllocated ? 'text-red-600 font-bold' : 'text-slate-900'}>
                          {formatInr(totalAllocated.toNumber())}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {isOverAllocated && (
                <p className="text-xs text-red-600 font-medium">
                  Total allocated exceeds available credit by {formatInr(totalAllocated.minus(availableCredit).toNumber())}.
                </p>
              )}
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={
              isSubmitting ||
              paymentsWithCredit.length === 0 ||
              unpaidPurchases.length === 0 ||
              totalAllocated.lessThanOrEqualTo(0) ||
              isOverAllocated
            }
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Apply Allocation
          </Button>
        </div>
      </form>
    </Modal>
  );
};
