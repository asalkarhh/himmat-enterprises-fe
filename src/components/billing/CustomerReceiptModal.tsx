import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { Receipt, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ErrorMessage } from '../ui/ErrorMessage';
import { PaymentComponentsInput } from '../finance/PaymentComponentsInput';
import { invoiceApi, customerFinanceApi } from '../../api/billing.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import {
  CreateCustomerReceiptRequest,
  InvoiceAllocationRequest,
} from '../../types/billing.types';
import { PaymentComponentDto } from '../../types/purchase.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';
import { generateIdempotencyKey, parseApiError } from '../../api/apiHelpers';

export interface CustomerReceiptModalProps {
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

export const CustomerReceiptModal: React.FC<CustomerReceiptModalProps> = ({
  isOpen,
  onClose,
  customer,
  preselectedInvoiceId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [components, setComponents] = useState<PaymentComponentDto[]>([
    { method: 'CASH', amount: '', onlineReference: '' },
  ]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch unpaid / partially paid invoices for this customer
  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: queryKeys.invoices.list({ customerId: customer.id, size: 100 }),
    queryFn: ({ signal }) =>
      invoiceApi.searchInvoices({ customerId: customer.id, size: 100 }, signal),
    enabled: isOpen && !!customer.id,
  });

  const unpaidInvoices = (invoicesData?.data || []).filter(
    (inv) => parseFloat(inv.outstandingAmount) > 0 && inv.status === 'POSTED'
  );

  // Pre-fill preselected invoice
  useEffect(() => {
    if (preselectedInvoiceId && unpaidInvoices.length > 0) {
      const match = unpaidInvoices.find((i) => String(i.id) === String(preselectedInvoiceId));
      if (match) {
        const outStr = match.outstandingAmount;
        setComponents([{ method: 'CASH', amount: outStr, onlineReference: '' }]);
        setAllocations({ [match.id]: outStr });
      }
    }
  }, [preselectedInvoiceId, unpaidInvoices]);

  const handleAllocationChange = (invoiceId: string, val: string) => {
    if (val === '' || /^\d*(\.\d{0,2})?$/.test(val)) {
      setAllocations((prev) => ({ ...prev, [invoiceId]: val }));
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
  const allocationRequests: InvoiceAllocationRequest[] = [];
  Object.entries(allocations).forEach(([invoiceId, amtStr]) => {
    if (amtStr && !isNaN(Number(amtStr)) && parseFloat(amtStr) > 0) {
      const dec = new Decimal(amtStr);
      allocatedTotal = allocatedTotal.plus(dec);
      allocationRequests.push({ invoiceId, amount: dec.toFixed(2) });
    }
  });

  const unallocatedAmount = Decimal.max(0, componentsTotal.minus(allocatedTotal));

  const handleSetMaxAllocation = (invoiceId: string, outstanding: string) => {
    const outDec = new Decimal(outstanding);
    // Remaining unallocated from components
    let allocatedToOthers = new Decimal(0);
    Object.entries(allocations).forEach(([iId, val]) => {
      if (iId !== invoiceId && val && !isNaN(Number(val))) {
        allocatedToOthers = allocatedToOthers.plus(new Decimal(val));
      }
    });

    const maxCanAllocate = Decimal.max(0, Decimal.min(outDec, componentsTotal.minus(allocatedToOthers)));
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: maxCanAllocate.toFixed(2),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (componentsTotal.lessThanOrEqualTo(0)) {
      setSubmitError('Please enter at least one tendered payment component greater than zero.');
      return;
    }

    if (allocatedTotal.greaterThan(componentsTotal)) {
      setSubmitError(
        `Total allocated to invoices (${formatInr(allocatedTotal.toNumber())}) cannot exceed total payment received (${formatInr(componentsTotal.toNumber())}).`
      );
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

    // Validate components online references
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      if (!c.amount || isNaN(Number(c.amount)) || parseFloat(c.amount) <= 0) {
        setSubmitError(`Row #${i + 1}: Amount must be greater than zero.`);
        return;
      }
      if (c.method === 'ONLINE' && (!c.onlineReference || !c.onlineReference.trim())) {
        setSubmitError(`Row #${i + 1}: Online UTR / reference is required for bank payments.`);
        return;
      }
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const idempotencyKey = generateIdempotencyKey();
      const payload: CreateCustomerReceiptRequest = {
        receiptDate,
        totalAmount: componentsTotal.toFixed(2),
        notes: notes.trim() || null,
        components: components.map((c) => ({
          method: c.method,
          amount: new Decimal(c.amount).toFixed(2),
          onlineReference: c.method === 'ONLINE' ? c.onlineReference?.trim() || null : null,
        })),
        allocations: allocationRequests.length > 0 ? allocationRequests : null,
      };

      const res = await customerFinanceApi.createReceipt(customer.id, payload, idempotencyKey);

      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customerFinance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dues.all });

      toastSuccess(
        `Receipt ${res.receiptNumber} recorded for ${formatInr(parseFloat(res.totalAmount))}.`
      );
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      setSubmitError(apiErr.message || 'Failed to record customer receipt.');
      toastError(apiErr.message || 'Receipt recording failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Customer Receipt: ${customer.name}`}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {submitError && <ErrorMessage error={submitError} />}

        {/* Date and Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Receipt Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Notes / Remarks
            </label>
            <Input
              placeholder="e.g. Counter payment for plumbing invoice"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Tendered Modes */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <PaymentComponentsInput
            components={components}
            onChange={setComponents}
            label="Tendered Modes (Cash / Online / Bank Transfer)"
          />

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 text-slate-600">
            <span>
              Total Received: <strong>{formatInr(componentsTotal.toNumber())}</strong>
            </span>
            <span>
              Allocated to Invoices: <strong>{formatInr(allocatedTotal.toNumber())}</strong>
            </span>
            <span>
              Unallocated Advance Credit:{' '}
              <strong className={unallocatedAmount.greaterThan(0) ? 'text-teal-700 font-bold' : 'text-slate-800'}>
                {formatInr(unallocatedAmount.toNumber())}
              </strong>
            </span>
          </div>
        </div>

        {/* Invoices to Allocate */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-teal-600" />
                Open Invoices for Settlement ({unpaidInvoices.length})
              </h4>
              <p className="text-xs text-slate-500">
                Allocate payment towards open bills, or leave unallocated as customer advance credit.
              </p>
            </div>
          </div>

          {isLoadingInvoices ? (
            <div className="py-6 text-center text-xs text-slate-500">Loading open customer invoices...</div>
          ) : unpaidInvoices.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              No outstanding invoices for this customer. Any amount received will be recorded as <strong>Customer Advance Credit</strong>.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
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
                        <td className="px-3 py-2 font-medium text-slate-900">{inv.invoiceNumber}</td>
                        <td className="px-3 py-2 text-slate-600">{formatBusinessDate(inv.invoiceDate)}</td>
                        <td className="px-3 py-2 text-slate-600">{inv.siteName || <span className="text-slate-400 italic">—</span>}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{formatInr(parseFloat(inv.totalPayableAmount))}</td>
                        <td className="px-3 py-2 text-right font-medium text-rose-700">{formatInr(outNum)}</td>
                        <td className="px-3 py-2">
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
                              onClick={() => handleSetMaxAllocation(inv.id, inv.outstandingAmount)}
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
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting || componentsTotal.lessThanOrEqualTo(0) || allocatedTotal.greaterThan(componentsTotal)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Record Receipt
          </Button>
        </div>
      </form>
    </Modal>
  );
};
