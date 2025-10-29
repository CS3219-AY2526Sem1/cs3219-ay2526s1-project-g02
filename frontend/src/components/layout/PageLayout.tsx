import React from 'react';

interface PageLayoutProps {
  header: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ header, sidebar, children, className = '' }: PageLayoutProps) {
  return (
    <div className={`flex h-screen flex-col bg-white text-slate-900 ${className}`}>
      {/* Header */}
      {header}

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 overflow-hidden px-6 py-6">
        {sidebar ? (
          <div className="grid h-full gap-6 lg:grid-cols-[280px_1fr]">
            {/* Sidebar */}
            {sidebar}

            {/* Main Content (scrollable) */}
            <section className="h-full overflow-y-auto">{children}</section>
          </div>
        ) : (
          // No sidebar layout
          <div className="h-full overflow-y-auto">{children}</div>
        )}
      </main>
    </div>
  );
}
