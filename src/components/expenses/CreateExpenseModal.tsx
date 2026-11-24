import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ErrorMessage } from '../ui/ErrorMessage';
import { PaymentComponentsInput } from '../finance/PaymentComponentsInput';
import { expenseApi } from '../../api/expense.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import { ExpenseCategory, CreateExpenseRequest } from '../../types/expense.types';
import { PaymentComponentDto } from '../../types/purchase.types';
import { formatInr } from '../../utils/formatters';
import { generateIdempotencyKey, parseApiError } from '../../api/apiHelpers';

export interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'RENT', label: 'Shop & Godown Rent' },
  { value: 'UTILITIES', label: 'Electricity & Water Utilities' },
  { value: 'SALARY', label: 'Staff Salaries & Wages' },
  { value: 'TRANSPORT', label: 'Freight & Local Transport' },
  { value: 'SHOP_OPERATIONS', label: 'Shop Consumables & Maintenance' },
  { value: 'OTHER', label: 'Other Operational Expenses' },
];

export const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  const [expenseDate, setExpenseDate] = useState(todayStr);
  const [category, setCategory] = useState<ExpenseCategory>('SHOP_OPERATIONS');
  const [description, setDescription] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [notes, setNotes] = useState('');
  const [components, setComponents] = useState<PaymentComponentDto[]>([
    { method: 'CASH', amount: '', onlineReference: '' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Compute total from components
  const calculatedTotal = components.reduce((acc, c) => {
    const val = parseFloat(String(c.amount) || '0');
    return isNaN(val) || val < 0 ? acc : acc.plus(val);
  }, new Decimal(0));

  const createMutation = useMutation({
    mutationFn: (req: CreateExpenseRequest) => {
      const idempotencyKey = generateIdempotencyKey();
      return expenseApi.createExpense(req, idempotencyKey);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      toastSuccess(`Expense voucher ${data.expenseNumber} posted successfully.`);
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      setFormError(parsed.message || 'Failed to record operational expense.');
      toastError(parsed.message || 'Failed to record expense.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!description.trim()) {
      setFormError('Please enter a description for this expense.');
      return;
    }

    if (calculatedTotal.lte(0)) {
      setFormError('Total expense amount must be greater than zero.');
      return;
    }

    // Validate online references
    for (const c of components) {
      const amt = parseFloat(String(c.amount) || '0');
      if (amt > 0 && c.method === 'ONLINE' && !c.onlineReference?.trim()) {
        setFormError('Online payments require a UTR or bank transaction reference.');
        return;
      }
    }

    // Filter valid positive components
    const validComponents = components
      .filter((c) => parseFloat(String(c.amount) || '0') > 0)
      .map((c) => ({
        method: c.method,
        amount: new Decimal(c.amount).toFixed(2),
        onlineReference: c.method === 'ONLINE' ? c.onlineReference?.trim() || null : null,
      }));

    if (validComponents.length === 0) {
      setFormError('At least one positive payment component is required.');
      return;
    }

    createMutation.mutate({
      expenseDate: expenseDate || null,
      category,
      description: description.trim(),
      amount: calculatedTotal.toFixed(2),
      components: validComponents,
      externalReference: externalReference.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!createMutation.isPending) {
          onClose();
        }
      }}
      title="Record Operational Expense"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && <ErrorMessage error={formError} />}

        {/* Date and Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Expense Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              max={todayStr}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Expense Category <span className="text-red-500">*</span>
            </label>
            <Select
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. October shop electricity bill / godown transport charges"
            required
          />
        </div>

        {/* Payment Components Input */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Disbursed Money Tender (Cash & Bank)
            </span>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Total Disbursed:</span>
              <span className="text-base font-bold font-mono text-teal-800">
                {formatInr(calculatedTotal.toNumber())}
              </span>
            </div>
          </div>

          <PaymentComponentsInput
            components={components}
            onChange={setComponents}
            disabled={createMutation.isPending}
            label=""
            helperText="Specify cash or online accounts from which funds were disbursed."
          />
        </div>

        {/* External Reference & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              External Reference / Bill # (Optional)
            </label>
            <Input
              type="text"
              value={externalReference}
              onChange={(e) => setExternalReference(e.target.value)}
              placeholder="e.g. MSEB-BILL-90821"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Internal Notes (Optional)
            </label>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid by cashier from register"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createMutation.isPending}
            disabled={calculatedTotal.lte(0)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Post Expense ({formatInr(calculatedTotal.toNumber())})
          </Button>
        </div>
      </form>
    </Modal>
  );
};
