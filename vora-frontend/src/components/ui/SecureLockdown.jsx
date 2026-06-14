import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import axios from 'axios';

/**
 * SecureLockdown page overlay quarantine.
 * Binds the user to an isolated safety view, stripping sidebars and navbars,
 * and records forensic violation metadata in the background.
 */
export default function SecureLockdown({ userRole, email, userId }) {
  const navigate = useNavigate();

  useEffect(() => {
    // Silent logging request to forensic audit ledger on the backend
    const logRbacViolation = async () => {
      try {
        const token = localStorage.getItem('token');
        await axios.post('/api/v1/security/log-violation', {
          path: window.location.pathname,
          userRole: userRole || 'GUEST',
          userId: userId || 'anonymous',
          email: email || 'anonymous@vora.io'
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('[SecureLockdown] Silent logging failure:', err);
      }
    };
    logRbacViolation();
  }, [userRole, email, userId]);

  const handleReturn = () => {
    // secure redirect back to authorized location
    if (userRole === 'ORGANIZER') {
      navigate('/organizer');
    } else if (userRole === 'ATTENDEE') {
      navigate('/attendee');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 z-[9999] text-white flex flex-col items-center justify-center p-6 select-none">
      
      {/* Background ambient crimson warning glow */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full filter blur-[150px] opacity-15 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      />

      {/* Main Container */}
      <div className="max-w-md w-full flex flex-col items-center text-center space-y-8 relative z-10">
        
        {/* Animated Locked Vault SVG / Shield Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-zinc-900 border border-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
            <ShieldAlert className="w-12 h-12 stroke-[1.5] animate-pulse" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
          </span>
        </div>

        {/* Access Restricted Header in Clash Display */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-white font-display uppercase">
            Access Restricted
          </h1>
          <p className="text-zinc-500 font-technical text-[10px] tracking-[0.25em] uppercase font-semibold">
            DEFENSE SHIELDS ACTIVE
          </p>
        </div>

        {/* Satoshi Forensic Prose details */}
        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans max-w-xs">
          Your current session is authenticated as an <span className="text-white font-semibold uppercase">{userRole || 'GUEST'}</span>. 
          The requested environment requires <span className="text-white font-semibold">ORGANIZER</span> or <span className="text-white font-semibold">ADMINISTRATOR</span> privileges. 
          Access has been cryptographically denied and the attempt has been logged.
        </p>

        {/* Ghost-styled Inter button */}
        <button
          onClick={handleReturn}
          className="px-6 py-3 border border-white/10 hover:border-white/20 bg-zinc-900/40 hover:bg-zinc-900/80 text-white font-semibold text-xs tracking-wider rounded-xl transition-all font-form active:scale-95 outline-none cursor-pointer"
        >
          Return to Authorized Ecosystem
        </button>

      </div>
    </div>
  );
}
