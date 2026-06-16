import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

/**
 * Global floating pill NavBar conforming to the Awwwards aesthetic.
 * Integrates JWT authentication gateway buttons and dynamic navigation context.
 */
export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const dashboardPath = user?.role === 'organizer' ? '/organizer' : '/attendee';

  return (
    <nav className="fixed top-0 left-0 w-full z-[100] soft-glass select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        
        {/* Brand typographic logo */}
        <Link 
          to={user ? dashboardPath : "/"} 
          className="flex items-center select-none font-display font-extrabold text-2xl tracking-tighter text-white"
        >
          vora
        </Link>

        {/* Center Links (User-centric value layout) */}
        <div className="hidden md:flex items-center space-x-2 text-xs font-sans font-medium tracking-wider">
          {user && user.role === 'attendee' ? (
            <>
              <Link to="/attendee" className="text-zinc-400 hover:text-white transition-colors duration-200 px-4 py-1">Dashboard</Link>
              <Link to="/attendee/wallet" className="text-zinc-400 hover:text-white transition-colors duration-200 px-4 py-1">Ticket Wallet</Link>
              <Link to="/attendee/explore" className="text-zinc-400 hover:text-white transition-colors duration-200 px-4 py-1 font-semibold text-white">Explore Events</Link>
            </>
          ) : user && user.role === 'organizer' ? (
            <>
              <Link to="/organizer" className="text-zinc-400 hover:text-white transition-colors duration-200 px-4 py-1">Dashboard</Link>
              <Link to="/organizer/events" className="text-zinc-400 hover:text-white transition-colors duration-200 px-4 py-1 font-semibold text-white">Manage Events</Link>
              <Link to="/organizer/attendees" className="text-zinc-400 hover:text-white transition-colors duration-200 px-4 py-1">Attendees</Link>
            </>
          ) : (
            <>
              <a href="#features" className="text-zinc-400 hover:text-white transition-colors duration-200 px-4 py-1">Features</a>
              <a href="#resources" className="text-zinc-400 hover:text-white transition-colors duration-200 px-4 py-1">Resources</a>
              <a href="#docs" className="text-zinc-555 hover:text-white transition-colors duration-200 px-4 py-1">Documentation</a>
            </>
          )}
        </div>

        {/* Authentication Gateway triggers */}
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={toggleTheme}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-full bg-zinc-900/30 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-100 transition-all cursor-pointer outline-none flex items-center justify-center shrink-0"
            aria-label="Toggle visual theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 transition-transform duration-500 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 transition-transform duration-500 hover:-rotate-12" />
            )}
          </motion.button>

          {user ? (
            <>
              <Link 
                to={dashboardPath}
                className="md:hidden text-xs font-semibold font-form text-zinc-350 hover:text-white transition-colors duration-200 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full"
              >
                Dashboard
              </Link>
              <motion.button
                type="button" 
                onClick={handleLogout}
                whileTap={{ scale: 0.98 }}
                className="bg-white hover:bg-zinc-200 text-black text-xs font-bold font-brutalist uppercase tracking-wider px-5 py-2.5 rounded-full transition-all neon-diffuse cursor-pointer outline-none border-none"
              >
                Sign Out
              </motion.button>
            </>
          ) : (
            <>
              <Link 
                to="/auth" 
                className="text-xs font-semibold font-form text-zinc-450 hover:text-white transition-colors duration-200 px-2 py-1"
              >
                Sign In
              </Link>
              <Link to="/auth?mode=register">
                <motion.button
                  type="button" 
                  whileTap={{ scale: 0.98 }}
                  className="bg-white hover:bg-zinc-200 text-black text-xs font-bold font-brutalist uppercase tracking-wider px-5 py-2.5 rounded-full transition-all neon-diffuse cursor-pointer outline-none border-none"
                >
                  Get Started
                </motion.button>
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}
