import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'sage' | 'ocean' | 'sunrise' | 'lavender';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'md', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center font-semibold rounded-full border';
    
    const variants = {
      success: 'bg-success-100 text-success-700 border-success-200',
      warning: 'bg-warning-100 text-warning-700 border-warning-200',
      error: 'bg-error-100 text-error-700 border-error-200',
      info: 'bg-ocean-100 text-ocean-700 border-ocean-200',
      neutral: 'bg-sand-100 text-sand-700 border-sand-200',
      sage: 'bg-sage-100 text-sage-700 border-sage-200',
      ocean: 'bg-ocean-100 text-ocean-700 border-ocean-200',
      sunrise: 'bg-sunrise-100 text-sunrise-700 border-sunrise-200',
      lavender: 'bg-lavender-100 text-lavender-700 border-lavender-200'
    };

    const sizes = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-2 text-base'
    };

    return (
      <span
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
