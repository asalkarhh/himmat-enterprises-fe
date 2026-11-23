import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { ArrowDownLeft, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ErrorMessage } from '../ui/ErrorMessage';
import { PaymentComponentsInput } from './PaymentComponentsInput';
import { supplierFinanceApi } from '../../api/purchase.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import { SupplierDto } from '../../types/party.types';
import { PaymentComponentDto } from '../../types/purchase.types';
import { formatInr } from '../../utils/formatters';
import { generateIdempotencyKey, parseApiError } from '../../api/apiHelpers';

export interface SupplierRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierDto;
  unallocatedCredit: string | number;
  onSuccess?: () => void;
}

export const SupplierRefundModal: React.FC<SupplierRefundModalProps> = ({
  isOpen,
  onClose,
  supplier,
  unallocatedCredit,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const creditDec = new Decimal(unallocatedCredit || 0);

  const [refundDate, setRefundDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState('');
  const [reason, setReason] = useState('');
  const [components, setComponents] = useState<PaymentComponentDto[]>([
    { method: 'CASH', amount: '', onlineReference: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Component total calculation
  let componentsTotal = new Decimal(0);
  components.forEach((c) => {
    if (c.amount && !isNaN(Number(c.amount))) {
      componentsTotal = componentsTotal.plus(new Decimal(c.amount));
    }
  });

  const parsedAmount = totalAmount && !isNaN(Number(totalAmount)) ? new Decimal(totalAmount) : new Decimal(0);
  const isAmountMatch = parsedAmount.greaterThan(0) && parsedAmount.equals(componentsTotal);
  const isExceedingCredit = parsedAmount.greaterThan(creditDec);

  const handleFillMaxAmount = () => {
    const maxStr = creditDec.toFixed(2);
    setTotalAmount(maxStr);
    setComponents([
      { method: 'CASH', amount: maxStr, onlineReference: '' },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundDate) {
      setSubmitError('Please select a refund date.');
      return;
    }

    if (parsedAmount.lessThanOrEqualTo(0)) {
      setSubmitError('Refund amount must be greater than zero.');
      return;
    }

    if (isExceedingCredit) {
      setSubmitError(
        `Refund amount (${formatInr(parsedAmount.toNumber())}) cannot exceed available credit (${formatInr(creditDec.toNumber())}).`
      );
      return;
    }

    if (!reason.trim() || reason.trim().length < 3) {
      setSubmitError('Please provide a valid refund reason (minimum 3 characters).');
      return;
    }

    if (!isAmountMatch) {
      setSubmitError(
        `Sum of refund components (${formatInr(componentsTotal.toNumber())}) must equal the refund total (${formatInr(parsedAmount.toNumber())}).`
      );
      return;
    }

    // Validate component details
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      if (!c.amount || isNaN(Number(c.amount)) || parseFloat(c.amount) <= 0) {
        setSubmitError(`Row #${i + 1}: Amount must be greater than zero.`);
        return;
      }
      if (c.method === 'ONLINE' && (!c.onlineReference || !c.onlineReference.trim())) {
        setSubmitError(`Row #${i + 1}: Online reference / UTR is required for online refunds.`);
        return;
      }
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const idempotencyKey = generateIdempotencyKey();
      await supplierFinanceApi.createRefund(
        supplier.id,
        {
          refundDate,
          totalAmount: parsedAmount.toFixed(2),
          reason: reason.trim(),
          components: components.map((c) => ({
            method: c.method,
            amount: new Decimal(c.amount).toFixed(2),
            onlineReference: c.method === 'ONLINE' ? c.onlineReference?.trim() || null : null,
          })),
        },
        idempotencyKey
      );

      queryClient.invalidateQueries({ queryKey: queryKeys.supplierFinance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });

      toastSuccess(`Refund of ${formatInr(parsedAmount.toNumber())} recorded successfully.`);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      setSubmitError(apiErr.message || 'Failed to record supplier refund.');
      toastError(apiErr.message || 'Refund recording failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Supplier Refund"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {submitError && <ErrorMessage error={submitError} />}

        {creditDec.lessThanOrEqualTo(0) ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <span className="font-semibold block">No Available Supplier Credit</span>
              <span className="font-semibold">{supplier.name}</span> has no unallocated payment credit
              or advance balance to refund. Refunds can only be recorded when the supplier holds credit.
            </div>
          </div>
        ) : (
          <>
            {/* Credit Notice */}
            <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs text-teal-800 font-medium block">
                  Available Supplier Advance / Credit
                </span>
                <span className="text-lg font-bold text-teal-900 font-mono">
                  {formatInr(creditDec.toNumber())}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFillMaxAmount}
                className="text-xs text-teal-800 border-teal-300 hover:bg-teal-100"
              >
                Refund Full Credit
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Refund Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={refundDate}
                  onChange={(e) => setRefundDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Total Refund Amount (₹) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*(\.\d{0,2})?$/.test(val)) {
                      setTotalAmount(val);
                    }
                  }}
                  className="font-mono"
                  required
                />
                {isExceedingCredit && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    Exceeds available credit of {formatInr(creditDec.toNumber())}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reason / Commercial Note <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="e.g. Bank refund for damaged returned material from PO-2026-0001"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                required
              />
            </div>

            {/* Payment Method / Mode components */}
            <div className="pt-2 border-t border-slate-100">
              <PaymentComponentsInput
                components={components}
                onChange={setComponents}
              />
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
              creditDec.lessThanOrEqualTo(0) ||
              parsedAmount.lessThanOrEqualTo(0) ||
              isExceedingCredit ||
              !isAmountMatch ||
              !reason.trim()
            }
            leftIcon={<ArrowDownLeft className="w-4 h-4" />}
          >
            Record Refund
          </Button>
        </div>
      </form>
    </Modal>
  );
};
