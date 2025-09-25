import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, required, leftIcon, rightIcon, ...props }, ref) => {
    const inputClasses = cn(
      'w-full px-4 py-3 border-2 rounded-lg font-body text-sand-600 bg-white transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-opacity-20',
      'placeholder:text-sand-400',
      error 
        ? 'border-error-500 focus:border-error-500 focus:ring-error-500' 
        : 'border-sand-200 focus:border-sage-500 focus:ring-sage-500',
      leftIcon && 'pl-12',
      rightIcon && 'pr-12',
      props.disabled && 'opacity-50 cursor-not-allowed bg-sand-50',
      className
    );

    return (
      <div className="space-y-2">
        {label && (
          <label className={cn(
            'block font-semibold text-sm text-sand-600',
            required && "after:content-['*'] after:text-error-500 after:ml-1"
          )}>
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="text-sand-400">
                {leftIcon}
              </div>
            </div>
          )}
          
          <input
            className={inputClasses}
            ref={ref}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <div className="text-sand-400">
                {rightIcon}
              </div>
            </div>
          )}
        </div>
        
        {error && (
          <p className="text-sm text-error-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className="text-sm text-sand-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
