import React from "react";

interface PageLayoutProps {
  header: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({
  header,
  sidebar,
  children,
  className = "",
}: PageLayoutProps) {
  return (
    <>
      <div className="bg-white"> {header}</div>

      <div className={`flex flex-col bg-blue text-slate-900 ${className}`}>
        {/* Main Content */}
        <main className=" w-full  ">
          {sidebar ? (
            <div className="grid h-full gap-6 lg:grid-cols-[280px_1fr]">
              {/* Sidebar */}
              {sidebar}

              {/* Main Content (scrollable) */}
              <section className="w-full mx-auto h-full overflow-y-auto">
                {children}
              </section>
            </div>
          ) : (
            // No sidebar layout
            <div className="flex items-center justify-center w-full">
              {children}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
