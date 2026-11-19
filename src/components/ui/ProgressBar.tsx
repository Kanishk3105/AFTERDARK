import React from 'react';
import { motion } from 'framer-motion';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  variant?: 'red' | 'gold' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'gradient',
  size = 'md',
  showLabel = false,
  label,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const fillVariants = {
    red: 'bg-ad-red',
    gold: 'bg-ad-gold',
    gradient: 'bg-gradient-to-r from-ad-red via-pink-700 to-ad-gold',
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-xs text-ad-text-secondary">
          <span>{label || 'Progress'}</span>
          <span className="font-semibold text-ad-gold">{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={`w-full bg-ad-burgundy/30 rounded-full overflow-hidden border border-ad-burgundy/40 ${sizeClasses[size]}`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${fillVariants[variant]}`}
        />
      </div>
    </div>
  );
};
