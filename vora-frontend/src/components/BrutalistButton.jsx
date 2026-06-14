import React from 'react';

/**
 * Premium Action Button conforming to the "5/10 Awwwards" design language.
 * Employs hardware-accelerated micro-interactions and tactile feedback scale-95 animations.
 */
export default function BrutalistButton({
  children,
  onClick,
  disabled = false,
  className = '',
  variant = 'primary',
  type = 'button',
  ...props
}) {
  // Define variant styles
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded-lg text-sm px-4 py-2.5 transition-all duration-200 outline-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-500 text-white shadow-soft hover:shadow-glow',
    secondary: 'bg-zinc-800/50 hover:bg-zinc-800/80 text-zinc-200 border border-zinc-700/50',
    ghost: 'bg-transparent hover:bg-zinc-800/50 text-zinc-300',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-soft',
  };

  const selectedVariant = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${selectedVariant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
