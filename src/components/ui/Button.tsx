import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';
    
    const variants = {
      primary: 'bg-sage-600 text-white hover:bg-sage-700 hover:shadow-sage hover:-translate-y-0.5 focus:ring-sage-500',
      secondary: 'bg-white text-sage-700 border-2 border-sage-600 hover:bg-sage-50 hover:border-sage-700 hover:shadow-soft focus:ring-sage-500',
      ghost: 'text-sage-700 hover:bg-sage-50 hover:text-sage-800 focus:ring-sage-500',
      accent: 'bg-sunrise-600 text-white hover:bg-sunrise-700 hover:shadow-sunrise hover:-translate-y-0.5 focus:ring-sunrise-500',
      success: 'bg-success-600 text-white hover:bg-success-700 hover:shadow-medium hover:-translate-y-0.5 focus:ring-success-500',
      warning: 'bg-warning-600 text-white hover:bg-warning-700 hover:shadow-medium hover:-translate-y-0.5 focus:ring-warning-500',
      error: 'bg-error-600 text-white hover:bg-error-700 hover:shadow-medium hover:-translate-y-0.5 focus:ring-error-500',
      info: 'bg-ocean-600 text-white hover:bg-ocean-700 hover:shadow-ocean hover:-translate-y-0.5 focus:ring-ocean-500'
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg'
    };

    return (
      <button
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          loading && 'cursor-wait',
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
