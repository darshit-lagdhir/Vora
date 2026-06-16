import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * High-Fidelity Progressive Image Loader with Blur-Up Kinetics.
 * Eradicates Cumulative Layout Shift (CLS) by locking aspect boundaries.
 * Fades in the sharp image over a low-resolution base64 blurred placeholder.
 * Incorporates Procedural Degradation for failed avatar/banner assets.
 */
export default function ProgressiveImage({ 
  src, 
  placeholderSrc, 
  alt = '', 
  className = '', 
  imgClassName = '',
  aspectClass = 'aspect-[16/10]',
  fallbackType = 'banner',
  initials = '',
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);

    if (!src) {
      setHasError(true);
      return;
    }

    const img = new Image();
    img.src = src;
    if (img.complete) {
      setIsLoaded(true);
      return;
    }

    img.onload = () => {
      setIsLoaded(true);
    };
    img.onerror = () => {
      setHasError(true);
    };
  }, [src]);

  // Microscopic base64 fallback loading placeholder
  const placeholder = placeholderSrc || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxMCI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjMWExYTFmIi8+PC9zdmc+';

  if (hasError) {
    if (fallbackType === 'avatar') {
      return (
        <div 
          className={`flex items-center justify-center bg-primary-950 text-white font-accent font-bold uppercase rounded-full aspect-square ${className}`} 
          style={{ width: '100%', height: '100%', minWidth: 'inherit', minHeight: 'inherit' }}
          {...props}
        >
          <span className="text-xs tracking-wider select-none">
            {initials || (alt ? alt.charAt(0).toUpperCase() : 'U')}
          </span>
        </div>
      );
    }

    // Default fallback is a gorgeous radial mesh gradient preserving layout dimensions
    return (
      <div 
        className={`w-full h-full progressive-image-placeholder ${aspectClass} ${className} relative overflow-hidden bg-zinc-950 border border-white/5`} 
        style={{
          backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(124, 58, 237, 0.18) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(24, 24, 27, 0.9) 0%, #09090b 100%)',
        }}
        {...props}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden w-full h-full ${aspectClass} ${className}`} {...props}>
      {/* Blurred Placeholder */}
      {!isLoaded && (
        <img
          src={placeholder}
          alt="Loading blur-up placeholder"
          className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 transition-opacity duration-300 pointer-events-none"
        />
      )}

      {/* High-Resolution target image */}
      <motion.img
        src={src}
        alt={alt}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        onError={() => setHasError(true)}
        className={`absolute inset-0 w-full h-full object-cover ${imgClassName}`}
      />
    </div>
  );
}
