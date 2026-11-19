import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'glass' | 'solid' | 'bordered';
  hover?: boolean;
  glow?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'glass',
  hover = false,
  glow = false,
  children,
  className = '',
  ...props
}) => {
  const variantClasses = {
    glass:
      'bg-gradient-to-b from-ad-burgundy/20 to-ad-bg/90 backdrop-blur-md border border-ad-burgundy/30',
    solid:
      'bg-ad-bg-secondary border border-ad-burgundy/40',
    bordered:
      'bg-transparent border border-ad-burgundy/50',
  };

  const glowClass = glow ? 'shadow-xl shadow-ad-red/20 border-ad-red/40' : '';
  const hoverClass = hover
    ? 'hover:border-ad-red/50 hover:shadow-lg hover:shadow-ad-red/10 cursor-pointer transition-colors duration-300'
    : '';

  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      whileTap={hover ? { scale: 0.99 } : undefined}
      className={`rounded-2xl p-5 ${variantClasses[variant]} ${glowClass} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};
