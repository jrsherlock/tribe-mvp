import React from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface ToastContentProps {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  icon?: React.ReactNode;
}

export const ToastContent: React.FC<ToastContentProps> = ({ 
  type, 
  title, 
  message, 
  icon 
}) => {
  const getIcon = () => {
    if (icon) return icon;
    
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-error-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-ocean-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-success-600" />;
    }
  };

  const getTextColors = () => {
    switch (type) {
      case 'success':
        return 'text-sand-800';
      case 'error':
        return 'text-sand-800';
      case 'warning':
        return 'text-sand-800';
      case 'info':
        return 'text-sand-800';
      default:
        return 'text-sand-800';
    }
  };

  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className={`font-semibold ${getTextColors()}`}>
          {title}
        </p>
        {message && (
          <p className={`text-sm ${getTextColors()} opacity-80 mt-1`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export const getToastStyles = (type: 'success' | 'error' | 'info' | 'warning') => {
  const baseStyles = {
    borderRadius: '12px',
    maxWidth: '400px',
    padding: '16px'
  };

  switch (type) {
    case 'success':
      return {
        ...baseStyles,
        background: '#f6f8f6',
        border: '1px solid #22c55e',
        color: '#335533'
      };
    case 'error':
      return {
        ...baseStyles,
        background: '#fef2f2',
        border: '1px solid #ef4444',
        color: '#7f1d1d'
      };
    case 'warning':
      return {
        ...baseStyles,
        background: '#fffbeb',
        border: '1px solid #f59e0b',
        color: '#78350f'
      };
    case 'info':
      return {
        ...baseStyles,
        background: '#f0f9ff',
        border: '1px solid #0284c7',
        color: '#0c4a6e'
      };
    default:
      return baseStyles;
  }
};

// Therapeutic toast presets for common scenarios
export const therapeuticToasts = {
  checkinSuccess: (isPrivate: boolean, isUpdate: boolean) => ({
    title: `Check-in ${isUpdate ? 'updated' : 'completed'} successfully!`,
    message: isPrivate
      ? '🔒 Kept private for your personal tracking'
      : '🌟 Shared with your Tribe for support',
    type: 'success' as const,
    duration: 4000
  }),

  checkinError: () => ({
    title: 'Failed to save check-in',
    message: 'Please check your connection and try again',
    type: 'error' as const,
    duration: 5000
  }),

  profileUpdated: () => ({
    title: 'Profile updated successfully!',
    message: 'Your changes have been saved',
    type: 'success' as const,
    duration: 3000
  }),

  welcomeToFeed: () => ({
    title: 'Welcome to the Tribe Feed!',
    message: 'Your check-in has been shared with your tribe',
    type: 'success' as const,
    duration: 3000
  }),

  connectionError: () => ({
    title: 'Connection Error',
    message: 'Please check your internet connection and try again',
    type: 'error' as const,
    duration: 4000
  }),

  loadingCheckin: (isUpdate: boolean) => ({
    title: isUpdate ? 'Updating your check-in...' : 'Saving your check-in...',
    type: 'info' as const,
    icon: '💾'
  })
};

export default ToastContent;
