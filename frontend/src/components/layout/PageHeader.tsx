import React from 'react';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, children, className = '' }: PageHeaderProps) {
  return (
    <header className={`border-b border-slate-200 ${className}`}>
      <div className="mx-auto max-w-6xl px-6 py-6">
        <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
        {children}
      </div>
    </header>
  );
}
