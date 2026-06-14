import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Premium Dialog modal conforming to the "5/10 Awwwards" design language.
 * Employs a soft glass backdrop blur, smooth scale transition, and keyboard escape listener.
 */
export default function VoraModal({
  isOpen,
  onClose,
  children,
  className = '',
  title = ''
}) {
  const modalRef = useRef(null);

  // Programmatic focus trapping hook for screen readers and keyboard user access (Task 4 trap)
  useEffect(() => {
    if (!isOpen) return;

    const previousActiveElement = document.activeElement;
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    // Focus the modal layout container or first interactive element upon mounting
    const focusModal = () => {
      if (!modalRef.current) return;
      const focusables = modalRef.current.querySelectorAll(focusableSelectors);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        modalRef.current.focus();
      }
    };

    const timer = setTimeout(focusModal, 50);

    const handleTabKey = (e) => {
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusables = Array.from(modalRef.current.querySelectorAll(focusableSelectors));
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        // Shift + Tab (Backward tab focus glide)
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        // Tab (Forward tab focus glide)
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleTabKey);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleTabKey);
      if (previousActiveElement && previousActiveElement.focus) {
        // Restore focus to initiating element on close/unmount
        previousActiveElement.focus();
      }
    };
  }, [isOpen]);
  // Bind Escape key event listener to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Lock scroll on body when modal is active
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Self-contained CSS transitions */}
      <style>{`
        @keyframes voraBackdropFade {
          from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        }
        @keyframes voraChassisScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-vora-backdrop {
          animation: voraBackdropFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-vora-chassis {
          animation: voraChassisScale 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Backdrop (Soft Glass) */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-zinc-950/40 animate-vora-backdrop"
        aria-hidden="true"
      />

      {/* Dialog Chassis */}
      <div 
        ref={modalRef}
        tabIndex={-1}
        className={`bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative z-10 animate-vora-chassis outline-none ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "vora-modal-title" : undefined}
      >
        {/* Subtle top horizontal indicator lighting */}
        <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/20 via-primary-500/10 to-transparent rounded-t-2xl" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors z-20"
          aria-label="Close modal dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {title && (
          <h3 
            id="vora-modal-title" 
            className="text-lg font-semibold font-display text-white tracking-tight mb-4"
          >
            {title}
          </h3>
        )}

        <div className="text-zinc-300">
          {children}
        </div>
      </div>
    </div>
  );
}
