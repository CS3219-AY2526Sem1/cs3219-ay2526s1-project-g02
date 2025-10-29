import React from 'react';

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function Card({ children, onClick, selected = false, className = '' }: CardProps) {
  const baseStyles = 'rounded-lg border bg-white p-4 transition-all';
  const interactiveStyles = onClick ? 'cursor-pointer hover:shadow-sm' : '';
  const selectedStyles = selected ? 'border-blue-400 shadow-sm' : 'border-slate-200';

  return (
    <div
      onClick={onClick}
      className={`${baseStyles} ${interactiveStyles} ${selectedStyles} ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={`space-y-2 ${className}`}>{children}</div>;
}

interface CardTitleProps {
  children: React.ReactNode;
  href?: string;
  className?: string;
}

export function CardTitle({ children, href, className = '' }: CardTitleProps) {
  const baseStyles = 'text-base font-medium text-blue-600';
  const interactiveStyles = href ? 'hover:underline' : '';

  if (href) {
    return (
      <a href={href} className={`${baseStyles} ${interactiveStyles} ${className}`}>
        {children}
      </a>
    );
  }

  return <h3 className={`${baseStyles} ${className}`}>{children}</h3>;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`text-sm text-slate-600 ${className}`}>{children}</div>;
}
