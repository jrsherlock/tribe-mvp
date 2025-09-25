import React from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'sage' | 'ocean' | 'sunrise' | 'lavender';
  padding?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const baseClasses = 'rounded-xl border transition-all duration-200';
    
    const variants = {
      default: 'bg-white border-sand-200 shadow-soft hover:shadow-medium',
      elevated: 'bg-white border-sand-200 shadow-medium hover:shadow-strong',
      interactive: 'bg-white border-sand-200 shadow-soft hover:shadow-medium hover:-translate-y-1 cursor-pointer',
      sage: 'bg-sage-500 text-white border-sage-600 shadow-sage hover:shadow-strong hover:bg-sage-600',
      ocean: 'bg-ocean-600 text-white border-ocean-700 shadow-ocean hover:shadow-strong hover:bg-ocean-700',
      sunrise: 'bg-sunrise-500 text-white border-sunrise-600 shadow-sunrise hover:shadow-strong hover:bg-sunrise-600',
      lavender: 'bg-lavender-500 text-white border-lavender-600 shadow-lavender hover:shadow-strong hover:bg-lavender-600'
    };

    const paddings = {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    };

    return (
      <div
        className={cn(
          baseClasses,
          variants[variant],
          paddings[padding],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export { Card };
