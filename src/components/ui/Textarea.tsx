import React, { TextareaHTMLAttributes, useId } from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, disabled, rows = 3, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText ? `${textareaId}-helper` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-slate-700 select-none">
            {label}
            {props.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          disabled={disabled}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperId}
          className={cn(
            'block w-full rounded-lg border text-sm transition-colors p-3 bg-white text-slate-900',
            'focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600',
            'disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:cursor-not-allowed',
            error
              ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-300 placeholder:text-slate-400',
            className
          )}
          {...props}
        />
        {error ? (
          <p id={errorId} className="text-xs text-red-600 mt-1" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-slate-500 mt-1">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
