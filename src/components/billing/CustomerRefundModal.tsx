import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import {
  ArrowDownLeft,
  Info,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ErrorMessage } from '../ui/ErrorMessage';
import { PaymentComponentsInput } from '../finance/PaymentComponentsInput';
import { customerFinanceApi, customerRefundApi } from '../../api/billing.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import {
  CreateCustomerRefundRequest,
  CustomerRefundResponseDto,
} from '../../types/billing.types';
import { PaymentComponentDto } from '../../types/purchase.types';
import { formatInr } from '../../utils/formatters';
import { generateIdempotencyKey, parseApiError } from '../../api/apiHelpers';

export interface CustomerRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string | number;
    name: string;
    customerCode?: string;
  };
  defaultAmount?: string;
  defaultReason?: string;
  onSuccess?: () => void;
}

export const CustomerRefundModal: React.FC<CustomerRefundModalProps> = ({
  isOpen,
  onClose,
  customer,
  defaultAmount,
  defaultReason,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { success: toastSuccess } = useToast();

  const [refundDate, setRefundDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState(defaultAmount || '');
  const [reason, setReason] = useState(defaultReason || '');
  const [components, setComponents] = useState<PaymentComponentDto[]>([
    { method: 'CASH', amount: defaultAmount || '', onlineReference: '' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch live account summary to discover available unallocated credit
  const { data: accountSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: queryKeys.customerFinance.accountSummary(customer.id),
    queryFn: ({ signal }) => customerFinanceApi.getAccountSummary(customer.id, signal),
    enabled: isOpen && !!customer.id,
  });

  const availableCreditNum = accountSummary ? parseFloat(accountSummary.unallocatedCredit) : 0;

  // Sync default amount if provided later
  useEffect(() => {
    if (defaultAmount) {
      setTotalAmount(defaultAmount);
      setComponents([{ method: 'CASH', amount: defaultAmount, onlineReference: '' }]);
    }
    if (defaultReason) {
      setReason(defaultReason);
    }
  }, [defaultAmount, defaultReason]);

  // Compute components sum
  const componentsTotalDec = useMemo(() => {
    let sum = new Decimal(0);
    components.forEach((c) => {
      if (c.amount && !isNaN(Number(c.amount))) {
        sum = sum.plus(new Decimal(c.amount));
      }
    });
    return sum;
  }, [components]);

  const refundMutation = useMutation({
    mutationFn: (request: CreateCustomerRefundRequest) => {
      const idemKey = generateIdempotencyKey();
      return customerRefundApi.createRefund(customer.id, request, idemKey);
    },
    onSuccess: (data: CustomerRefundResponseDto) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customerFinance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customerRefunds.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });

      toastSuccess(
        `Refund ${data.refundNumber} for ${formatInr(data.totalAmount)} disbursed successfully.`
      );
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      if (parsed.code === 'INSUFFICIENT_CUSTOMER_CREDIT') {
        setFormError(
          'Insufficient unallocated customer credit. The refund amount exceeds available advance receipts.'
        );
      } else {
        setFormError(parsed.message || 'Failed to record customer refund.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!totalAmount || isNaN(Number(totalAmount)) || parseFloat(totalAmount) <= 0) {
      setFormError('Please enter a valid refund amount greater than zero.');
      return;
    }

    const totalNum = parseFloat(totalAmount);
    if (totalNum > availableCreditNum) {
      setFormError(
        `Refund amount (${formatInr(totalNum)}) cannot exceed available customer advance credit (${formatInr(availableCreditNum)}).`
      );
      return;
    }

    if (!reason.trim()) {
      setFormError('Please enter a specific refund reason (e.g. customer returned item; advance deposit returned).');
      return;
    }

    // Validate component sum
    const totalDec = new Decimal(totalAmount);
    if (!componentsTotalDec.equals(totalDec)) {
      setFormError(
        `Sum of disbursement components (${formatInr(componentsTotalDec.toNumber())}) must exactly match total refund amount (${formatInr(totalDec.toNumber())}).`
      );
      return;
    }

    // Validate online references
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      if (c.method === 'ONLINE' && (!c.onlineReference || !c.onlineReference.trim())) {
        setFormError(`Row #${i + 1}: Online reference / UTR is required for bank disbursements.`);
        return;
      }
    }

    refundMutation.mutate({
      refundDate: refundDate || undefined,
      totalAmount: totalDec.toFixed(2),
      reason: reason.trim(),
      components,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!refundMutation.isPending) {
          onClose();
        }
      }}
      title={`Disburse Customer Refund — ${customer.name}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Available Credit Header Card */}
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-teal-800 uppercase tracking-wider block">
              Available Customer Advance Credit
            </span>
            <div className="text-xl font-bold font-mono text-teal-900 mt-1">
              {isLoadingSummary ? '...' : formatInr(availableCreditNum)}
            </div>
            <span className="text-teal-700 block mt-0.5">
              Derived from unallocated advance receipts and returned goods credits.
            </span>
          </div>

          <div className="text-right">
            <span className="font-semibold text-teal-800 block">Customer ID:</span>
            <span className="font-mono text-teal-950 font-bold block">{customer.customerCode || customer.id}</span>
          </div>
        </div>

        {formError && <ErrorMessage error={formError} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="refund-date-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Refund Date <span className="text-red-500">*</span>
            </label>
            <Input
              id="refund-date-input"
              type="date"
              value={refundDate}
              onChange={(e) => setRefundDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="refund-amount-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Refund Amount (₹) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="refund-amount-input"
                type="text"
                value={totalAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*(\.\d{0,2})?$/.test(val)) {
                    setTotalAmount(val);
                  }
                }}
                placeholder="0.00"
                className="font-mono"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setTotalAmount(availableCreditNum.toFixed(2));
                  setComponents([{ method: 'CASH', amount: availableCreditNum.toFixed(2), onlineReference: '' }]);
                }}
                disabled={availableCreditNum <= 0}
                className="shrink-0 text-xs"
              >
                Max Credit
              </Button>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="refund-reason-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Refund Reason <span className="text-red-500">*</span>
          </label>
          <Textarea
            id="refund-reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Cash refund disbursed for returned paint buckets on bill INV-2026-0042"
            rows={2}
            required
          />
        </div>

        {/* Disbursement Methods Split */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Disbursement Method (Cash / Online Outflow) <span className="text-red-500">*</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Total Tendered: {formatInr(componentsTotalDec.toNumber())}
            </span>
          </div>

          <PaymentComponentsInput
            components={components}
            onChange={setComponents}
            label=""
          />
        </div>

        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2 text-xs text-slate-600">
          <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
          <div>
            <strong>Disbursement Invariant:</strong> Recording a refund deducts customer advance receipts and appends a
            disbursement entry to the customer ledger. It records physical money paid out by the shop.
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={refundMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={refundMutation.isPending}
            disabled={refundMutation.isPending || availableCreditNum <= 0}
            leftIcon={<ArrowDownLeft className="w-4 h-4" />}
          >
            Disburse Refund
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerRefundModal;
