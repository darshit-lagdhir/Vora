import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FileText, 
  LogOut, 
  Menu, 
  X, 
  User as UserIcon,
  ShieldAlert,
  Clock,
  Laptop
} from 'lucide-react';

const Organizer = () => {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Navigation states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);
  const [systemTime, setSystemTime] = useState('');
  
  // Hover states for sidebar buttons
  const [hoveredNav, setHoveredNav] = useState(null);

  // References
  const popoverRef = useRef(null);
  const menuButtonRef = useRef(null);

  // 1. Zero-Trust Access Interrogation (Task 9)
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (user.role !== 'organizer') {
        // Expel unauthorized attendee users immediately to their designated hub
        navigate('/attendee');
      }
    }
  }, [user, authLoading, navigate]);

  // 2. Real-Time Clock Synchronization & Interval Cleanup (Task 7)
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const options = { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true, 
        timeZoneName: 'short' 
      };
      setSystemTime(date.toLocaleTimeString('en-US', options));
    };

    updateTime(); // Initial execution
    const timerInterval = setInterval(updateTime, 1000);

    // Meticulous cleanup function to prevent memory leaks on unmount
    return () => {
      clearInterval(timerInterval);
    };
  }, []);

  // Close popover when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setProfilePopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // If session is loading or user is unauthorized, return loading block to prevent layout flash
  if (authLoading || !user || user.role !== 'organizer') {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-brand-dark text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-8 w-8 text-accent-violet" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-semibold tracking-wide uppercase">Securing Dashboard Session...</span>
        </div>
      </div>
    );
  }

  // Navigation Items Configurations
  const navItems = [
    { path: '/organizer', label: 'Dashboard', icon: LayoutDashboard, id: 'overview' },
    { path: '/organizer/events', label: 'My Events', icon: Calendar, id: 'events' },
    { path: '/organizer/attendees', label: 'Attendees', icon: Users, id: 'attendees' },
    { path: '/organizer/resources', label: 'Resources', icon: FileText, id: 'resources' }
  ];

  // Helper to check active routing path
  const isPathActive = (path) => {
    if (path === '/organizer') {
      return location.pathname === '/organizer';
    }
    return location.pathname.startsWith(path);
  };

  // Translate URL path to readable Masthead subtitles
  const getMastheadSubtitle = () => {
    switch (location.pathname) {
      case '/organizer':
        return 'Overview Dashboard';
      case '/organizer/events':
        return 'Event Management Console';
      case '/organizer/attendees':
        return 'Seat Booking Ledger';
      case '/organizer/resources':
        return 'Shared Webinar Media';
      default:
        return 'Organizer Core Workspace';
    }
  };

  return (
    <div className="h-[100dvh] w-full flex overflow-hidden bg-brand-dark text-slate-100 font-sans antialiased relative">
      
      {/* Custom thin-track scrollbars injection */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(11, 15, 25, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.4);
        }
      `}</style>

      {/* DESKTOP SIDEBAR command tower (Task 2 & 3) */}
      <aside className="hidden md:flex w-16 h-full shrink-0 flex-col justify-between py-6 bg-[#090d16] relative z-30 select-none">
        
        {/* Continuous 1-pixel solid border utilizing a neon linear gradient (Task 3) */}
        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-accent-violet/60 via-accent-blue/30 to-status-success/15 pointer-events-none"></div>

        {/* Top Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-violet to-accent-blue flex items-center justify-center font-extrabold text-sm text-white shadow-lg">
            V
          </div>
        </div>

        {/* Dynamic Icon Navigation Stack */}
        <nav className="flex-1 flex flex-col items-center space-y-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isPathActive(item.path);
            const hovered = hoveredNav === item.id;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                onMouseEnter={() => setHoveredNav(item.id)}
                onMouseLeave={() => setHoveredNav(null)}
                className="relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 group"
                aria-label={item.label}
              >
                {/* Horizontal scale vertical indicator line (Task 4) */}
                <div 
                  className={`absolute left-0 w-[3px] bg-gradient-to-b from-accent-violet to-accent-blue rounded-r-md transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    active || hovered ? 'h-6 opacity-100 scale-y-100' : 'h-0 opacity-0 scale-y-0'
                  }`}
                ></div>

                {/* Glyphs change color over bezier curves */}
                <Icon className={`w-5 h-5 transition-colors duration-200 ${
                  active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                }`} />
                
                {/* Tooltip Hover Bubble */}
                <div className="absolute left-16 px-2.5 py-1 bg-brand-slate border border-brand-card text-[11px] font-semibold rounded-md opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 pointer-events-none transition-all duration-200 z-50 whitespace-nowrap shadow-xl">
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile Anchor Area (Task 5) */}
        <div className="flex flex-col items-center space-y-4 pt-4 border-t border-brand-card/40 relative">
          
          {/* Avatar Anchor */}
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setProfilePopoverOpen(!profilePopoverOpen)}
              className="w-9 h-9 rounded-full bg-brand-card border-2 border-accent-violet/40 hover:border-accent-violet transition-colors flex items-center justify-center cursor-pointer overflow-hidden outline-none"
              aria-label="Profile administrative options"
            >
              <UserIcon className="w-4 h-4 text-slate-400" />
            </button>

            {/* Profile Identity Popover card */}
            {profilePopoverOpen && (
              <div 
                className="absolute left-14 bottom-0 w-64 glass-panel p-4 rounded-xl shadow-2xl space-y-3 z-50 animate-slide-in text-xs"
                role="dialog"
                aria-label="User identity context card"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Logged In As</span>
                  <p className="font-semibold text-white truncate">{user.email}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Access Permissions</span>
                  <div className="flex items-center space-x-1.5 text-accent-violet">
                    <Laptop className="w-3.5 h-3.5" />
                    <span className="font-bold capitalize">{user.role} console</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-brand-card/50">
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                    Tier 1 Authorized Administrator
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Destructive sign-out trigger */}
          <button
            onClick={logout}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-status-danger/10 hover:text-status-danger transition-all duration-200 outline-none"
            aria-label="Logout user session"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

      </aside>

      {/* MOBILE HEADER & DRAWER TRANSFORMATIONS (Task 10) */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-brand-slate border-b border-brand-card z-40 flex items-center justify-between px-4 select-none">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-accent-violet to-accent-blue flex items-center justify-center font-bold text-xs text-white">
            V
          </div>
          <span className="text-sm font-bold tracking-tight text-white">PROJECT VORA</span>
        </div>
        <button
          ref={menuButtonRef}
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-slate-400 hover:text-white outline-none"
          aria-label="Open navigation drawer"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Drawer Slide-in Container */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Blur overlay backdrop click dismissal */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
          ></div>

          {/* Sliding Drawer Body */}
          <div className="relative w-72 max-w-xs bg-[#090d16] h-full flex flex-col justify-between py-6 px-4 border-r border-brand-card/50 shadow-2xl z-50 animate-slide-in">
            <div className="space-y-8">
              <div className="flex justify-between items-center pb-4 border-b border-brand-card/40">
                <span className="text-sm font-bold tracking-wider text-slate-300">ADMINISTRATIVE DRAWER</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-white outline-none"
                  aria-label="Close navigation drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Stack Links inside drawer */}
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isPathActive(item.path);
                  
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        active 
                          ? 'bg-gradient-to-r from-accent-violet/20 to-accent-blue/10 border border-accent-violet/30 text-white' 
                          : 'text-slate-400 hover:text-white hover:bg-brand-card/50 border border-transparent'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-semibold">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Profile Details in Drawer */}
            <div className="space-y-4 pt-4 border-t border-brand-card/40">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-brand-card border border-accent-violet/40 flex items-center justify-center">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="truncate flex-1">
                  <p className="text-xs font-bold text-white truncate">{user.email}</p>
                  <span className="text-[9px] text-accent-violet font-semibold capitalize">{user.role} console</span>
                </div>
              </div>
              
              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="w-full py-2.5 bg-status-danger/10 hover:bg-status-danger/20 border border-status-danger/30 text-status-danger font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Terminate Session</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT COLUMN: PRIMARY WORKSPACE CHANNEL & HEADERS (Task 2 & 6) */}
      <div className="flex-1 h-full flex flex-col overflow-hidden bg-brand-dark pt-16 md:pt-0">
        
        {/* Frosted Glassmasthead header bar (Task 6) */}
        <header className="h-[72px] shrink-0 backdrop-blur-md bg-brand-dark/40 border-b border-brand-card/50 px-6 sm:px-8 flex items-center justify-between z-10 relative">
          
          {/* Breadcrumb Titling (Task 7) */}
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              PROJECT VORA
            </span>
            <span className="text-sm font-semibold text-white block">
              {getMastheadSubtitle()}
            </span>
          </div>

          {/* Ticking interval clock console (Task 7) */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-brand-card/30 border border-brand-card/50 text-[11px] font-semibold text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-accent-blue" />
            <span>{systemTime || 'Synchronizing...'}</span>
          </div>

        </header>

        {/* DYNAMIC OUTLET SLOT (Task 8) */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <Outlet />
        </main>

      </div>

    </div>
  );
};

export default Organizer;
