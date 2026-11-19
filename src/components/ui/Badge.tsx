import React from 'react';

export interface BadgeProps {
  variant?: 'gold' | 'red' | 'burgundy' | 'outline' | 'slate';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'gold',
  size = 'md',
  children,
  icon,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const variantClasses = {
    gold: 'bg-ad-gold/15 text-ad-gold border border-ad-gold/30',
    red: 'bg-ad-red/20 text-red-300 border border-ad-red/40',
    burgundy: 'bg-ad-burgundy/40 text-ad-text border border-ad-burgundy/60',
    outline: 'border border-ad-burgundy/50 text-ad-text-secondary bg-transparent',
    slate: 'bg-slate-800/60 text-slate-300 border border-slate-700/60',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {icon && <span className="leading-none">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
