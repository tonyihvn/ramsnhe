
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  disabled = false,
  className,
  style,
  type = 'button',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center border border-transparent font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ease-in-out';

  const variantClasses = {
    primary: disabled
      ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
      : 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 cursor-pointer',
    secondary: disabled
      ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-60'
      : 'bg-primary-100 text-primary-700 hover:bg-primary-200 focus:ring-primary-500 cursor-pointer border border-primary-200',
    danger: disabled
      ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
      : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 cursor-pointer',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-5 w-5',
  }

  // Fallback inline styles to ensure colors are applied
  const variantStyles = {
    primary: disabled
      ? { backgroundColor: '#d1d5db', color: '#ffffff' }
      : { backgroundColor: '#2563eb', color: '#ffffff' },
    secondary: disabled
      ? { backgroundColor: '#e5e7eb', color: '#9ca3af' }
      : { backgroundColor: '#dbeafe', color: '#1d4ed8' },
    danger: disabled
      ? { backgroundColor: '#d1d5db', color: '#ffffff' }
      : { backgroundColor: '#dc2626', color: '#ffffff' },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`.trim()}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {leftIcon && <span className={`mr-2 -ml-1 ${iconSizeClasses[size]}`}>{leftIcon}</span>}
      {children}
    </button>
  );
};

export default Button;
