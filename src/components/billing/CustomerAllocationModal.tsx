import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { Layers, AlertCircle, ArrowRight, Wand2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ErrorMessage } from '../ui/ErrorMessage';
import { invoiceApi, customerFinanceApi } from '../../api/billing.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import { CustomerAllocationItemRequest } from '../../types/billing.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';
import { generateIdempotencyKey, parseApiError } from '../../api/apiHelpers';

export interface CustomerAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string | number;
    name: string;
    customerCode?: string;
  };
  preselectedInvoiceId?: string | number;
  onSuccess?: () => void;
}

export const CustomerAllocationModal: React.FC<CustomerAllocationModalProps> = ({
  isOpen,
  onClose,
  customer,
  preselectedInvoiceId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [selectedReceiptId, setSelectedReceiptId] = useState<string>('');
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch receipts for this customer to find unallocated credit
  const { data: receiptsData, isLoading: isLoadingReceipts } = useQuery({
    queryKey: queryKeys.customerFinance.receipts(customer.id),
    queryFn: ({ signal }) =>
      customerFinanceApi.searchReceipts(customer.id, { size: 100 }, signal),
    enabled: isOpen && !!customer.id,
  });

  const receiptsWithCredit = (receiptsData?.data || []).filter(
    (r) => parseFloat(r.unallocatedAmount) > 0
  );

  useEffect(() => {
    if (receiptsWithCredit.length > 0 && !selectedReceiptId) {
      setSelectedReceiptId(receiptsWithCredit[0].id);
    }
  }, [receiptsWithCredit, selectedReceiptId]);

  // Fetch unpaid invoices for this customer
  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: queryKeys.invoices.list({ customerId: customer.id, size: 100 }),
    queryFn: ({ signal }) =>
      invoiceApi.searchInvoices({ customerId: customer.id, size: 100 }, signal),
    enabled: isOpen && !!customer.id,
  });

  const unpaidInvoices = (invoicesData?.data || []).filter(
    (inv) => parseFloat(inv.outstandingAmount) > 0 && inv.status === 'POSTED'
  );

  const selectedReceipt = receiptsWithCredit.find((r) => r.id === selectedReceiptId);
  const availableCredit = selectedReceipt ? new Decimal(selectedReceipt.unallocatedAmount) : new Decimal(0);

  // Pre-fill preselected invoice if provided
  useEffect(() => {
    if (preselectedInvoiceId && unpaidInvoices.length > 0 && availableCredit.greaterThan(0)) {
      const match = unpaidInvoices.find((i) => String(i.id) === String(preselectedInvoiceId));
      if (match) {
        const outDec = new Decimal(match.outstandingAmount);
        const toAlloc = Decimal.min(outDec, availableCredit);
        setAllocations({ [match.id]: toAlloc.toFixed(2) });
      }
    }
  }, [preselectedInvoiceId, unpaidInvoices, availableCredit]);

  const handleAllocationChange = (invoiceId: string, val: string) => {
    if (val === '' || /^\d*(\.\d{0,2})?$/.test(val)) {
      setAllocations((prev) => ({ ...prev, [invoiceId]: val }));
    }
  };

  const handleSetMax = (invoiceId: string, outstanding: string) => {
    const outDec = new Decimal(outstanding);
    let otherAllocated = new Decimal(0);
    Object.entries(allocations).forEach(([iId, amtStr]) => {
      if (iId !== invoiceId && amtStr && !isNaN(Number(amtStr))) {
        otherAllocated = otherAllocated.plus(new Decimal(amtStr));
      }
    });

    const maxCanAllocate = Decimal.max(0, Decimal.min(outDec, availableCredit.minus(otherAllocated)));
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: maxCanAllocate.toFixed(2),
    }));
  };

  // FIFO Auto-allocate
  const handleAutoAllocateFifo = () => {
    let creditRemaining = new Decimal(availableCredit);
    const newAllocations: Record<string, string> = {};

    for (const inv of unpaidInvoices) {
      if (creditRemaining.lessThanOrEqualTo(0)) break;

      const outDec = new Decimal(inv.outstandingAmount);
      const toAllocate = Decimal.min(outDec, creditRemaining);
      if (toAllocate.greaterThan(0)) {
        newAllocations[inv.id] = toAllocate.toFixed(2);
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
    if (!selectedReceipt) {
      setSubmitError('Please select a receipt voucher with available credit.');
      return;
    }

    if (totalAllocated.lessThanOrEqualTo(0)) {
      setSubmitError('Please allocate an amount to at least one sales invoice.');
      return;
    }

    if (isOverAllocated) {
      setSubmitError(`Total allocated (${formatInr(totalAllocated.toNumber())}) exceeds available credit (${formatInr(availableCredit.toNumber())}).`);
      return;
    }

    // Validate per-line limits
    for (const inv of unpaidInvoices) {
      const allocatedStr = allocations[inv.id];
      if (allocatedStr && !isNaN(Number(allocatedStr))) {
        const allocatedDec = new Decimal(allocatedStr);
        const outDec = new Decimal(inv.outstandingAmount);
        if (allocatedDec.greaterThan(outDec)) {
          setSubmitError(
            `Allocated amount for ${inv.invoiceNumber} (${formatInr(allocatedDec.toNumber())}) exceeds invoice balance (${formatInr(outDec.toNumber())}).`
          );
          return;
        }
      }
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const items: CustomerAllocationItemRequest[] = Object.entries(allocations)
        .filter(([, val]) => val && !isNaN(Number(val)) && parseFloat(val) > 0)
        .map(([invoiceId, val]) => ({
          receiptId: selectedReceipt.id,
          invoiceId,
          amount: new Decimal(val).toFixed(2),
        }));

      const idempotencyKey = generateIdempotencyKey();
      await customerFinanceApi.applyAllocations(
        customer.id,
        { allocations: items },
        idempotencyKey
      );

      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customerFinance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dues.all });

      toastSuccess(
        `Applied ${formatInr(totalAllocated.toNumber())} advance credit to ${items.length} invoice(s).`
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
      title="Apply Customer Advance Credit"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {submitError && <ErrorMessage error={submitError} />}

        {isLoadingReceipts || isLoadingInvoices ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Loading customer credit and open invoices...
          </div>
        ) : receiptsWithCredit.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <span className="font-semibold block">No Unallocated Advance Credit Available</span>
              There are currently no recorded receipts with remaining unallocated credit for{' '}
              <span className="font-semibold">{customer.name}</span>. Record a customer payment/receipt first.
            </div>
          </div>
        ) : unpaidInvoices.length === 0 ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-800">
              <span className="font-semibold block">No Outstanding Invoices</span>
              All invoices for <span className="font-semibold">{customer.name}</span> are fully settled.
            </div>
          </div>
        ) : (
          <>
            {/* Receipt Voucher Selector */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select Receipt Voucher with Credit <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={selectedReceiptId}
                onChange={(e) => {
                  setSelectedReceiptId(e.target.value);
                  setAllocations({});
                }}
              >
                {receiptsWithCredit.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.receiptNumber} ({formatBusinessDate(r.receiptDate)}) &mdash; Available Credit: {formatInr(parseFloat(r.unallocatedAmount))}
                  </option>
                ))}
              </select>

              {selectedReceipt && (
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200">
                  <span>
                    Original Receipt: <strong>{formatInr(parseFloat(selectedReceipt.totalAmount))}</strong>
                  </span>
                  <span>
                    Available Credit:{' '}
                    <strong className="text-teal-700 text-sm">
                      {formatInr(parseFloat(selectedReceipt.unallocatedAmount))}
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
                    Open Sales Invoices ({unpaidInvoices.length})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Customer advance credit can settle bills across any site belonging to this customer.
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
                      <th className="px-3 py-2">Site</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Outstanding</th>
                      <th className="px-3 py-2 text-right w-44">Allocate (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unpaidInvoices.map((inv) => {
                      const outNum = parseFloat(inv.outstandingAmount);
                      const currentVal = allocations[inv.id] || '';
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2.5 font-medium text-slate-900">{inv.invoiceNumber}</td>
                          <td className="px-3 py-2.5 text-slate-600">{formatBusinessDate(inv.invoiceDate)}</td>
                          <td className="px-3 py-2.5 text-slate-600">{inv.siteName || <span className="text-slate-400 italic">—</span>}</td>
                          <td className="px-3 py-2.5 text-right text-slate-700">{formatInr(parseFloat(inv.totalPayableAmount))}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-rose-700">
                            {formatInr(outNum)}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5 justify-end">
                              <Input
                                value={currentVal}
                                onChange={(e) => handleAllocationChange(inv.id, e.target.value)}
                                placeholder="0.00"
                                className="w-28 text-right font-mono text-xs py-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetMax(inv.id, inv.outstandingAmount)}
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
              receiptsWithCredit.length === 0 ||
              unpaidInvoices.length === 0 ||
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
