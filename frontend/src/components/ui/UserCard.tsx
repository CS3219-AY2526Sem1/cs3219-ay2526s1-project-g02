import React from 'react';
import { UserAvatar } from './UserAvatar';

interface UserCardProps {
  username: string;
  role: string;
  joinedDate: string;
  className?: string;
}

export function UserCard({ username, role, joinedDate, className = '' }: UserCardProps) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-3">
        <UserAvatar username={username} size="md" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-blue-600">{username}</div>
          <div className="text-xs text-slate-600">{role}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {joinedDate}
          </div>
        </div>
      </div>
    </div>
  );
}
