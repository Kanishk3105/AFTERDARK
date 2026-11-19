import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all duration-300 rounded-xl focus:outline-none select-none disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'text-xs py-2 px-3 gap-1.5',
    md: 'text-sm py-3 px-5 gap-2',
    lg: 'text-base py-3.5 px-7 gap-2.5 font-semibold',
  };

  const variantClasses = {
    primary:
      'bg-ad-red text-ad-text shadow-lg shadow-ad-red/25 hover:shadow-ad-red/40 hover:bg-ad-red/90 border border-ad-red/40',
    secondary:
      'border border-ad-gold/50 text-ad-gold hover:bg-ad-gold/10 hover:border-ad-gold/80 bg-ad-bg-secondary/40 shadow-sm',
    ghost:
      'text-ad-text-secondary hover:text-ad-text hover:bg-ad-burgundy/25 bg-transparent',
    danger:
      'bg-red-950/80 text-red-200 border border-red-800/50 hover:bg-red-900/80',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.96 }}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : icon ? (
        <span className="flex-shrink-0 text-lg leading-none">{icon}</span>
      ) : null}
      <span>{children}</span>
    </motion.button>
  );
};
