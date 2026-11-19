import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  icon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium uppercase tracking-wider text-ad-text-secondary"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 text-ad-text-secondary/70 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`
            w-full bg-ad-bg-secondary/70 border border-ad-burgundy/40 rounded-xl py-3 px-4 text-ad-text font-body text-sm
            placeholder:text-ad-text-secondary/40 focus:outline-none focus:border-ad-red/70 focus:ring-1 focus:ring-ad-red/40
            transition-all duration-200
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500/80 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      {hint && !error && <p className="text-xs text-ad-text-secondary/70 mt-1">{hint}</p>}
    </div>
  );
};
