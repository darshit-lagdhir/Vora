import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// Programmatic dispatch helper
export const toast = (message, type = 'info') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vora-toast', { detail: { message, type } }));
  }
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const { message, type } = e.detail || {};
      if (!message) return;
      
      const id = Math.random().toString(36).substring(2, 9);
      setToasts(prev => {
        const nextQueue = [...prev, { id, message, type }];
        // Enforce maximum 3 visible notifications (evict oldest)
        if (nextQueue.length > 3) {
          return nextQueue.slice(1);
        }
        return nextQueue;
      });

      // Automatically expire after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };

    window.addEventListener('vora-toast', handleToast);
    return () => window.removeEventListener('vora-toast', handleToast);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 max-w-sm w-full select-none pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ x: 150, opacity: 0, height: 0, padding: 0, margin: 0, border: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
            className="bg-zinc-900/60 backdrop-blur-2xl border border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] py-3 px-4 rounded-full flex items-center justify-between gap-3 text-left pointer-events-auto border-t-white/10"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Custom SVG status indicators */}
              {t.type === 'success' ? (
                <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.3)]" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="8" r="6" />
                </svg>
              ) : t.type === 'error' ? (
                <svg className="w-3.5 h-3.5 text-red-500 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="4" y1="4" x2="12" y2="12" />
                  <line x1="12" y1="4" x2="4" y2="12" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-sky-400 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="8" r="6" />
                </svg>
              )}
              
              {/* Message text in Satoshi font */}
              <p className="text-zinc-200 text-xs font-sans font-medium leading-none truncate pr-1">
                {t.message}
              </p>
            </div>

            {/* Manual X Dismiss button */}
            <button 
              onClick={() => removeToast(t.id)}
              className="text-zinc-550 hover:text-white p-0.5 rounded-full transition-colors cursor-pointer border-none bg-transparent outline-none shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
