import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FileText, 
  LogOut, 
  ChevronDown,
  DollarSign,
  Radio,
  MessageSquare,
  ShieldAlert
} from 'lucide-react';

/**
 * Premium Sidebar navigation spine for the Organizer control panel.
 * Implements Awwwards-style blurs, vertical accent rails, and active route mapping.
 */
export default function Sidebar({ logout, user, className = '' }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { path: '/organizer', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/organizer/events', label: 'Events', icon: Calendar },
    { path: '/organizer/attendees', label: 'Attendees', icon: Users },
    { path: '/organizer/resources', label: 'Resources', icon: FileText },
    { path: '/organizer/financials', label: 'Financials', icon: DollarSign },
    { path: '/organizer/communications', label: 'Communications', icon: MessageSquare },
    { path: '/organizer/live', label: 'Live Broadcast', icon: Radio },
    { path: '/organizer/security', label: 'Security Posture', icon: ShieldAlert },
  ];

  const isActive = (path) => {
    if (path === '/organizer') {
      return location.pathname === '/organizer' || location.pathname === '/organizer/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside 
      className={`w-64 flex-shrink-0 flex flex-col h-full border-r border-white/5 bg-zinc-950/80 backdrop-blur-xl ${className}`}
      style={{
        backgroundImage: 'linear-gradient(to bottom, rgba(124, 58, 237, 0.03) 0%, transparent 100px)'
      }}
    >
      
      {/* Brand & Logo Header */}
      <div className="h-16 flex items-center px-6 border-b border-white/5 select-none">
        <Link to="/organizer" className="flex items-center space-x-2.5">
          <span className="font-display font-extrabold text-xl tracking-tighter text-white">vora</span>
          <span className="px-1.5 py-0.5 rounded text-[8px] tracking-[0.2em] font-accent bg-zinc-900 border border-white/5 text-zinc-450 font-bold uppercase">
            ORGANIZER
          </span>
        </Link>
      </div>

      {/* Workspace Switcher Component */}
      <div className="px-4 py-4 border-b border-white/5 relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-900/50 hover:border-zinc-800/85 transition-all text-left group cursor-pointer outline-none"
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary-500/10 text-primary-400 flex items-center justify-center font-semibold text-xs shrink-0">
              O
            </div>
            <div className="truncate min-w-0">
              <span className="text-xs font-semibold text-zinc-200 block truncate leading-none">Organizer Console</span>
              <span className="text-[10px] text-zinc-555 block truncate mt-0.5">{user?.email || 'Vora Workspace'}</span>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-transform duration-200 shrink-0 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)} 
            />
            <div className="absolute left-4 right-4 mt-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-1.5 z-20 text-left select-none animate-[fadeIn_0.15s_ease-out]">
              <div className="px-3 py-2 border-b border-white/5">
                <p className="text-[10px] font-mono text-zinc-550 tracking-wider uppercase">Active Session</p>
                <p className="text-xs font-bold text-white truncate mt-0.5">{user?.email}</p>
              </div>
              <div className="p-1.5 space-y-0.5">
                <Link 
                  to="/attendee"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span>Switch to Attendee Space</span>
                </Link>
                <Link 
                  to="/settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span>Profile Settings</span>
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left border-none bg-transparent outline-none cursor-pointer"
                >
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation Links Stack */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group relative flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 outline-none ${
                active 
                  ? 'text-primary-400' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="activeNavPill"
                  className="absolute inset-0 bg-primary-600/10 border border-primary-500/20 rounded-lg shadow-glow shadow-primary-500/5"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`w-4 h-4 shrink-0 transition-colors relative z-10 ${
                active ? 'text-primary-400' : 'text-zinc-500 group-hover:text-zinc-300'
              }`} />
              <span className="relative z-10 font-sans">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Profile / Logout Section at bottom */}
      <div className="p-4 border-t border-white/5 bg-zinc-950/40">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all outline-none"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Log Out</span>
        </button>
      </div>

    </aside>
  );
}
