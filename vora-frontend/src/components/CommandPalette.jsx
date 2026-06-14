import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  LayoutDashboard, 
  Calendar, 
  PlusCircle, 
  Users, 
  Coins, 
  Sliders, 
  Radio, 
  Compass, 
  CreditCard, 
  Trash2, 
  HelpCircle, 
  Search, 
  SearchX, 
  ChevronRight
} from 'lucide-react';
import apiClient from '../services/apiClient.js';

// Icon Map mapping strings to Lucide components
const IconMap = {
  Home,
  LayoutDashboard,
  Calendar,
  PlusCircle,
  Users,
  Coins,
  Sliders,
  Radio,
  Compass,
  CreditCard,
  Trash2,
  HelpCircle,
  Search
};

const STATIC_COMMANDS = [
  // Navigation
  { id: 'nav-home', label: 'Go to Home / Landing', subLabel: 'Navigation • Public Root', category: 'Navigation', icon: 'Home', action: (navigate) => navigate('/') },
  { id: 'nav-dashboard', label: 'Go to Organizer Dashboard', subLabel: 'Navigation • Secure Management', category: 'Navigation', icon: 'LayoutDashboard', action: (navigate) => navigate('/organizer') },
  { id: 'nav-events', label: 'Go to Events Ledger', subLabel: 'Navigation • Secure Database', category: 'Navigation', icon: 'Calendar', action: (navigate) => navigate('/organizer/events') },
  { id: 'nav-create-event', label: 'Create New Event', subLabel: 'Action • Focus creation stepper', category: 'Quick Actions', icon: 'PlusCircle', action: (navigate) => navigate('/organizer/events/create') },
  { id: 'nav-attendees', label: 'Manage Attendees list', subLabel: 'Navigation • Ingress database', category: 'Navigation', icon: 'Users', action: (navigate) => navigate('/organizer/attendees') },
  { id: 'nav-financials', label: 'View Financials & Analytics', subLabel: 'Navigation • Revenue Ledger', category: 'Navigation', icon: 'Coins', action: (navigate) => navigate('/organizer/financials') },
  { id: 'nav-fin-settings', label: 'View Financial Settings', subLabel: 'Navigation • Stripe/KYC profiles', category: 'Navigation', icon: 'Sliders', action: (navigate) => navigate('/organizer/financials/settings') },
  { id: 'nav-live', label: 'Go to Live Operations Command', subLabel: 'Navigation • Real-time ingress desk', category: 'Navigation', icon: 'Radio', action: (navigate) => navigate('/organizer/live') },
  { id: 'nav-explore', label: 'Go to Attendee Portal', subLabel: 'Navigation • Public Events Discovery', category: 'Navigation', icon: 'Compass', action: (navigate) => navigate('/attendee') },
  { id: 'nav-wallet', label: 'Go to Attendee Ticket Wallet', subLabel: 'Navigation • Secure QR passes', category: 'Navigation', icon: 'CreditCard', action: (navigate) => navigate('/attendee/wallet') },
  
  // System actions
  { id: 'action-clear-cache', label: 'Clear Application Cache', subLabel: 'System • Flush local offline tables', category: 'System Actions', icon: 'Trash2', action: () => { localStorage.clear(); alert('Vora offline application cache flushed successfully.'); } },
  { id: 'action-support', label: 'Contact Help Desk Support', subLabel: 'System • Email engineering teams', category: 'System Actions', icon: 'HelpCircle', action: () => { window.location.href = 'mailto:support@vora.com'; } }
];

