import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { PaymentComponentDto, PaymentMethod } from '../../types/purchase.types';
import { formatInr } from '../../utils/formatters';
import Decimal from 'decimal.js';

export interface PaymentComponentsInputProps {
  components: PaymentComponentDto[];
  onChange: (components: PaymentComponentDto[]) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  helperText?: string;
}

export const PaymentComponentsInput: React.FC<PaymentComponentsInputProps> = ({
  components,
  onChange,
  disabled = false,
  className = '',
  label = 'Payment Split / Tendered Modes',
  helperText,
}) => {
  const handleAddComponent = () => {
    onChange([
      ...components,
      {
        method: 'CASH',
        amount: '',
        onlineReference: '',
      },
    ]);
  };

  const handleRemoveComponent = (index: number) => {
    if (components.length <= 1) {
      onChange([{ method: 'CASH', amount: '', onlineReference: '' }]);
      return;
    }
    const next = [...components];
    next.splice(index, 1);
    onChange(next);
  };

  const handleChangeMethod = (index: number, method: PaymentMethod) => {
    const next = [...components];
    next[index] = {
      ...next[index],
      method,
      onlineReference: method === 'ONLINE' ? next[index].onlineReference || '' : '',
    };
    onChange(next);
  };

  const handleChangeAmount = (index: number, val: string) => {
    // Decimal amount validation: numbers and at most 1 decimal point with 2 decimals
    if (val === '' || /^\d*(\.\d{0,2})?$/.test(val)) {
      const next = [...components];
      next[index] = { ...next[index], amount: val };
      onChange(next);
    }
  };

  const handleChangeReference = (index: number, ref: string) => {
    const next = [...components];
    next[index] = { ...next[index], onlineReference: ref };
    onChange(next);
  };

  // Compute total
  let totalDecimal = new Decimal(0);
  try {
    for (const c of components) {
      if (c.amount && !isNaN(Number(c.amount))) {
        totalDecimal = totalDecimal.plus(new Decimal(c.amount));
      }
    }
  } catch {
    // ignore parsing errors
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-semibold text-slate-800">{label}</label>
          {helperText && <p className="text-xs text-slate-500 mt-0.5">{helperText}</p>}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddComponent}
          disabled={disabled}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Mode
        </Button>
      </div>

      <div className="space-y-2.5">
        {components.map((comp, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
          >
            {/* Mode Select */}
            <div className="w-full sm:w-36">
              <Select
                value={comp.method}
                onChange={(e) => handleChangeMethod(idx, e.target.value as PaymentMethod)}
                options={[
                  { value: 'CASH', label: 'Cash' },
                  { value: 'ONLINE', label: 'Online / Bank' },
                ]}
                disabled={disabled}
                className="py-1.5 text-xs bg-white"
              />
            </div>

            {/* Amount */}
            <div className="w-full sm:w-40">
              <Input
                placeholder="Amount (₹)"
                value={comp.amount}
                onChange={(e) => handleChangeAmount(idx, e.target.value)}
                disabled={disabled}
                className="py-1.5 text-xs bg-white text-right font-medium"
              />
            </div>

            {/* Online Reference (only when ONLINE) */}
            {comp.method === 'ONLINE' ? (
              <div className="flex-1">
                <Input
                  placeholder="Txn / UTR / Cheque Ref..."
                  value={comp.onlineReference || ''}
                  onChange={(e) => handleChangeReference(idx, e.target.value)}
                  disabled={disabled}
                  className="py-1.5 text-xs bg-white font-mono"
                />
              </div>
            ) : (
              <div className="flex-1 text-xs text-slate-400 italic px-2">
                Physical counter cash receipt/payment
              </div>
            )}

            {/* Remove button */}
            {components.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveComponent(idx)}
                disabled={disabled}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors self-end sm:self-center"
                title="Remove component"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Total tendered display */}
      <div className="flex items-center justify-between px-3 py-2 bg-teal-50/50 border border-teal-200/80 rounded-lg text-xs font-medium text-teal-900">
        <span>Total Tendered:</span>
        <span className="text-sm font-bold">{formatInr(totalDecimal.toString())}</span>
      </div>
    </div>
  );
};
