import React from 'react';

interface UserAvatarProps {
  username: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserAvatar({ username, size = 'md', className = '' }: UserAvatarProps) {
  const getInitials = (name: string): string => {
    const cleanName = name.replace('@', '').split(/[._-]/)[0];
    return cleanName.slice(0, 2).toUpperCase();
  };

  const sizeStyles = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-base'
  };

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-slate-900 font-medium text-white ${sizeStyles[size]} ${className}`}
    >
      {getInitials(username)}
    </div>
  );
}
