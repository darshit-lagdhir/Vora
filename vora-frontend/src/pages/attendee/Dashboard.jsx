import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import apiClient from '../../services/apiClient.js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  X, 
  LogOut, 
  BookOpen, 
  ExternalLink,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import Heading from '../../components/ui/Heading.jsx';

/**
 * AnimatedNumber counts up from zero to the target value over 800ms.
 */
function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10) || 0;
    if (end === 0) {
      setDisplayValue(0);
      return;
    }

    const duration = 800; // ms
    const incrementTime = 16; // ~60fps
    const totalSteps = Math.ceil(duration / incrementTime);
    const increment = end / totalSteps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= totalSteps) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(increment * currentStep));
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
}

/**
 * SkeletonBlock renders a geometric shape with a smooth Framer Motion pulse animation.
 */
function SkeletonBlock({ className }) {
  return (
    <motion.div
      animate={{ backgroundColor: ["#18181b", "#27272a", "#18181b"] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      className={`rounded ${className}`}
    />
  );
}

/**
 * SkeletonTicket matches the exact physical footprint of the bento tickets.
 */
function SkeletonTicket() {
  return (
    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 h-[260px] flex flex-col justify-between relative overflow-hidden select-none">
      <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/20 via-primary-500/5 to-transparent rounded-t-[2rem]" />
      
      <div>
        {/* Top Zone */}
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-4 w-1/3 rounded-lg" />
          <SkeletonBlock className="h-5 w-16 rounded-full" />
        </div>
        
        {/* Middle Zone */}
        <SkeletonBlock className="h-7 w-3/4 rounded-xl mt-5" />
        <SkeletonBlock className="h-4 w-5/6 rounded-lg mt-3" />
      </div>

      {/* Bottom Zone */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="w-5 h-5 rounded-full" />
          <div className="space-y-1">
            <SkeletonBlock className="h-2 w-10 rounded" />
            <SkeletonBlock className="h-3.5 w-14 rounded" />
          </div>
        </div>
        
        <SkeletonBlock className="h-9 w-24 rounded-xl" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Core Data States
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab controller: 'upcoming' or 'past'
  const [activeTab, setActiveTab] = useState('upcoming');

  // Cancellation workflow state
  const [eventToCancel, setEventToCancel] = useState(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  // SEO Page Title Update
  useEffect(() => {
    document.title = "Vora — Your Event Portfolio & Digital Wallet";
  }, []);

  // Lock body scroll when confirmation modal is mounted
  useEffect(() => {
    if (eventToCancel) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [eventToCancel]);

  // Fetch registrations on mount
  const fetchRegistrations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Endpoint retrieves registrations filtered by authenticated attendee role
      const res = await apiClient.get('/api/v1/registrations');
      if (res.data?.success) {
        setRegisteredEvents(res.data.data || []);
      } else {
        throw new Error('Failed to retrieve registrations list.');
      }
    } catch (err) {
      console.error('[AttendeeDashboard] Error fetching registrations:', err);
      setError(err.response?.data?.message || err.message || 'Could not load registrations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRegistrations();
    }
  }, [user]);

  // Sign out attendee session handler and redirect to public landing page
  const handleSignOut = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('[AttendeeDashboard] Logout error:', err);
    } finally {
      localStorage.removeItem('vora_jwt_token');
      localStorage.removeItem('token');
      navigate('/');
    }
  };

  // Perform destructive registration cancel request
  const handleCancelRegistration = async () => {
    if (!eventToCancel) return;
    setIsCanceling(true);
    setCancelError(null);

    try {
      const eventId = eventToCancel.event_id || eventToCancel.id;
      const res = await apiClient.delete(`/api/v1/events/${eventId}/register`);

      if (res.data?.success) {
        // Optimistic UI update: filter out local registry
        setRegisteredEvents(prev => prev.filter(r => r.id !== eventToCancel.id));
        setEventToCancel(null);
      } else {
        throw new Error('Failed to delete registration document.');
      }
    } catch (err) {
      console.error('[AttendeeDashboard] Cancellation failed:', err);
      setCancelError(err.response?.data?.message || 'Failed to cancel registration. Please try again.');
    } finally {
      setIsCanceling(false);
    }
  };

  // Calculate Metrics from registrations list
  const metrics = useMemo(() => {
    const now = new Date();
    let upcomingCount = 0;
    let pastCount = 0;

    registeredEvents.forEach(reg => {
      const eventDate = new Date(reg.start_timestamp);
      if (eventDate >= now) {
        upcomingCount++;
      } else {
        pastCount++;
      }
    });

    return {
      upcomingCount,
      pastCount
    };
  }, [registeredEvents]);

  // Filter registrations by selected temporal tab
  const displayedRegistrations = useMemo(() => {
    const now = new Date();
    return registeredEvents.filter(reg => {
      const eventDate = new Date(reg.start_timestamp);
      return activeTab === 'upcoming' ? eventDate >= now : eventDate < now;
    });
  }, [registeredEvents, activeTab]);

  // Date formatting helpers
  const formatTicketDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTicketTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // User presentation display name
  const displayName = user?.first_name 
    ? `${user.first_name} ${user.last_name || ''}`.trim() 
    : (user?.name || user?.email || 'Attendee');

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col w-full text-white font-sans overflow-x-hidden">
      
      {/* ─── HEADER SECTION ─── */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-900/40 backdrop-blur-xl border-b border-white/5 w-full h-16 flex items-center justify-between px-4 sm:px-6 select-none">
        <div className="flex items-center gap-2">
          <span className="font-display font-extrabold text-white tracking-[-0.04em] text-sm uppercase">
            vora
          </span>
          <span className="font-accent text-[9px] font-bold text-zinc-500 tracking-[-0.05em] uppercase border border-zinc-800 bg-zinc-900 px-2 py-0.5 rounded-full select-none">
            ATTENDEE HUB
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            to="/attendee/explore"
            className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors uppercase tracking-wider font-form"
          >
            Explore
          </Link>
          <Link 
            to="/settings"
            id="btn-attendee-settings"
            className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors uppercase tracking-wider font-form"
          >
            Settings
          </Link>
          <button 
            id="btn-attendee-logout"
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer outline-none font-form uppercase tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ─── MAIN CONTENT CHASSIS ─── */}
      <main className="max-w-xl mx-auto w-full px-4 sm:px-6 py-8 mt-16 flex flex-col gap-8 flex-grow">
        
        {/* Welcome message & Greeting */}
        <section className="text-left pt-6">
          <Heading level="h1" className="text-3xl sm:text-4xl font-extrabold tracking-tighter text-white mb-2 font-display">
            Welcome back, {displayName}
          </Heading>
          <p className="text-zinc-500 text-xs font-sans leading-relaxed">
            Manage your upcoming virtual registrations and access archived post-event materials.
          </p>

          {/* Activity Scorecard Ribbon */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            
            {/* Card 1: Upcoming Count */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-5 relative overflow-hidden group select-none shadow-lg">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-primary-500/30 to-transparent" />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] font-accent">
                UPCOMING EVENTS
              </span>
              <div className="text-3xl sm:text-4xl font-bold text-white mt-2 font-technical">
                <AnimatedNumber value={metrics.upcomingCount} />
              </div>
            </div>

            {/* Card 2: Total Attended */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-5 relative overflow-hidden group select-none shadow-lg">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-primary-500/10 to-transparent" />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] font-accent">
                ATTENDED SESSIONS
              </span>
              <div className="text-3xl sm:text-4xl font-bold text-zinc-300 mt-2 font-technical">
                <AnimatedNumber value={metrics.pastCount} />
              </div>
            </div>

          </div>
        </section>

        {/* ─── TEMPORAL TAB NAVIGATION ─── */}
        <section className="text-left select-none">
          <div className="inline-flex bg-zinc-900/50 p-1.5 rounded-full mt-4 mb-2 border border-white/5 relative">
            
            {/* Upcoming Tab Button */}
            <button
              id="tab-upcoming"
              onClick={() => setActiveTab('upcoming')}
              className={`relative z-10 px-6 py-2.5 text-sm font-medium font-form rounded-full transition-colors cursor-pointer outline-none border-none bg-transparent ${
                activeTab === 'upcoming' ? 'text-white' : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              {activeTab === 'upcoming' && (
                <motion.div 
                  layoutId="attendeeTabIndicator"
                  className="absolute inset-0 bg-zinc-800 rounded-full shadow-md -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                />
              )}
              Upcoming
            </button>

            {/* Past Tab Button */}
            <button
              id="tab-past"
              onClick={() => setActiveTab('past')}
              className={`relative z-10 px-6 py-2.5 text-sm font-medium font-form rounded-full transition-colors cursor-pointer outline-none border-none bg-transparent ${
                activeTab === 'past' ? 'text-white' : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              {activeTab === 'past' && (
                <motion.div 
                  layoutId="attendeeTabIndicator"
                  className="absolute inset-0 bg-zinc-800 rounded-full shadow-md -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                />
              )}
              Past
            </button>

          </div>
        </section>

        {/* ─── DIGITAL TICKET MATRIX / SKELETON / EMPTY STATES ─── */}
        <section className="flex-grow">
          <AnimatePresence mode="wait">
            
            {/* 1. Loading State */}
            {isLoading && (
              <motion.div 
                key="loading-skeletons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                {[1, 2, 3, 4].map(idx => (
                  <SkeletonTicket key={idx} />
                ))}
              </motion.div>
            )}

            {/* 2. Error State */}
            {!isLoading && error && (
              <motion.div 
                key="error-boundary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center max-w-md mx-auto my-12"
              >
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <h4 className="text-white font-semibold font-display">Failed to Hydrate Ledger</h4>
                <p className="text-xs text-red-400/80 mt-1 font-sans">{error}</p>
                <button 
                  onClick={fetchRegistrations}
                  className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500 text-white rounded-lg text-xs transition-colors border border-red-500/35 cursor-pointer outline-none font-form uppercase tracking-wider"
                >
                  Retry API Query
                </button>
              </motion.div>
            )}

            {/* 3. Empty State */}
            {!isLoading && !error && displayedRegistrations.length === 0 && (
              <motion.div 
                key="empty-roster"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-20 px-6 border border-dashed border-white/5 rounded-[2.5rem] bg-zinc-900/10 max-w-md mx-auto relative select-none"
              >
                <div className="absolute inset-0 bg-radial-gradient from-primary-600/5 to-transparent blur-xl pointer-events-none -z-10" />
                {/* SVG Empty calendar/ticket */}
                <svg className="w-12 h-12 text-zinc-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-12v.75m0 3v.75m0 3v.75m0 3V18M3 7.5A2.25 2.25 0 015.25 5h13.5A2.25 2.25 0 0121 7.5v9a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 16.5v-9z" />
                </svg>
                <h3 className="text-xl font-bold text-white font-display tracking-tight">
                  {activeTab === 'upcoming' ? 'Your Itinerary is Empty' : 'No Historical Data'}
                </h3>
                <p className="text-zinc-500 text-xs font-sans max-w-xs mx-auto mt-2 leading-relaxed">
                  {activeTab === 'upcoming' 
                    ? "You have not yet registered for any future events. Explore the event directory to claim your seat."
                    : "You have not attended any virtual sessions on the Vora platform."}
                </p>
                <Link to="/attendee/explore" className="inline-block mt-6">
                  <button 
                    id="btn-explore-events"
                    className="flex items-center gap-2 px-6 py-3.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold font-form text-xs tracking-wider uppercase transition-all shadow-lg shadow-primary-600/35 hover:-translate-y-0.5 active:translate-y-0 border-none cursor-pointer outline-none"
                  >
                    <span>Explore Virtual Events</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </motion.div>
            )}

            {/* 4. Ticket Bento Grid */}
            {!isLoading && !error && displayedRegistrations.length > 0 && (
              <motion.div 
                key="ticket-bento"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <AnimatePresence>
                  {displayedRegistrations.map((reg) => {
                    const eventDate = new Date(reg.start_timestamp);
                    const isToday = new Date().toDateString() === eventDate.toDateString();

                    return (
                      <motion.div 
                        key={reg.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, height: 0, margin: 0, padding: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 relative flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary-500/10 min-h-[260px] overflow-hidden"
                      >
                        {/* Overhead border indicator highlight */}
                        <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/30 via-primary-500/10 to-transparent rounded-t-[2rem]" />

                        {/* Cancellation Destructive Trigger (Upcoming only) */}
                        {activeTab === 'upcoming' && (
                          <button
                            id={`btn-cancel-trigger-${reg.id}`}
                            onClick={() => setEventToCancel(reg)}
                            className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-colors duration-200 cursor-pointer z-20 border-none bg-transparent outline-none"
                            aria-label="Cancel Registration"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}

                        <div>
                          {/* Ticket Header Section: Zone 1 */}
                          <div className="flex items-center justify-between text-left select-none">
                            <span className="text-[10px] font-bold text-primary-400 uppercase tracking-[0.2em] font-technical">
                              {formatTicketDate(reg.start_timestamp)}
                            </span>
                            
                            {activeTab === 'past' ? (
                              <span className="font-accent text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-800/40 border border-zinc-700/30 text-zinc-500">
                                Completed
                              </span>
                            ) : isToday ? (
                              <span className="font-accent text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.1)]">
                                Today
                              </span>
                            ) : (
                              <span className="font-accent text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-800/40 border border-zinc-700/30 text-zinc-400">
                                Upcoming
                              </span>
                            )}
                          </div>

                          {/* Ticket Identity Section: Zone 2 */}
                          <Heading level="h3" className="text-xl font-bold text-white tracking-tight leading-tight line-clamp-2 mt-4 font-display text-left">
                            {reg.event_title}
                          </Heading>
                          <p className="text-xs text-zinc-500 font-sans leading-relaxed line-clamp-1 mt-1.5 max-w-[65ch] text-left">
                            {reg.description || reg.event_description || 'No description summary available.'}
                          </p>
                        </div>

                        {/* Ticket Details & Actions: Zone 3 (Horizontal Flex Row) */}
                        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4 select-none">
                          
                          {/* Left side: Clock and Start Time */}
                          <div className="flex items-center gap-2 text-left">
                            <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest font-technical">START TIME</span>
                              <span className="text-xs font-bold text-white font-technical mt-0.5">
                                {formatTicketTime(reg.start_timestamp)}
                              </span>
                            </div>
                          </div>

                          {/* Right side: Action Button */}
                          <div className="shrink-0">
                            {activeTab === 'upcoming' ? (
                              <button
                                id={`btn-action-lobby-${reg.id}`}
                                onClick={() => navigate(`/event/${reg.event_id}/live`)}
                                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-semibold font-form text-[11px] tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-primary-600/10 hover:shadow-primary-600/25 active:scale-[0.98] border-none cursor-pointer outline-none flex items-center gap-1.5"
                              >
                                <span>Enter Lobby</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ) : (
                              <button
                                id={`btn-action-resources-${reg.id}`}
                                onClick={() => navigate(`/event/${reg.event_id}/vault`)}
                                className="px-4 py-2.5 bg-transparent border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-semibold font-form text-[11px] tracking-wider uppercase rounded-xl transition-colors cursor-pointer outline-none flex items-center gap-1.5"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Resources</span>
                              </button>
                            )}
                          </div>

                        </div>

                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}

          </AnimatePresence>
        </section>

      </main>

      {/* ─── REVOCATION SYSTEM: DESTRUCTIVE CANCELLATION MODAL ─── */}
      <AnimatePresence>
        {eventToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isCanceling) {
                  setEventToCancel(null);
                  setCancelError(null);
                }
              }}
              className="fixed inset-0 bg-zinc-950/80 backdrop-blur-24 pointer-events-auto"
            />

            {/* Modal Chassis */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-zinc-900/90 border border-white/10 rounded-2xl p-6 sm:p-8 max-w-md w-full relative z-10 shadow-2xl text-left overflow-hidden select-none"
            >
              {/* Top highlight indicator */}
              <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-red-500/20 via-red-500/10 to-transparent rounded-t-2xl" />

              {/* Close button */}
              <button
                onClick={() => {
                  if (!isCanceling) {
                    setEventToCancel(null);
                    setCancelError(null);
                  }
                }}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-350 transition-colors z-20 outline-none border-none bg-transparent cursor-pointer"
                aria-label="Close modal dialog"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white tracking-tight font-display">
                  Revoke Registration?
                </h3>
                
                <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                  You are about to forfeit your secure seat for <strong className="text-white font-semibold">{eventToCancel?.event_title}</strong>. This action is permanent, and if the event is at capacity, you may not be able to re-register.
                </p>

                {cancelError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2 leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{cancelError}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4 font-semibold text-xs tracking-wider uppercase select-none">
                  
                  {/* destructive button */}
                  <button
                    id="btn-modal-confirm-cancel"
                    onClick={handleCancelRegistration}
                    disabled={isCanceling}
                    className="flex-1 bg-red-950/45 hover:bg-red-900 border border-red-500/30 text-rose-400 hover:text-white py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer outline-none focus:ring-2 focus:ring-red-500/50 font-form"
                  >
                    {isCanceling ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>Confirm Cancellation</span>
                    )}
                  </button>

                  {/* Keep Seat Button */}
                  <button
                    id="btn-modal-keep-seat"
                    onClick={() => setEventToCancel(null)}
                    disabled={isCanceling}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer outline-none font-form"
                  >
                    Keep My Seat
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
