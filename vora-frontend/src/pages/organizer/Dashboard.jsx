import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import apiClient from '../../services/apiClient.js';
import Heading from '../../components/ui/Heading.jsx';
import Text from '../../components/ui/Text.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import useETagPolling from '../../hooks/useETagPolling.js';
import { toast } from '../../components/ui/Toast.jsx';
import { 
  Calendar, 
  Users, 
  Search, 
  Edit2, 
  Trash2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ShieldAlert,
  Video
} from 'lucide-react';

/**
 * ReconciledValue uses AnimatePresence to crossfade numeric states over exactly 150ms.
 */
function ReconciledValue({ value }) {
  return (
    <span className="inline-block relative">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 2 }}
          transition={{ duration: 0.150, ease: 'easeInOut' }}
          className="block"
        >
          {value.toLocaleString()}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * Organizer Dashboard & Paginated Event Ledger.
 * Provides dynamic greetings, scorecard count-ups, and a beautifully-spaced
 * div-row interactive schedule manager.
 */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // API states
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ totalEvents: 0, totalAttendees: 0, upcomingEvents: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(8);

  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Deletion modal states
  const [deleteEventId, setDeleteEventId] = useState(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  // Debounce search input to avoid event ledger queries overload
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Use ETag-aware SWR polling hooks
  const statsUrl = '/api/v1/organizer/stats';
  const eventsUrl = `/api/v1/events?page=${currentPage}&limit=${limit}&search=${debouncedSearch}`;

  const { data: statsData, isRevalidating: isStatsRevalidating } = useETagPolling(statsUrl, 5000);
  const { data: eventsData, isRevalidating: isEventsRevalidating, refetch: refetchEvents } = useETagPolling(eventsUrl, 6000);

  useEffect(() => {
    if (statsData && statsData.success) {
      setStats(statsData.stats);
      setStatsLoading(false);
    }
  }, [statsData]);

  useEffect(() => {
    if (eventsData && eventsData.success) {
      setEvents(eventsData.data || []);
      setTotalPages(eventsData.meta?.total_pages || 1);
      setTotalItems(eventsData.meta?.total_items || 0);
      setIsLoading(false);
    }
  }, [eventsData]);

  // Handle event deletion
  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;
    setIsDeleteLoading(true);
    try {
      await apiClient.delete(`/api/v1/events/${deleteEventId}`);
      refetchEvents();
      setDeleteEventId(null);
      toast('Event resource successfully expunged.', 'success');
    } catch (err) {
      console.error('[Dashboard Ledger] Failed to delete event record:', err);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleTriggerExport = async () => {
    try {
      await apiClient.post('/api/v1/tasks/export-ledger', {});
      // Notify parent shell to refresh tasks ledger
      window.dispatchEvent(new CustomEvent('vora-refresh-tasks'));
      toast('Asynchronous CSV ledger export job dispatched.', 'success');
    } catch (err) {
      console.error('[Dashboard Ledger] Failed to trigger export task:', err);
      toast('Failed to launch background export task.', 'error');
    }
  };

  // Date formatting utility
  const formatEventDate = (timestamp) => {
    if (!timestamp) return 'No date set';
    const dateObj = new Date(timestamp);
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr} • ${timeStr}`;
  };

  const isFutureDate = (timestamp) => {
    if (!timestamp) return false;
    return new Date(timestamp).getTime() > Date.now();
  };

  const StatusBadge = ({ timestamp }) => {
    const isUpcoming = isFutureDate(timestamp);
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-technical tracking-wider uppercase select-none
        ${isUpcoming 
          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
          : 'bg-zinc-800/40 border border-zinc-800 text-zinc-500'
        }
      `}>
        {isUpcoming ? 'Upcoming' : 'Completed'}
      </span>
    );
  };

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="w-full flex flex-col gap-8">
      
      {/* ─── COMMAND CENTER HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-8 border-b border-white/5 gap-6">
        <div className="flex flex-col select-none relative">
          <div className="flex items-center gap-3">
            <Heading level="h1" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tighter text-white leading-none">
              {getGreeting()}, {user?.firstName || 'Organizer'}
            </Heading>
            
            {/* Microscopic Synchronization Indicator */}
            <AnimatePresence>
              {(isStatsRevalidating || isEventsRevalidating) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-zinc-500 shrink-0 mt-1"
                >
                  <motion.svg
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                    className="w-4.5 h-4.5 text-zinc-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </motion.svg>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Text variant="muted" className="!text-zinc-400 !text-sm mt-2 max-w-2xl font-sans">
            Here is the current operational status of your upcoming virtual events and audience registrations.
          </Text>
        </div>
        
        {/* Global Action items */}
        <div className="flex items-center gap-3">
          <Link to="/organizer/events/create" className="shrink-0">
            <button 
              type="button"
              className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold font-form px-5 py-3 rounded-xl transition-all shadow-lg shadow-primary-600/25 active:scale-95 cursor-pointer border-none outline-none flex items-center gap-2 shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Event</span>
            </button>
          </Link>
          <button 
            type="button"
            onClick={handleTriggerExport}
            className="bg-transparent border border-white/10 hover:bg-white/5 text-white text-xs font-semibold font-form px-5 py-3 rounded-xl transition-colors cursor-pointer outline-none flex items-center gap-2"
          >
            <span>Export Analytics</span>
          </button>
        </div>
      </div>

      {/* ─── KPI SCORECARD RIBBON ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 select-none">
        
        {/* Card 1: Active Webinars */}
        <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-white/10 hover:-translate-y-[2px] hover:shadow-[0_8px_30px_rgb(124,58,237,0.06)] transition-all duration-300">
          <div className="flex justify-between items-start">
            <Text variant="muted" className="uppercase tracking-[0.15em] !text-[10px] font-bold text-zinc-500 font-accent">
              Active Webinars
            </Text>
            <span className="text-[9px] font-bold font-form bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
              +8% this month
            </span>
          </div>
          {statsLoading ? (
            <div className="bg-zinc-800/50 w-16 h-8 mt-3 rounded animate-pulse" />
          ) : (
            <Heading level="h3" className="text-3xl sm:text-4xl font-semibold text-white tracking-tight mt-2 font-technical">
              <ReconciledValue value={stats.totalEvents} />
            </Heading>
          )}
          <div className="absolute right-4 bottom-4 text-zinc-700/50 group-hover:text-primary-500/20 transition-colors">
            <Video className="w-12 h-12 stroke-[1.5]" />
          </div>
        </div>

        {/* Card 2: Total Attendees */}
        <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-white/10 hover:-translate-y-[2px] hover:shadow-[0_8px_30px_rgb(124,58,237,0.06)] transition-all duration-300">
          <div className="flex justify-between items-start">
            <Text variant="muted" className="uppercase tracking-[0.15em] !text-[10px] font-bold text-zinc-500 font-accent">
              Total Registrations
            </Text>
            <span className="text-[9px] font-bold font-form bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
              +24% this week
            </span>
          </div>
          {statsLoading ? (
            <div className="bg-zinc-800/50 w-24 h-8 mt-3 rounded animate-pulse" />
          ) : (
            <Heading level="h3" className="text-3xl sm:text-4xl font-semibold text-white tracking-tight mt-2 font-technical">
              <ReconciledValue value={stats.totalAttendees} />
            </Heading>
          )}
          <div className="absolute right-4 bottom-4 text-zinc-700/50 group-hover:text-primary-500/20 transition-colors">
            <Users className="w-12 h-12 stroke-[1.5]" />
          </div>
        </div>

        {/* Card 3: Upcoming webinars */}
        <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-white/10 hover:-translate-y-[2px] hover:shadow-[0_8px_30px_rgb(124,58,237,0.06)] transition-all duration-300">
          <div className="flex justify-between items-start">
            <Text variant="muted" className="uppercase tracking-[0.15em] !text-[10px] font-bold text-zinc-500 font-accent">
              Upcoming Sessions
            </Text>
            <span className="text-[9px] font-bold font-form bg-primary-500/10 border border-primary-500/20 text-primary-400 px-2 py-0.5 rounded">
              Live Now
            </span>
          </div>
          {statsLoading ? (
            <div className="bg-zinc-800/50 w-16 h-8 mt-3 rounded animate-pulse" />
          ) : (
            <Heading level="h3" className="text-3xl sm:text-4xl font-semibold text-white tracking-tight mt-2 font-technical">
              <ReconciledValue value={stats.upcomingEvents} />
            </Heading>
          )}
          <div className="absolute right-4 bottom-4 text-zinc-700/50 group-hover:text-primary-500/20 transition-colors">
            <Calendar className="w-12 h-12 stroke-[1.5]" />
          </div>
        </div>

      </div>

      {/* ─── EVENT LEDGER CHASSIS ─── */}
      <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden shadow-2xl shadow-black/40 flex flex-col">
        
        {/* Ledger Toolbar controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 gap-4 border-b border-white/5">
          <Heading level="h2" className="text-lg font-semibold text-white tracking-tight font-accent uppercase tracking-wider select-none">
            Recent Activity
          </Heading>
          
          {/* Ledger search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search events by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-white/5 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 px-9 py-2.5 rounded-xl text-xs text-white placeholder:text-zinc-650 font-form transition-all duration-200 ease-linear outline-none"
            />
          </div>
        </div>

        {/* Ledger Row Header (Desktop Only) */}
        <div className="hidden sm:flex items-center justify-between px-6 py-3 bg-zinc-950/40 border-b border-white/5 select-none text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-technical">
          <div className="flex-1">Event Name</div>
          <div className="w-48 shrink-0">Date & Time</div>
          <div className="w-48 shrink-0">Capacity (Seats)</div>
          <div className="w-24 shrink-0">Status</div>
          <div className="w-16 shrink-0 text-right">Actions</div>
        </div>

        {/* Dynamic Ledger Rows / Modules */}
        <div className="flex flex-col">
          {isLoading ? (
            /* Loading Skeletons */
            Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-white/5 last:border-0 gap-4">
                <div className="flex-1">
                  <div className="bg-zinc-800/50 rounded h-4 w-48 animate-pulse" />
                </div>
                <div className="w-48">
                  <div className="bg-zinc-800/50 rounded h-4 w-36 animate-pulse" />
                </div>
                <div className="w-48">
                  <div className="bg-zinc-800/50 rounded h-4 w-24 animate-pulse" />
                </div>
                <div className="w-24">
                  <div className="bg-zinc-800/50 rounded-full h-5 w-16 animate-pulse" />
                </div>
                <div className="w-16">
                  <div className="bg-zinc-800/50 rounded-lg h-7 w-12 animate-pulse animate-delay-150" />
                </div>
              </div>
            ))
          ) : events.length === 0 ? (
            /* Editorial Empty State */
            <div className="py-20 px-6 flex flex-col items-center justify-center text-center select-none">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center max-w-md"
              >
                {/* SVG stage illustration */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-primary-400 shadow-glow mb-6 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-500/5 to-transparent" />
                  <Calendar className="w-8 h-8 text-primary-400 relative z-10" />
                </motion.div>
                
                <Heading level="h3" className="text-xl font-bold font-display tracking-tighter text-white">
                  Your Stage is Empty
                </Heading>
                
                <Text variant="muted" className="!text-xs !text-zinc-500 mt-2 max-w-xs leading-relaxed font-sans">
                  Set up your first virtual event in minutes, customize your landing page, and start managing audience registrations seamlessly.
                </Text>
                
                <Link to="/organizer/events/create" className="mt-6">
                  <button 
                    type="button"
                    className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold font-form px-5 py-3 rounded-xl transition-all shadow-lg shadow-primary-600/25 active:scale-95 cursor-pointer border-none outline-none flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Initialize Your First Event</span>
                  </button>
                </Link>
              </motion.div>
            </div>
          ) : (
            /* Rendered div-row Schedule items */
            events.map((event) => {
              const capacityVal = parseInt(event.maximum_capacity, 10) || 0;
              const registrantsCount = parseInt(event.registrants_count, 10) || 0;
              const fillPercent = capacityVal > 0 
                ? Math.min(100, (registrantsCount / capacityVal) * 100) 
                : 0;

              return (
                <div 
                  key={event.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-all duration-200 group gap-4"
                >
                  {/* Event Name */}
                  <div className="flex-1 min-w-0">
                    <span className="font-display font-semibold text-sm text-zinc-300 group-hover:text-white transition-colors duration-205 truncate block">
                      {event.title}
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className="w-48 shrink-0 text-xs font-technical text-zinc-400">
                    {formatEventDate(event.start_timestamp)}
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="w-48 shrink-0 flex items-center gap-3">
                    <span className="text-xs font-technical text-zinc-300 font-medium tracking-tight tabular-nums">
                      {registrantsCount} / {capacityVal}
                    </span>
                    <div className="w-20 bg-zinc-950 h-1.5 rounded-full overflow-hidden shrink-0 border border-white/5">
                      <div 
                        className="bg-primary-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="w-24 shrink-0">
                    <StatusBadge timestamp={event.start_timestamp} />
                  </div>

                  {/* Row Actions */}
                  <div className="w-16 shrink-0 flex justify-end gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => navigate(`/organizer/events/${event.id}`)}
                      className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-all cursor-pointer outline-none border-none bg-transparent"
                      title="Edit Event"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteEventId(event.id)}
                      className="text-zinc-500 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer outline-none border-none bg-transparent"
                      title="Delete Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─── PAGINATION FOOTER ─── */}
        <div className="bg-zinc-950/50 border-t border-white/5 px-6 py-4 flex items-center justify-between select-none">
          <span className="text-[10px] text-zinc-500 font-technical uppercase tracking-wider">
            {totalItems > 0 ? (
              `Showing ${Math.min(totalItems, (currentPage - 1) * limit + 1)} to ${Math.min(totalItems, currentPage * limit)} of ${totalItems} events`
            ) : (
              'No events indexed'
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1 || isLoading}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="border border-white/5 text-zinc-350 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent px-3 py-1.5 rounded-lg text-xs font-form transition-colors cursor-pointer outline-none flex items-center gap-1"
            >
              <ChevronLeft className="w-3 h-3 shrink-0" />
              <span>Prev</span>
            </button>
            <button
              disabled={currentPage === totalPages || isLoading}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="border border-white/5 text-zinc-350 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent px-3 py-1.5 rounded-lg text-xs font-form transition-colors cursor-pointer outline-none flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3 h-3 shrink-0" />
            </button>
          </div>
        </div>

      </div>

      {/* ─── CONFIRMATION DELETION MODAL ─── */}
      <AnimatePresence>
        {deleteEventId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md select-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-zinc-900 border border-white/5 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4"
            >
              <Heading level="h3" className="text-lg font-bold text-white font-display">
                Confirm Event Deletion
              </Heading>
              <Text variant="muted" className="!text-xs !text-zinc-400 font-sans leading-relaxed">
                Are you sure you want to permanently delete this event? This action is irreversible, and will purge all sessions, downloads, and registration records.
              </Text>
              <div className="flex justify-end gap-3 mt-4">
                <button 
                  onClick={() => setDeleteEventId(null)}
                  disabled={isDeleteLoading}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 text-zinc-350 rounded-lg text-xs font-semibold font-form transition-colors cursor-pointer outline-none bg-transparent"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteEvent}
                  disabled={isDeleteLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold font-form transition-colors cursor-pointer outline-none border-none flex items-center gap-1.5"
                >
                  {isDeleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
