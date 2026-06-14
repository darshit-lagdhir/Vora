import React from 'react';

/**
 * Reusable Badge component for micro uppercase indicators (e.g., tags, status logs).
 * Enforces strict uppercase tracked-out Satoshi style parameters.
 */
export default function Badge({ children, variant = 'default', className = '' }) {
  const baseStyles = 'inline-flex items-center px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest font-sans rounded-full border select-none';
  
  const variantStyles = {
    default: 'bg-zinc-900 border-zinc-800 text-zinc-300',
    primary: 'bg-primary-500/10 border-primary-500/20 text-primary-400',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    danger: 'bg-red-500/10 border-red-500/20 text-red-400',
  };

  const badgeClass = variantStyles[variant] || variantStyles.default;

  return (
    <span className={`${baseStyles} ${badgeClass} ${className}`}>
      {children}
    </span>
  );
}
