import React from 'react';
import { Button } from './Button';
import { AFTERDARK_ASSETS } from '@/assets/afterdark';

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
      <img
        src={AFTERDARK_ASSETS.chat.emptyState}
        alt=""
        aria-hidden="true"
        className="mb-4 h-24 w-36 rounded-xl object-cover"
        loading="lazy"
        decoding="async"
      />
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
