import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  Info,
  CreditCard,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { ErrorMessage } from '../ui/ErrorMessage';
import { customerReturnApi } from '../../api/billing.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import {
  InvoiceResponseDto,
  CustomerReturnRequest,
  CustomerReturnLineRequest,
  CustomerReturnPreviewResponseDto,
  CustomerReturnValuationPolicy,
  CustomerReturnResponseDto,
} from '../../types/billing.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';
import { generateIdempotencyKey, parseApiError } from '../../api/apiHelpers';

export interface CustomerReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceResponseDto;
  onSuccess: () => void;
  onOpenRefund?: (customerId: string, defaultAmount: string, defaultReason: string) => void;
}

interface ReturnItemState {
  invoiceLineId: string;
  sku: string;
  productName: string;
  sizeLabel: string;
  invoicedQuantity: number;
  returnedQuantity: number;
  remainingReturnableQuantity: number;
  unitPrice: string;
  returnQuantity: string;
  valuationBasis?: CustomerReturnValuationPolicy;
  isPriceOverridden: boolean;
}

export const CustomerReturnModal: React.FC<CustomerReturnModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
  onOpenRefund,
}) => {
  const queryClient = useQueryClient();
  const { success: toastSuccess } = useToast();

  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [valuationPolicy, setValuationPolicy] = useState<CustomerReturnValuationPolicy>('ORIGINAL_INVOICE_PRICE');
  const [items, setItems] = useState<ReturnItemState[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [valuationPolicyRequired, setValuationPolicyRequired] = useState(false);
  const [completedReturn, setCompletedReturn] = useState<CustomerReturnResponseDto | null>(null);

  // Initialize returnable lines
  useEffect(() => {
    if (invoice && invoice.lines) {
      const returnable = invoice.lines
        .filter((l) => l.isActiveInCurrentRevision !== false)
        .map((l) => {
          const remaining = Math.max(0, l.quantity - (l.returnedQuantity || 0));
          return {
            invoiceLineId: String(l.id),
            sku: l.sku,
            productName: l.productName,
            sizeLabel: l.sizeLabel,
            invoicedQuantity: l.quantity,
            returnedQuantity: l.returnedQuantity || 0,
            remainingReturnableQuantity: remaining,
            unitPrice: l.unitNetPrice,
            returnQuantity: '',
            valuationBasis: undefined,
            isPriceOverridden: l.isPriceOverridden,
          };
        });
      setItems(returnable);
      setReason('');
      setFormError(null);
      setValuationPolicyRequired(false);
      setCompletedReturn(null);
    }
  }, [invoice, isOpen]);

  // Check if any line has price revisions
  const hasPriceRevisions = useMemo(() => {
    return items.some((i) => i.isPriceOverridden) || (invoice.revisionCount || 0) > 0;
  }, [items, invoice]);

  // Construct return payload lines
  const returnPayloadLines: CustomerReturnLineRequest[] = useMemo(() => {
    return items
      .filter((item) => {
        const qty = parseInt(item.returnQuantity, 10);
        return !isNaN(qty) && qty > 0;
      })
      .map((item) => ({
        invoiceLineId: Number(item.invoiceLineId),
        quantity: parseInt(item.returnQuantity, 10),
        valuationBasis: item.valuationBasis || valuationPolicy,
      }));
  }, [items, valuationPolicy]);

  // Debounced payload for preview query
  const [debouncedLines, setDebouncedLines] = useState<CustomerReturnLineRequest[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLines(returnPayloadLines);
    }, 300);
    return () => clearTimeout(timer);
  }, [returnPayloadLines]);

  // Authoritative Customer Return Preview Query
  const {
    data: previewData,
    isLoading: isPreviewLoading,
    error: previewQueryError,
  } = useQuery<CustomerReturnPreviewResponseDto>({
    queryKey: queryKeys.customerReturns.preview(invoice.id, {
      expectedInvoiceVersion: invoice.version,
      returnDate,
      reason,
      valuationPolicy,
      lines: debouncedLines,
    }),
    queryFn: ({ signal }) =>
      customerReturnApi.previewReturn(
        invoice.id,
        {
          expectedInvoiceVersion: Number(invoice.version),
          returnDate,
          reason: reason.trim() || 'Inspection preview',
          valuationPolicy: hasPriceRevisions ? valuationPolicy : undefined,
          lines: debouncedLines,
        },
        signal
      ),
    enabled: isOpen && !completedReturn && !!invoice.id && debouncedLines.length > 0,
    staleTime: 5000,
  });

  const previewErrorParsed = previewQueryError ? parseApiError(previewQueryError).message : null;

  const handleLineQtyChange = (index: number, val: string) => {
    if (val === '' || /^[0-9]+$/.test(val)) {
      const next = [...items];
      const target = next[index];

      if (val !== '') {
        const num = parseInt(val, 10);
        if (num > target.remainingReturnableQuantity) {
          setFormError(
            `Line ${target.sku}: Return quantity cannot exceed ${target.remainingReturnableQuantity} pcs.`
          );
          return;
        }
      }

      setFormError(null);
      next[index] = { ...target, returnQuantity: val };
      setItems(next);
    }
  };

  const handleSetMaxReturn = (index: number) => {
    const next = [...items];
    next[index] = {
      ...next[index],
      returnQuantity: String(next[index].remainingReturnableQuantity),
    };
    setFormError(null);
    setItems(next);
  };

  // Return submission mutation
  const returnMutation = useMutation({
    mutationFn: (payload: CustomerReturnRequest) => {
      const idemKey = generateIdempotencyKey();
      return customerReturnApi.createReturn(invoice.id, payload, idemKey);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customerReturns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customerFinance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dues.all });

      toastSuccess(`Customer return ${data.returnNumber} recorded successfully.`);
      setCompletedReturn(data);
      onSuccess();
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      if (parsed.code === 'RETURN_VALUATION_POLICY_REQUIRED') {
        setValuationPolicyRequired(true);
        setFormError(
          'Valuation policy required: Lines on this bill underwent historical price changes. Please choose an approved return valuation rule below.'
        );
      } else if (parsed.status === 409) {
        setFormError('Concurrency conflict: The invoice was modified by another user. Please reload and retry.');
      } else {
        setFormError(parsed.message || 'Failed to process customer return.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!reason.trim()) {
      setFormError('Please enter a specific return reason.');
      return;
    }

    if (returnPayloadLines.length === 0) {
      setFormError('Please select at least one item and enter a return quantity >= 1.');
      return;
    }

    returnMutation.mutate({
      expectedInvoiceVersion: Number(invoice.version),
      returnDate: returnDate || undefined,
      reason: reason.trim(),
      valuationPolicy: hasPriceRevisions || valuationPolicyRequired ? valuationPolicy : undefined,
      lines: returnPayloadLines,
    });
  };

  const handleOpenRefundAction = () => {
    if (completedReturn && onOpenRefund) {
      const amount = completedReturn.releasedAllocationAmount && parseFloat(completedReturn.releasedAllocationAmount) > 0
        ? completedReturn.releasedAllocationAmount
        : completedReturn.totalReturnAmount;
      const refReason = `Refund for customer return ${completedReturn.returnNumber} on bill ${invoice.invoiceNumber}`;
      onOpenRefund(String(invoice.customerId), amount, refReason);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!returnMutation.isPending) {
          onClose();
        }
      }}
      title={`Customer Return: ${invoice.invoiceNumber}`}
      size="xl"
    >
      {completedReturn ? (
        /* Completed Return View */
        <div className="space-y-6 py-2">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-emerald-950">
              <h3 className="text-sm font-bold text-emerald-900">
                Customer Return Successfully Processed
              </h3>
              <p>
                Credit note voucher{' '}
                <span className="font-mono font-bold text-emerald-800">{completedReturn.returnNumber}</span>{' '}
                was created. Returned items were atomically restored to inventory balances.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-slate-500 block">Return Voucher #:</span>
                <span className="font-mono font-bold text-slate-900">{completedReturn.returnNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Credit Value:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {formatInr(completedReturn.totalReturnAmount)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Released Advance Credit:</span>
                <span className="font-mono font-bold text-teal-800 text-sm">
                  {formatInr(completedReturn.releasedAllocationAmount || 0)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 text-slate-600">
              <span className="font-semibold text-slate-700">Financial Impact:</span> Unpaid bill amounts were reduced.
              Paid amounts have been credited to the customer's account as unallocated advance balance.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={onClose}>
              Keep as Customer Credit (Done)
            </Button>
            {onOpenRefund && (
              <Button
                variant="primary"
                onClick={handleOpenRefundAction}
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                Disburse Refund (Cash / Online)
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Return Entry Form */
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Header Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-slate-500">Customer:</span>{' '}
              <span className="font-bold text-slate-800">{invoice.customerName}</span>
            </div>
            <div>
              <span className="text-slate-500">Bill Date:</span>{' '}
              <span className="font-medium text-slate-800">{formatBusinessDate(invoice.invoiceDate)}</span>
            </div>
            <div>
              <span className="text-slate-500">Total Billed:</span>{' '}
              <span className="font-mono font-bold text-slate-900">{formatInr(invoice.totalPayableAmount)}</span>
            </div>
            <div>
              <span className="text-slate-500">Outstanding:</span>{' '}
              <span className="font-mono font-bold text-rose-700">{formatInr(invoice.outstandingAmount)}</span>
            </div>
          </div>

          {formError && <ErrorMessage error={formError} />}
          {previewErrorParsed && <ErrorMessage error={previewErrorParsed} title="Return Calculation Note" />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="return-date-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Return Date <span className="text-red-500">*</span>
              </label>
              <Input
                id="return-date-input"
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                required
              />
            </div>

            {/* Valuation Policy (rendered if price revisions exist or required by backend) */}
            {(hasPriceRevisions || valuationPolicyRequired) && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Valuation Policy <span className="text-red-500">*</span>
                </label>
                <Select
                  value={valuationPolicy}
                  onChange={(e) => setValuationPolicy(e.target.value as CustomerReturnValuationPolicy)}
                  options={[
                    { value: 'ORIGINAL_INVOICE_PRICE', label: 'Original Invoiced Unit Price' },
                    { value: 'LATEST_REVISED_PRICE', label: 'Latest Revised Unit Price' },
                  ]}
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Applicable to lines that underwent historical price revisions.
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Return Reason <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Excess paint cans returned unopened; project cancellation"
              rows={2}
              required
            />
          </div>

          {/* Returnable Items Table */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Item Description</th>
                  <th className="px-2 py-2.5 text-center w-24">Invoiced</th>
                  <th className="px-2 py-2.5 text-center w-24">Returned</th>
                  <th className="px-2 py-2.5 text-center w-24">Available</th>
                  <th className="px-2 py-2.5 text-right w-24">Net Rate</th>
                  <th className="px-2 py-2.5 text-center w-36">Return Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const isEligible = item.remainingReturnableQuantity > 0;

                  return (
                    <tr
                      key={item.invoiceLineId}
                      className={!isEligible ? 'bg-slate-50/50 text-slate-400' : 'hover:bg-slate-50/60'}
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900">{item.productName}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {item.sku} ({item.sizeLabel})
                        </div>
                      </td>

                      <td className="px-2 py-2.5 text-center font-mono">
                        {item.invoicedQuantity}
                      </td>

                      <td className="px-2 py-2.5 text-center font-mono text-slate-500">
                        {item.returnedQuantity}
                      </td>

                      <td className="px-2 py-2.5 text-center font-mono font-bold text-slate-900">
                        {item.remainingReturnableQuantity}
                      </td>

                      <td className="px-2 py-2.5 text-right font-mono text-slate-700">
                        {formatInr(item.unitPrice)}
                      </td>

                      <td className="px-2 py-2.5">
                        {isEligible ? (
                          <div className="flex items-center gap-1.5 justify-center">
                            <Input
                              type="text"
                              value={item.returnQuantity}
                              onChange={(e) => handleLineQtyChange(idx, e.target.value)}
                              placeholder="0"
                              className="w-16 text-center font-mono py-1 text-xs"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetMaxReturn(idx)}
                              className="text-[10px] px-1.5 py-0.5 h-7 text-teal-700 hover:bg-teal-50"
                            >
                              Max
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic block text-center">
                            Fully returned
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Authoritative Live Preview */}
          {previewData && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-teal-600" />
                  Return Value & Allocation Impact
                </span>
                <span className="text-[11px] text-slate-500">Authoritative calculation</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Total Return Credit:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {formatInr(previewData.totalReturnAmount)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Released Payment:</span>
                  <span className="font-mono font-bold text-teal-800 text-sm">
                    {formatInr(previewData.releasedAllocationAmount)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">New Effective Payable:</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {formatInr(previewData.newEffectivePayableAmount)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">New Outstanding Balance:</span>
                  <span className="font-mono font-bold text-rose-700 text-sm">
                    {formatInr(previewData.newOutstandingAmount)}
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-teal-50/60 border border-teal-100 rounded-lg text-xs text-teal-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                <div>
                  <strong>Settlement Note:</strong> Recording a return reduces the invoice's payable amount.
                  If the invoice was partially or fully paid, the released amount ({formatInr(previewData.releasedAllocationAmount)})
                  is credited to the customer's advance balance. Cash refunds are disbursed separately.
                </div>
              </div>
            </div>
          )}

          {/* Submit Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={returnMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={returnMutation.isPending || isPreviewLoading}
              disabled={returnMutation.isPending || returnPayloadLines.length === 0}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Confirm & Post Return
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default CustomerReturnModal;
