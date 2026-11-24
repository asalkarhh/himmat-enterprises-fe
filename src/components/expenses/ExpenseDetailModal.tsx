import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  AlertTriangle,
  RotateCcw,
  Calendar,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ErrorMessage } from '../ui/ErrorMessage';
import { expenseApi } from '../../api/expense.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import { ExpenseResponseDto, ReverseExpenseRequest } from '../../types/expense.types';
import { formatInr, formatBusinessDate } from '../../utils/formatters';
import { triggerPdfDownload, parseBlobError } from '../../utils/pdfDownloader';
import { generateIdempotencyKey, parseApiError } from '../../api/apiHelpers';

export interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseResponseDto | null;
  onSuccess?: () => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  isOpen,
  onClose,
  expense,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [isReversalMode, setIsReversalMode] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalDate, setReversalDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!expense) return null;

  const reverseMutation = useMutation({
    mutationFn: (req: ReverseExpenseRequest) => {
      const idempotencyKey = generateIdempotencyKey();
      return expenseApi.reverseExpense(expense.id, req, idempotencyKey);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      toastSuccess(`Expense voucher ${data.expenseNumber} reversed successfully.`);
      setIsReversalMode(false);
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      setFormError(parsed.message || 'Failed to reverse operational expense.');
      toastError(parsed.message || 'Failed to reverse expense.');
    },
  });

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const blob = await expenseApi.downloadExpensePdf(expense.id);
      triggerPdfDownload(blob, `${expense.expenseNumber}-voucher.pdf`);
    } catch (err) {
      const msg = await parseBlobError(err);
      toastError(msg);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleConfirmReversal = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!reversalReason.trim()) {
      setFormError('Please enter a reason for this bookkeeping reversal.');
      return;
    }

    reverseMutation.mutate({
      expectedVersion: expense.version,
      reversalReason: reversalReason.trim(),
      reversalBusinessDate: reversalDate || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!reverseMutation.isPending) {
          setIsReversalMode(false);
          setFormError(null);
          onClose();
        }
      }}
      title={`Expense Voucher: ${expense.expenseNumber}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-slate-900">
                {expense.expenseNumber}
              </span>
              <Badge variant={expense.status === 'POSTED' ? 'default' : 'danger'}>
                {expense.status === 'POSTED' ? 'Posted Voucher' : 'Reversed (Bookkeeping Void)'}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatBusinessDate(expense.expenseDate)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-semibold uppercase">Category</span>
              <span className="font-bold text-slate-800">{expense.category}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold uppercase">Total Disbursed</span>
              <span className="font-mono font-bold text-sm text-teal-800">
                {formatInr(parseFloat(expense.amount))}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold uppercase">External Bill #</span>
              <span className="text-slate-700 font-mono">
                {expense.externalReference || <span className="text-slate-400 italic">None</span>}
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 block font-semibold uppercase">Description</span>
            <p className="text-sm font-medium text-slate-800 mt-0.5">{expense.description}</p>
          </div>

          {expense.notes && (
            <div className="pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-400 font-semibold uppercase">Notes: </span>
              <span className="text-slate-600 italic">{expense.notes}</span>
            </div>
          )}
        </div>

        {/* Reversal Banner if reversed */}
        {expense.status === 'REVERSED' && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-950">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Bookkeeping Reversal Record</span>
            </div>
            <p className="leading-relaxed">
              <strong>Reason:</strong> {expense.reversalReason || 'No reason supplied'}
            </p>
            {expense.reversalBusinessDate && (
              <p className="text-[11px] text-rose-700">
                Effective Reversal Date: {formatBusinessDate(expense.reversalBusinessDate)}
              </p>
            )}
          </div>
        )}

        {/* Payment Tender Components Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Disbursed Payment Components ({expense.components.length})
          </h4>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-2">Method</th>
                  <th className="px-4 py-2">Reference / Bank Detail</th>
                  <th className="px-4 py-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expense.components.map((comp, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2">
                      <Badge variant={comp.method === 'CASH' ? 'neutral' : 'info'} size="sm">
                        {comp.method}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 font-mono text-slate-600">
                      {comp.onlineReference || '—'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-slate-800">
                      {formatInr(parseFloat(comp.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reversal Form Mode */}
        {isReversalMode ? (
          <form onSubmit={handleConfirmReversal} className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <RotateCcw className="w-4 h-4 text-amber-700" />
              <span>Confirm Bookkeeping Reversal</span>
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              This will nullify this operating expense from period reports and accounting calculations.
              This represents an accounting correction (money return from a vendor should be separately verified).
            </p>

            {formError && <ErrorMessage error={formError} />}

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Reversal Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Duplicate entry by staff / bill was settled by owner personally"
                rows={2}
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Effective Reversal Business Date
              </label>
              <Input
                type="date"
                value={reversalDate}
                onChange={(e) => setReversalDate(e.target.value)}
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsReversalMode(false)}
                disabled={reverseMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                isLoading={reverseMutation.isPending}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Confirm Reversal
              </Button>
            </div>
          </form>
        ) : null}

        {/* Modal Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            {expense.status === 'POSTED' && !isReversalMode && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsReversalMode(true)}
                className="text-rose-700 hover:bg-rose-50 border-rose-200"
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Reverse Voucher
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              isLoading={isDownloadingPdf}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Voucher PDF
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
