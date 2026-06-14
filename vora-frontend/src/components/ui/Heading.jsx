import React from 'react';

/**
 * Reusable Heading component to enforce the Vora design system's display typography.
 * Automatically wraps headings inside Clash Display with tight letter-spacing overrides.
 */
export default function Heading({ children, level = 'h1', className = '' }) {
  const Tag = level;
  
  const baseStyles = {
    h1: 'text-4xl md:text-6xl font-bold font-display tracking-tighter text-white',
    h2: 'text-2xl md:text-4xl font-bold font-display tracking-tight text-white',
    h3: 'text-xl md:text-2xl font-bold font-display tracking-tight text-zinc-100',
    h4: 'font-technical text-[10px] tracking-[0.2em] uppercase text-zinc-450 font-semibold',
  };

  const headingClass = baseStyles[Tag] || baseStyles.h1;

  return (
    <Tag className={`${headingClass} ${className}`}>
      {children}
    </Tag>
  );
}
