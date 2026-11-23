import React, { useId } from 'react';
import { cn } from '../../utils/cn';

export interface FormFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helperText,
  required,
  children,
  className,
}) => {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;
  const describedBy = error ? errorId : helperId;

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 select-none">
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': !!error })}
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
};
