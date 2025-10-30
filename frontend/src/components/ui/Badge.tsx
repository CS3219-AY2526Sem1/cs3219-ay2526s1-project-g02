import React from 'react';

type DifficultyLevel = 'easy' | 'medium' | 'hard';

interface BadgeProps {
  difficulty: string;
  className?: string;
}

export function DifficultyBadge({ difficulty, className = '' }: BadgeProps) {
  const getDifficultyStyles = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-orange-100 text-orange-700';
      case 'hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${getDifficultyStyles(
        difficulty
      )} ${className}`}
    >
      {difficulty}
    </span>
  );
}
