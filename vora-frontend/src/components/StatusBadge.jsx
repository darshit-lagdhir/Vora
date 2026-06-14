import React from 'react';
import { motion } from 'framer-motion';

/**
 * Premium Status Badge conforming to the "5/10 Awwwards" design language.
 * Employs extremely tight padding, pill geometry, and low-opacity color indicators.
 */
export default function StatusBadge({
  status = 'neutral',
  className = '',
  children,
  ...props
}) {
  // Normalize status keys to ensure robust mapping
  const normalizedStatus = String(status).toLowerCase();

  const colorMap = {
    success: 'bg-emerald-500/10 text-emerald-400',
    verified: 'bg-emerald-500/10 text-emerald-400',
    active: 'bg-emerald-500/10 text-emerald-400',
    live: 'bg-emerald-500/10 text-emerald-400',
    
    error: 'bg-red-500/10 text-red-400',
    failed: 'bg-red-500/10 text-red-400',
    danger: 'bg-red-500/10 text-red-400',
    
    warning: 'bg-amber-500/10 text-amber-400',
    pending: 'bg-amber-500/10 text-amber-400',
    
    info: 'bg-indigo-500/10 text-indigo-400',
    blue: 'bg-indigo-500/10 text-indigo-400',
    
    neutral: 'bg-zinc-500/10 text-zinc-400',
    inactive: 'bg-zinc-500/10 text-zinc-400',
  };

  const selectedColors = colorMap[normalizedStatus] || colorMap.neutral;
  const isLive = normalizedStatus === 'live' || String(children || status).toLowerCase().includes('live');

  return (
    <motion.span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide font-art ${selectedColors} ${isLive ? 'soft-glass border border-emerald-500/20' : ''} ${className}`}
      animate={isLive ? { scale: [1, 1.05, 1] } : {}}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      transition={isLive ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
      {...props}
    >
      {children || status}
    </motion.span>
  );
}
