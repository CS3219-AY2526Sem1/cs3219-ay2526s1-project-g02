import React from "react";

interface SidebarProps {
  title: string;
  children?: React.ReactNode;
  bottomContent?: React.ReactNode;
  className?: string;
}

export function Sidebar({
  title,
  children,
  bottomContent,
  className = "",
}: SidebarProps) {
  return (
    <aside className={`flex h-full flex-col ${className}`}>
      {/* Top section - Title */}
      <div className="">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      {/* Middle section - Optional content */}
      {children && <div className="flex-1">{children}</div>}

      {/* Bottom section - Sticky to bottom */}
      {bottomContent && (
        <div className="mt-auto flex flex-col gap-3">{bottomContent}</div>
      )}
    </aside>
  );
}
