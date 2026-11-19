import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '🌹',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-ad-burgundy/30 bg-ad-bg-secondary/30 backdrop-blur-sm ${className}`}
    >
      <span className="text-4xl mb-4 select-none">{icon}</span>
      <h3 className="font-display text-lg font-semibold text-ad-text tracking-wide mb-1.5">
        {title}
      </h3>
      <p className="text-xs text-ad-text-secondary max-w-xs mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
