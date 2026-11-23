import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, InputProps } from './Input';

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightElement' | 'rightIcon'> {
  showToggle?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showToggle = true, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <Input
        ref={ref}
        type={isVisible ? 'text' : 'password'}
        rightElement={
          showToggle ? (
            <button
              type="button"
              onClick={() => setIsVisible((prev) => !prev)}
              aria-label={isVisible ? 'Hide password' : 'Show password'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          ) : undefined
        }
        {...props}
      />
    );
  }
);
PasswordInput.displayName = 'PasswordInput';
