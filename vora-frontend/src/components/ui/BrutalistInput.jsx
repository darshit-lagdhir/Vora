import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
  * High-Fidelity Data Input conforming to the Phase 22 visual specs.
  * Extracted structural label sits above and outside the input box using custom display typography.
  */
export default function BrutalistInput({
  label,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  disabled = false,
  className = '',
  id,
  icon: Icon,
  error,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const resolvedType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className={`w-full flex flex-col text-left ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[10px] font-bold font-brutalist uppercase tracking-[0.2em] mb-2 text-zinc-400 select-none"
        >
          {label}
        </label>
      )}
      
      <div className="relative w-full">
        {/* Optional input leading icon */}
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none w-5 h-5 flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          type={resolvedType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full bg-zinc-950/50 border border-transparent focus:border-white/20 text-white placeholder-zinc-650 rounded-xl text-sm py-3.5 outline-none transition-all duration-300 focus:ring-0 focus:shadow-none focus:bg-zinc-950/80 focus-neon-diffuse disabled:opacity-50 disabled:pointer-events-none
            ${Icon ? 'pl-11' : 'px-4'}
            ${type === 'password' ? 'pr-11' : 'pr-4'}
          `}
          {...props}
        />

        {/* Optional trailing password reveal button */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-550 hover:text-white transition-colors duration-200 cursor-pointer outline-none focus:outline-none w-5 h-5 flex items-center justify-center border-none bg-transparent"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {error && (
        <span className="text-[11px] text-rose-500/90 mt-2 block font-technical">
          {error}
        </span>
      )}
    </div>
  );
}
