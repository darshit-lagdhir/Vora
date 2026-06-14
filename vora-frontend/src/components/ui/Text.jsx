import React from 'react';

/**
 * Reusable Text component to enforce the Vora design system's body sans typography.
 * Wraps body paragraphs inside Satoshi with appropriate line-height layouts.
 */
export default function Text({ children, variant = 'default', className = '' }) {
  const baseStyles = {
    default: 'text-zinc-200 font-sans leading-relaxed text-sm sm:text-base',
    muted: 'text-zinc-400 font-sans leading-relaxed text-sm',
  };

  const textClass = baseStyles[variant] || baseStyles.default;

  return (
    <p className={`${textClass} ${className}`}>
      {children}
    </p>
  );
}
