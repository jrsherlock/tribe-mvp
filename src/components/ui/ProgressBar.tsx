import React from 'react';
import { cn } from '../../utils/cn';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: 'sage' | 'ocean' | 'sunrise' | 'lavender' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value, max = 100, variant = 'sage', size = 'md', showLabel = false, label, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const containerClasses = cn(
      'w-full bg-sand-200 rounded-full overflow-hidden',
      size === 'sm' && 'h-2',
      size === 'md' && 'h-3',
      size === 'lg' && 'h-4',
      className
    );

    const fillClasses = cn(
      'h-full transition-all duration-500 ease-out rounded-full',
      variant === 'sage' && 'bg-gradient-to-r from-sage-500 to-sage-600',
      variant === 'ocean' && 'bg-gradient-to-r from-ocean-600 to-ocean-700',
      variant === 'sunrise' && 'bg-gradient-to-r from-sunrise-500 to-sunrise-600',
      variant === 'lavender' && 'bg-gradient-to-r from-lavender-500 to-lavender-600',
      variant === 'success' && 'bg-gradient-to-r from-success-500 to-success-600',
      variant === 'warning' && 'bg-gradient-to-r from-warning-500 to-warning-600',
      variant === 'error' && 'bg-gradient-to-r from-error-500 to-error-600'
    );

    return (
      <div className="space-y-2" ref={ref} {...props}>
        {(showLabel || label) && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-sand-600">
              {label || 'Progress'}
            </span>
            {showLabel && (
              <span className="text-sm font-medium text-sand-600">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        )}
        
        <div className={containerClasses}>
          <div
            className={fillClasses}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={label || `Progress: ${Math.round(percentage)}%`}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

export { ProgressBar };
