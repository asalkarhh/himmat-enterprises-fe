import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants = {
      primary:
        'bg-teal-700 hover:bg-teal-800 text-white focus:ring-teal-600 shadow-sm active:bg-teal-900',
      secondary:
        'bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-400 active:bg-slate-300',
      outline:
        'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus:ring-teal-600 shadow-sm',
      ghost:
        'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-300',
      danger:
        'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm active:bg-red-800',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);
Button.displayName = 'Button';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon: React.ReactNode;
  'aria-label': string; // Mandatory for accessibility
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      disabled,
      icon,
      type = 'button',
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants = {
      primary:
        'bg-teal-700 hover:bg-teal-800 text-white focus:ring-teal-600 shadow-sm active:bg-teal-900',
      secondary:
        'bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-400 active:bg-slate-300',
      outline:
        'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus:ring-teal-600 shadow-sm',
      ghost:
        'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-300',
      danger:
        'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm active:bg-red-800',
    };

    const sizes = {
      sm: 'p-1.5 text-xs',
      md: 'p-2 text-sm',
      lg: 'p-2.5 text-base',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-label={ariaLabel}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : icon}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';
