import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Search, Bell, Clock, Activity, Sun, Moon } from 'lucide-react';
import BrutalistButton from './BrutalistButton.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

/**
 * Premium Contextual Top Navigation header bar conforming to the "5/10 Awwwards" style.
 * Remains sticky at the top, frosted with a backdrop blur, and maps location context dynamically.
 */
export default function TopNav({ onOpenMobileMenu, user, tasks = [], onOpenQueue }) {
  const { toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const [systemTime, setSystemTime] = useState('');

  // Clock synchronization
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setSystemTime(date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000 * 60); // update every minute
    return () => clearInterval(interval);
  }, []);

  // Compute breadcrumb path label
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/organizer' || path === '/organizer/dashboard') return 'Dashboard';
    if (path.startsWith('/organizer/events')) return 'Events Console';
    if (path.startsWith('/organizer/attendees')) return 'Attendees Ledger';
    if (path.startsWith('/organizer/resources')) return 'Resource Distribution';
    return 'Core Workspace';
  };

  const hasActiveTasks = tasks.some(t => t.status === 'active');

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md px-4 sm:gap-x-6 sm:px-6 lg:px-8 select-none">
      
      {/* Mobile Hamburger menu trigger */}
      <button
        onClick={onOpenMobileMenu}
        className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 rounded-lg lg:hidden outline-none transition-colors"
        aria-label="Open mobile navigation drawer"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumb Trail / Page Title */}
      <div className="flex-1 flex items-center space-x-2 text-sm">
        <span className="text-zinc-500 font-medium">Vora</span>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-200 font-semibold">{getPageTitle()}</span>
      </div>

      {/* Utilities Console (Search, notifications, profile) */}
      <div className="flex items-center gap-x-4 sm:gap-x-6">
        
        {/* Ticking Sync Clock */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-zinc-900/35 border border-zinc-850 text-xs font-mono text-zinc-400">
          <Clock className="w-3.5 h-3.5 text-primary-400 shrink-0" />
          <span>{systemTime || 'Syncing...'}</span>
        </div>

        {/* Global Search Icon Button */}
        <BrutalistButton variant="ghost" className="p-2 text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 rounded-lg" aria-label="Search dashboard">
          <Search className="w-4 h-4" />
        </BrutalistButton>

        {/* Background operations ledger trigger */}
        <div className="relative">
          <BrutalistButton 
            variant="ghost" 
            onClick={onOpenQueue}
            className="p-2 text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 rounded-lg relative" 
            aria-label="View background activities"
          >
            <Activity className="w-4 h-4" />
            {hasActiveTasks && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-zinc-950 animate-pulse" />
            )}
          </BrutalistButton>
        </div>

        {/* System Notifications Icon Button */}
        <div className="relative">
          <BrutalistButton variant="ghost" className="p-2 text-zinc-455 hover:text-zinc-100 hover:bg-zinc-900/50 rounded-lg" aria-label="View notifications">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-zinc-950" />
          </BrutalistButton>
        </div>

        {/* Theme Toggle Button */}
        <BrutalistButton
          variant="ghost"
          onClick={toggleTheme}
          className="p-2 text-zinc-450 hover:text-zinc-100 hover:bg-zinc-900/50 rounded-lg flex items-center justify-center relative cursor-pointer outline-none animate-[fadeIn_0.2s_ease-out]"
          aria-label="Toggle visual theme"
        >
          {isDark ? (
            <Sun className="w-4 h-4 transition-transform duration-500 hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 transition-transform duration-500 hover:-rotate-12" />
          )}
        </BrutalistButton>

        {/* Mini profile avatar trigger */}
        <div className="h-6 w-px bg-zinc-800" />
        <Link 
          to="/settings" 
          id="btn-topnav-settings"
          className="flex items-center space-x-2.5 group outline-none cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700/50 group-hover:border-primary-500 flex items-center justify-center font-bold text-xs text-zinc-300 transition-all">
            {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="hidden md:inline-block text-xs font-semibold text-zinc-300 group-hover:text-white max-w-[120px] truncate leading-none transition-colors">
            {user?.email || 'User'}
          </span>
        </Link>

      </div>

    </header>
  );
}
