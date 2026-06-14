import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

/**
 * Reusable, high-fidelity Input component conforming to the Vora design system.
 * Features absolute icon integration, password reveal toggle, custom focus glow matrices,
 * and fluid Framer Motion validation error disclosure.
 */
export default function PremiumInput({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  icon: Icon,
  name,
  required = false,
  disabled = false,
}) {
  const [showPassword, setShowPassword] = useState(false);

  // Determine current input type (governs password visibility reveal)
  const resolvedType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className="w-full text-left">
      {label && (
        <label className="block text-[10px] font-semibold text-zinc-450 uppercase tracking-[0.2em] mb-2 font-technical">
          {label}
        </label>
      )}
      
      <div className="relative w-full">
        {/* Left Side Icon Slot */}
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none w-5 h-5 flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          name={name}
          type={resolvedType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`w-full bg-zinc-950 border rounded-xl py-3.5 text-white placeholder:text-zinc-600 font-form text-sm transition-all duration-200 ease-linear outline-none
            ${Icon ? 'pl-11' : 'px-4'}
            ${type === 'password' ? 'pr-11' : 'pr-4'}
            ${error 
              ? 'border-red-500/50 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 focus:bg-zinc-950' 
              : 'border-white/5 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 focus:bg-zinc-950'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />

        {/* Password Visibility Reveal Controller */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-550 hover:text-white transition-colors duration-200 cursor-pointer outline-none focus:outline-none w-5 h-5 flex items-center justify-center"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Animated Inline Error Reveal */}
      <AnimatePresence initial={false}>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="overflow-hidden"
          >
            <div className="text-[11px] text-rose-500/90 mt-2 flex items-center gap-1.5 font-technical">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500/90" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
