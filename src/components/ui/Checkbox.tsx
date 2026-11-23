import React, { InputHTMLAttributes, useId } from 'react';
import { cn } from '../../utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;

    return (
      <div className="relative flex items-start">
        <div className="flex h-5 items-center">
          <input
            id={checkboxId}
            ref={ref}
            type="checkbox"
            disabled={disabled}
            className={cn(
              'h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-300',
              className
            )}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="ml-3 text-sm">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn('font-medium text-slate-700 select-none', disabled && 'opacity-50')}
              >
                {label}
              </label>
            )}
            {description && (
              <p className={cn('text-xs text-slate-500', disabled && 'opacity-50')}>
                {description}
              </p>
            )}
            {error && (
              <p className="text-xs text-red-600 mt-0.5" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';
