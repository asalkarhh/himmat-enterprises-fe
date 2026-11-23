import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, RotateCcw } from 'lucide-react';
import Decimal from 'decimal.js';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ErrorMessage } from '../ui/ErrorMessage';
import { purchaseApi } from '../../api/purchase.api';
import { queryKeys } from '../../api/queryKeys';
import { useToast } from '../../hooks/useToast';
import {
  PurchaseResponseDto,
  CreatePurchaseReturnRequest,
  PurchaseReturnLineRequest,
} from '../../types/purchase.types';
import { formatInr } from '../../utils/formatters';
import { generateIdempotencyKey, parseApiError } from '../../api/apiHelpers';

export interface PurchaseReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: PurchaseResponseDto;
  onSuccess?: () => void;
}

export const PurchaseReturnModal: React.FC<PurchaseReturnModalProps> = ({
  isOpen,
  onClose,
  purchase,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleQuantityChange = (lineId: string, val: string) => {
    if (val === '' || /^\d+$/.test(val)) {
      setReturnQuantities((prev) => ({ ...prev, [lineId]: val }));
    }
  };

  // Compute estimated return total based on saved gross unit rates
  let estimatedTotal = new Decimal(0);
  const activeReturnLines: PurchaseReturnLineRequest[] = [];

  for (const line of purchase.lines) {
    const qtyStr = returnQuantities[line.id] || '';
    const qty = parseInt(qtyStr, 10);
    if (!isNaN(qty) && qty > 0) {
      activeReturnLines.push({
        purchaseLineId: line.id,
        quantity: qty,
      });
      const grossRate = new Decimal(line.grossUnitCost);
      estimatedTotal = estimatedTotal.plus(grossRate.mul(qty));
    }
  }

  const validate = (): string | null => {
    if (!reason || reason.trim().length < 3) {
      return 'Return reason is required (minimum 3 characters).';
    }
    if (activeReturnLines.length === 0) {
      return 'Please enter a return quantity (>= 1) on at least one line.';
    }

    for (const retLine of activeReturnLines) {
      const line = purchase.lines.find((l) => String(l.id) === String(retLine.purchaseLineId));
      if (!line) continue;
      if (retLine.quantity > line.remainingQuantity) {
        return `Cannot return ${retLine.quantity} pcs for ${line.sku}. Maximum remaining returnable quantity is ${line.remainingQuantity} pcs.`;
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

    const payload: CreatePurchaseReturnRequest = {
      returnDate: returnDate || undefined,
      reason: reason.trim(),
      lines: activeReturnLines,
    };

    try {
      const idempotencyKey = generateIdempotencyKey();
      const response = await purchaseApi.createPurchaseReturn(purchase.id, payload, idempotencyKey);

      // Invalidate relevant query caches
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.supplierFinance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });

      toastSuccess(`Purchase return ${response.returnNumber} processed successfully!`);
      onSuccess?.();
      onClose();
    } catch (rawErr) {
      const parsed = parseApiError(rawErr);
      setSubmitError(parsed.message || 'Failed to process purchase return.');
      toastError(parsed.message || 'Return failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Create Return — ${purchase.purchaseNumber}`}
      size="xl"
    >
      <div className="space-y-5">
        {submitError && <ErrorMessage error={submitError} />}

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            Stock & Financial Impact Notice
          </p>
          <p className="text-amber-800">
            Returning goods directly reduces on-hand inventory stock and decreases this purchase invoice's payable amount. If payments were already allocated to this bill, the excess will automatically be released back to the supplier as unallocated advance credit.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Return Date"
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <Textarea
          label="Return Reason *"
          placeholder="e.g. Defective batch received, packaging damaged during transit, excess delivery..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          required
          disabled={isSubmitting}
          helperText="Mandatory reason for debit note and audit trail."
        />

        <div>
          <h4 className="text-xs uppercase font-semibold text-slate-500 mb-2">
            Select Lines & Return Quantities
          </h4>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Variant / SKU</th>
                  <th className="py-2.5 px-3 text-right">Purchased</th>
                  <th className="py-2.5 px-3 text-right">Returned</th>
                  <th className="py-2.5 px-3 text-right">Available</th>
                  <th className="py-2.5 px-3 text-right">Saved Gross Cost</th>
                  <th className="py-2.5 px-3 text-right w-32">Return Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchase.lines.map((line) => {
                  const qtyVal = returnQuantities[line.id] || '';
                  const isEligible = line.remainingQuantity > 0;

                  return (
                    <tr
                      key={line.id}
                      className={isEligible ? 'hover:bg-slate-50/50' : 'bg-slate-50 text-slate-400'}
                    >
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-semibold bg-slate-100 px-1 py-0.5 rounded text-slate-900">
                          {line.sku}
                        </span>
                        <div className="text-slate-600 mt-0.5 truncate max-w-xs">
                          {line.productName} ({line.sizeLabel})
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">{line.quantity} pcs</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        {line.returnedQuantity} pcs
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {line.remainingQuantity} pcs
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {formatInr(line.grossUnitCost)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Input
                          type="number"
                          min="0"
                          max={line.remainingQuantity}
                          step="1"
                          placeholder="0"
                          value={qtyVal}
                          onChange={(e) => handleQuantityChange(String(line.id), e.target.value)}
                          disabled={!isEligible || isSubmitting}
                          className="py-1 text-xs text-right"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Estimated Refund Total */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium">
          <span className="text-slate-600">Estimated Total Return Value:</span>
          <span className="text-base font-bold text-slate-900">
            {formatInr(estimatedTotal.toFixed(2))}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={activeReturnLines.length === 0}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Confirm Purchase Return
          </Button>
        </div>
      </div>
    </Modal>
  );
};
