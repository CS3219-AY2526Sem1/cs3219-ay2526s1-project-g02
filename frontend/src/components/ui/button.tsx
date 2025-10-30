import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'destructive' | 'default' | 'outline' | 'ghost';
  size?: 'default' | 'icon';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'default',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'rounded text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

  const sizeStyles = {
    default: 'w-full px-4 py-3',
    icon: 'w-10 h-10 p-0 flex items-center justify-center'
  };

  const variantStyles = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    default: 'bg-slate-900 text-white hover:bg-slate-800',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'border border-slate-300 bg-transparent text-slate-900 hover:bg-slate-100',
    ghost: 'bg-transparent text-slate-900 hover:bg-slate-100'
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