export default function CommandPalette() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  // Results & Navigation focus index
  const [dynamicEvents, setDynamicEvents] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);
  const listContainerRef = useRef(null);
  const activeItemRef = useRef(null);

  // Global Keyboard listener hook to capture Cmd+K / Ctrl+K
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const isK = e.key?.toLowerCase() === 'k';
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && isK) {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

  // Focus Input instantly on toggle open
  useEffect(() => {
    if (isOpen) {
      // Small timeout to guarantee DOM is mounted in portal before focusing
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Query events database dynamically when query changes
  useEffect(() => {
    if (!query.trim()) {
      setDynamicEvents([]);
      setSelectedIndex(0);
      return;
    }

    const fetchDebounced = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/api/v1/explore/events?search=${query}&limit=5`);
        if (res?.data?.success) {
          const eventsList = res.data.data.map(evt => ({
            id: `event-${evt.id}`,
            label: `Open event detail: ${evt.title}`,
            subLabel: `Location • ${evt.venue || 'Streaming Virtual'}`,
            category: 'Event Results',
            icon: 'Search',
            action: (nav) => nav(`/event/${evt.id}`)
          }));
          setDynamicEvents(eventsList);
        }
      } catch (err) {
        // Fallback: search cached offline tickets in localstorage
        const cached = localStorage.getItem('vora_offline_ticket_cache_v1');
        if (cached) {
          const parsed = JSON.parse(cached);
          const filtered = parsed.filter(e => 
            (e.event_title || '').toLowerCase().includes(query.toLowerCase()) || 
            (e.venue || '').toLowerCase().includes(query.toLowerCase())
          );
          const eventsList = filtered.slice(0, 5).map(evt => ({
            id: `event-${evt.id}`,
            label: `Open event detail: ${evt.event_title}`,
            subLabel: `Location • ${evt.venue}`,
            category: 'Event Results',
            icon: 'Search',
            action: (nav) => nav(`/event/${evt.id}`)
          }));
          setDynamicEvents(eventsList);
        }
      }
      setSelectedIndex(0);
    }, 200);

    return () => clearTimeout(fetchDebounced);
  }, [query]);

  // Flattened active results set combining static indices and dynamic queries
  const filteredResults = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    
    // Filter static commands locally
    const matchingStatic = STATIC_COMMANDS.filter(cmd => 
      cmd.label.toLowerCase().includes(cleanQuery) || 
      cmd.subLabel.toLowerCase().includes(cleanQuery) ||
      cmd.category.toLowerCase().includes(cleanQuery)
    );

    // Dynamic database entries are already filtered from API
    return [...dynamicEvents, ...matchingStatic];
  }, [query, dynamicEvents]);

  // Reset highlighted cursor when results length shifts
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults.length]);

  // Align container scroll view to keep active selection visible
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'auto',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  // Keyboard navigation bindings (ArrowUp, ArrowDown, Enter)
  const handleInputKeyDown = (e) => {
    if (filteredResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredResults.length) % filteredResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const activeItem = filteredResults[selectedIndex];
      if (activeItem) {
        activeItem.action(navigate);
        setIsOpen(false);
      }
    }
  };

  // Group result items by category header
  const groupedResults = useMemo(() => {
    const groups = {};
    filteredResults.forEach((item, globalIdx) => {
      const cat = item.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ ...item, globalIdx });
    });
    return groups;
  }, [filteredResults]);

  if (typeof window === 'undefined') return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 select-none">
          
          {/* Backdrop screen mask */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-3xl"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -5, transition: { duration: 0.1 } }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className="soft-glass border border-white/10 rounded-2xl shadow-[0_0_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden w-full max-w-2xl flex flex-col max-h-[70vh] relative z-10 font-sans"
          >
            
            {/* Omnibar Input Box */}
            <div className="flex flex-col shrink-0 relative">
              <div className="flex items-center relative px-6 py-4">
                <Search className="w-8 h-8 text-zinc-500 absolute left-6 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search Vora..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="w-full bg-transparent border-none outline-none focus:ring-0 text-4xl sm:text-5xl text-white placeholder-zinc-700/80 font-art placeholder:font-art py-4 pl-18 pr-16"
                />
                <span className="absolute right-6 text-[9px] font-mono font-bold text-zinc-550 border border-zinc-800 bg-zinc-950/50 px-1.5 py-0.5 rounded shadow-sm">
                  ESC
                </span>
              </div>
              <div className={`h-[1px] w-full transition-all duration-300 ${
                isFocused 
                  ? 'bg-primary-500 neon-diffuse' 
                  : 'bg-white/5'
              }`} />
            </div>

            {/* Scrollable list content area */}
            <div 
              ref={listContainerRef}
              className="flex-grow overflow-y-auto p-2 hide-scrollbar font-sans"
            >
              {filteredResults.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <SearchX className="w-8 h-8 text-zinc-700 animate-pulse" />
                  <h5 className="text-zinc-300 font-bold text-sm mt-3">No matching command results</h5>
                  <p className="text-[11px] text-zinc-550 mt-1 max-w-xs leading-relaxed">
                    Try searching for dashboard settings, events detail routes, or ingress systems keys.
                  </p>
                </div>
              ) : (
                /* Mapped Category Listings */
                Object.keys(groupedResults).map((categoryName) => (
                  <div key={categoryName} className="space-y-1">
                    
                    {/* Category Title Header */}
                    <div className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest px-3.5 py-2 mt-2 first:mt-0 font-display">
                      {categoryName}
                    </div>

                    {/* Category Row Items */}
                    {groupedResults[categoryName].map((item) => {
                      const isHighlighted = item.globalIdx === selectedIndex;
                      const RowIcon = IconMap[item.icon] || Search;

                      return (
                        <div
                          key={item.id}
                          ref={isHighlighted ? activeItemRef : null}
                          onClick={() => {
                            item.action(navigate);
                            setIsOpen(false);
                          }}
                          onMouseEnter={() => setSelectedIndex(item.globalIdx)}
                          className={`flex items-center justify-between gap-4 px-3 py-3.5 rounded-xl cursor-pointer transition-all ${
                            isHighlighted 
                              ? 'bg-primary-500/10 text-white border-l-2 border-primary-500' 
                              : 'text-zinc-400 hover:bg-zinc-950/25'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <RowIcon className={`w-4 h-4 shrink-0 ${isHighlighted ? 'text-primary-400' : 'text-zinc-500'}`} />
                            <div className="min-w-0">
                              <p className={`text-xs font-semibold truncate ${isHighlighted ? 'text-white' : 'text-zinc-200'}`}>
                                {item.label}
                              </p>
                              <span className="text-[10px] text-zinc-550 mt-0.5 block truncate">
                                {item.subLabel}
                              </span>
                            </div>
                          </div>

                          {isHighlighted && (
                            <ChevronRight className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                          )}
                        </div>
                      );
                    })}

                  </div>
                ))
              )}
            </div>

            {/* Microscopic footer hint panel */}
            <div className="border-t border-white/5 bg-zinc-950/20 px-4 py-2 shrink-0 flex items-center justify-between text-[9px] text-zinc-500 select-none">
              <div className="flex items-center gap-4">
                <span>↑↓ to navigate</span>
                <span>↵ to execute</span>
              </div>
              <span>Vora Omnibar Shell</span>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
