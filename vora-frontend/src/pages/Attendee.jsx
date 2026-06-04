import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Compass, 
  BookOpen, 
  Calendar, 
  Search, 
  MapPin, 
  Clock, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  CheckCircle,
  AlertCircle,
  X,
  CreditCard,
  Download,
  CalendarCheck
} from 'lucide-react';
import apiClient from '../services/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';

const Attendee = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL parameters synchronization
  const searchParam = searchParams.get('search') || '';
  const tagsParam = searchParams.get('tags') || '';
  const pageParam = parseInt(searchParams.get('page'), 10) || 1;
  const activeTags = tagsParam ? tagsParam.split(',').filter(Boolean) : [];

  // Local Search Input
  const [searchInput, setSearchInput] = useState(searchParam);
  
  // Layout and Navigation
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // API Data list
  const [events, setEvents] = useState([]);
  const [meta, setMeta] = useState({ total_pages: 1, total_items: 0, current_page: 1, limit: 9 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Checkout Modal states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutEvent, setCheckoutEvent] = useState(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [confirmedTicket, setConfirmedTicket] = useState(null);

  // Local Storage persistence registry
  const [registeredEventIds, setRegisteredEventIds] = useState(() => {
    try {
      const saved = localStorage.getItem('attendee_registrations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const availableTags = [
    'React', 'Quantum', 'Kubernetes', 'Cybersecurity', 'Database',
    'Microservices', 'API Design', 'DevOps', 'Machine Learning', 'Serverless'
  ];

  // Sync registrations list
  useEffect(() => {
    try {
      localStorage.setItem('attendee_registrations', JSON.stringify(registeredEventIds));
    } catch (err) {
      console.error('[Explore] LocalStorage save failed:', err);
    }
  }, [registeredEventIds]);

  // Window scroll hook for header styling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Search Debouncer (400ms delay)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (searchInput.trim()) {
          next.set('search', searchInput);
        } else {
          next.delete('search');
        }
        next.set('page', '1');
        return next;
      });
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchInput, setSearchParams]);

  // Sync search parameter externally
  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  // Fetch events list
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = {
          page: pageParam,
          limit: 9,
          search: searchParam,
          tags: tagsParam
        };
        const res = await apiClient.get('/api/v1/explore/events', { params: queryParams });
        if (res?.data?.success) {
          setEvents(res.data.data);
          setMeta(res.data.meta);
        }
      } catch (err) {
        console.error('[Explore] Data fetch failed:', err);
        setError(err.response?.data?.message || 'Error connecting to the discovery engine.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [searchParam, tagsParam, pageParam]);

  // Scroll freeze hook when checkout modal is active
  useEffect(() => {
    if (isCheckoutOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCheckoutOpen]);

  // Toggle taxonomy filters
  const handleToggleTag = (tag) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      let updatedTags = [...activeTags];
      
      if (updatedTags.includes(tag)) {
        updatedTags = updatedTags.filter(t => t !== tag);
      } else {
        updatedTags.push(tag);
      }

      if (updatedTags.length > 0) {
        next.set('tags', updatedTags.join(','));
      } else {
        next.delete('tags');
      }
      next.set('page', '1');
      return next;
    });
  };

  // Pagination change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > meta.total_pages) return;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', newPage.toString());
      return next;
    });
    const anchor = document.getElementById('explore-anchor');
    if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
  };

  // Trigger checkout flow (requires authenticated user)
  const handleOpenCheckout = (event) => {
    if (!user) {
      window.location.href = `/auth?redirect=/explore`;
      return;
    }
    setCheckoutEvent(event);
    setCheckoutError(null);
    setConfirmedTicket(null);
    setIsCheckoutOpen(true);
  };

  // Submit transactional registration checkout
  const handleConfirmRegistration = async () => {
    if (!checkoutEvent || checkoutSubmitting) return;

    setCheckoutSubmitting(true);
    setCheckoutError(null);

    // Generate unique idempotency key string
    const randString = Math.random().toString(36).substring(2, 10).toUpperCase();
    const idempotencyKey = `KEY-${Date.now()}-${randString}`;

    try {
      const res = await apiClient.post(
        '/api/v1/registrations', 
        { event_id: checkoutEvent.id },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );

      if (res?.data?.success) {
        const ticketData = res.data.data;
        setConfirmedTicket(ticketData);
        setRegisteredEventIds(prev => [...prev, checkoutEvent.id]);
        
        // Refresh local listings for capacity counters updates
        const updatedList = events.map(e => {
          if (e.id === checkoutEvent.id) {
            const currentCount = e.confirmed_attendees || 0;
            return {
              ...e,
              confirmed_attendees: currentCount + 1,
              is_sold_out: currentCount + 1 >= e.maximum_capacity
            };
          }
          return e;
        });
        setEvents(updatedList);
      }
    } catch (err) {
      console.error('[Checkout] Registration transactional failed:', err);
      setCheckoutError(err.response?.data?.message || 'Transaction failed. Capacity limits may have exhausted.');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  // Close checkout modal
  const handleCloseCheckout = () => {
    if (checkoutSubmitting) return; // Prevent closing mid-transaction
    setIsCheckoutOpen(false);
    setCheckoutEvent(null);
    setConfirmedTicket(null);
    setCheckoutError(null);
  };

  // Generate and download ICS calendar file
  const handleExportCalendar = (eventObj) => {
    const startStr = new Date(eventObj.start_timestamp).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endStr = new Date(eventObj.end_timestamp).toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${eventObj.title}`,
      "DESCRIPTION:Virtual technical broadcast on Project Vora ecosystem.",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${eventObj.title.replace(/\s+/g, "_")}_Calendar.ics`;
    link.click();
  };

  // Trigger client-side browser print for PDF export
  const handlePrintTicket = () => {
    window.print();
  };

  // Format date string
  const formatEventDate = (timestampStr) => {
    const d = new Date(timestampStr);
    const options = { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
    return d.toLocaleDateString('en-US', options).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* CSS Stylesheet overrides for modal transitions, custom notches, and print frames */}
      <style>{`
        .glass-navbar {
          background: rgba(3, 7, 18, 0.4);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glass-navbar.scrolled {
          background: #030712;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .hero-banner {
          background: radial-gradient(circle at top, rgba(99, 102, 241, 0.12) 0%, rgba(3, 7, 18, 0) 60%), #030712;
        }
        .search-matrix {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .search-matrix:focus-within {
          border-color: #06b6d4;
          box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.15), 0 10px 30px -10px rgba(6, 182, 212, 0.2);
        }
        .carousel-scrollbar::-webkit-scrollbar {
          height: 0px;
        }
        .event-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .event-card:not(.sold-out-lock):hover {
          transform: translateY(-8px);
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 20px 40px -15px rgba(99, 102, 241, 0.25);
        }
        .event-card:not(.sold-out-lock):hover .banner-img {
          transform: scale(1.05);
        }
        .sold-out-lock {
          opacity: 0.6;
          pointer-events: none;
        }
        .shimmer-bg {
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.03) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Ticket perforation and notches stylings */
        .perforated-divider {
          border-top: 2.5px dashed rgba(255, 255, 255, 0.12);
          position: relative;
        }
        .notch-left, .notch-right {
          position: absolute;
          top: 50%;
          width: 18px;
          height: 18px;
          background: #111827; /* matches modal card background */
          border-radius: 50%;
          transform: translateY(-50%);
          z-index: 10;
        }
        .notch-left {
          left: -10px;
        }
        .notch-right {
          right: -10px;
        }

        /* Print Media Target query to print the ticket view solely */
        @media print {
          body * {
            visibility: hidden;
            background: none !important;
            color: black !important;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: 2px solid #000;
            background: #fff !important;
            color: #000 !important;
            padding: 30px !important;
            border-radius: 12px;
          }
          .print-area .text-white {
            color: black !important;
          }
          .print-area .text-accent-blue {
            color: #000 !important;
          }
          .print-area .bg-slate-800 {
            background: #f3f4f6 !important;
            border: 1px solid #ddd !important;
          }
          .print-no-show {
            display: none !important;
          }
        }

        /* Mobile Walletpass rotative override */
        @media (max-width: 767px) {
          .wallet-pass {
            flex-direction: column !important;
            height: auto !important;
          }
          .wallet-notches {
            border-top: none !important;
            border-left: none !important;
            border-right: none !important;
            border-bottom: 2.5px dashed rgba(255, 255, 255, 0.12) !important;
            padding-bottom: 1.5rem !important;
          }
          .notch-left, .notch-right {
            display: none !important;
          }
        }
      `}</style>

      {/* Global Navigation Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 glass-navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-violet to-accent-blue flex items-center justify-center font-bold text-white shadow-lg">
              V
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
              VORA
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-sm font-semibold text-slate-300 hover:text-white transition duration-200">
              Home
            </Link>
            <span className="text-sm font-semibold text-white flex items-center space-x-1.5 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full">
              <Compass className="w-4 h-4 text-accent-blue animate-pulse" />
              <span>Explore Events</span>
            </span>
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-400 font-mono">Attendee space</span>
                <span className="text-sm font-bold text-white bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                  {user.first_name} {user.last_name[0]}.
                </span>
              </div>
            ) : (
              <>
                <Link to="/auth" className="text-sm font-bold text-slate-400 hover:text-white transition duration-200">
                  Login
                </Link>
                <Link 
                  to="/auth?register=true" 
                  className="px-5 py-2 text-sm font-bold rounded-full bg-gradient-to-r from-accent-violet to-accent-blue text-white shadow-md hover:opacity-90 transition duration-200"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white transition duration-200"
          >
            <Compass className="w-6 h-6" />
          </button>

        </div>
      </header>

      {/* Mobile nav list */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#030712] pt-24 px-6 flex flex-col space-y-6">
          <Link 
            to="/" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-bold text-slate-300 border-b border-white/5 pb-2"
          >
            Home
          </Link>
          <span className="text-lg font-bold text-white flex items-center space-x-2 border-b border-white/5 pb-2">
            <Compass className="w-5 h-5 text-accent-blue" />
            <span>Explore Events</span>
          </span>
          <div className="pt-6 flex flex-col space-y-4">
            {user ? (
              <div className="text-center text-slate-400 py-3 font-mono">
                Logged in as {user.first_name} {user.last_name}
              </div>
            ) : (
              <>
                <Link 
                  to="/auth" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 text-center rounded-xl bg-white/5 text-slate-300 border border-white/10"
                >
                  Login
                </Link>
                <Link 
                  to="/auth?register=true" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 text-center rounded-xl bg-gradient-to-r from-accent-violet to-accent-blue text-white font-bold"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero section */}
      <section className="hero-banner pt-32 pb-16 px-6 shrink-0 flex flex-col items-center justify-center text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-none">
            Discover Global Technical summits
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto font-medium">
            Browse and register for live, multi-track virtual conferences, workshops, and exclusive resource assets.
          </p>

          {/* Search box */}
          <div className="pt-4 max-w-3xl mx-auto w-full">
            <div className="search-matrix rounded-full flex items-center px-5 py-3.5 space-x-3 w-full">
              <Search className="w-6 h-6 text-slate-400 shrink-0" />
              <input 
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search event keywords, titles, summaries..."
                className="bg-transparent border-none text-white text-base sm:text-lg focus:outline-none w-full placeholder-slate-500"
              />
            </div>
          </div>

          {/* Tags Carousel */}
          <div className="pt-6 w-full max-w-3xl overflow-x-auto carousel-scrollbar flex items-center space-x-2 py-2">
            {availableTags.map((tag) => {
              const isActive = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => handleToggleTag(tag)}
                  className={`px-4.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition duration-200 border ${
                    isActive 
                      ? 'bg-[#6366f1] border-[#6366f1] text-white' 
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

        </div>
      </section>

      {/* Main Exploration Grid */}
      <main id="explore-anchor" className="flex-1 bg-[#02040a] px-6 py-12">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h3 className="text-lg font-bold text-white tracking-wide">
              {loading ? 'Scanning events...' : `Discovered (${meta.total_items}) Webinars`}
            </h3>
            {activeTags.length > 0 && (
              <button 
                onClick={() => setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  next.delete('tags');
                  return next;
                })}
                className="text-xs text-accent-blue hover:text-white transition"
              >
                Clear filters
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/25 p-5 rounded-2xl flex items-start space-x-3 text-sm text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold">Discovery Failed</h5>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="rounded-2xl border border-white/5 overflow-hidden bg-white/2 flex flex-col space-y-4 h-[440px]">
                  <div className="w-full h-48 shimmer-bg shrink-0"></div>
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="h-4 w-32 shimmer-bg rounded"></div>
                      <div className="h-6 w-full shimmer-bg rounded"></div>
                      <div className="h-4 w-3/4 shimmer-bg rounded"></div>
                    </div>
                    <div className="h-10 w-full shimmer-bg rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="py-24 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto border border-white/10 text-slate-400">
                <Compass className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-white text-lg">No matches found</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We couldn't locate any events matching your criteria. Try adjusting your tags or search keyword.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.map((event) => {
                const isRegistered = registeredEventIds.includes(event.id);
                const isSoldOut = event.is_sold_out;
                
                return (
                  <div 
                    key={event.id}
                    className={`event-card rounded-2xl flex flex-col overflow-hidden h-[450px] relative ${
                      isSoldOut ? 'sold-out-lock' : ''
                    }`}
                  >
                    
                    <div className="relative h-48 w-full overflow-hidden shrink-0 bg-slate-900 border-b border-white/5">
                      <img 
                        src={event.banner_image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60'} 
                        alt={event.title}
                        className="banner-img w-full h-full object-cover transition-transform duration-500"
                        loading="lazy"
                      />

                      <span className={`absolute top-3 right-3 text-[10px] font-bold tracking-wider px-3 py-1 rounded-full shadow-lg text-white ${
                        isSoldOut 
                          ? 'bg-red-600' 
                          : isRegistered
                            ? 'bg-status-success'
                            : 'bg-emerald-600'
                      }`}>
                        {isSoldOut ? 'SOLD OUT' : isRegistered ? 'REGISTERED' : 'REGISTER NOW'}
                      </span>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between min-h-0 bg-gradient-to-b from-transparent to-white/[0.01]">
                      <div className="space-y-3 min-h-0 overflow-hidden">
                        
                        <div className="text-[10px] font-bold text-accent-blue font-mono tracking-wider flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{formatEventDate(event.start_timestamp)}</span>
                        </div>

                        <h4 className="text-lg font-bold text-white leading-snug line-clamp-2" title={event.title}>
                          {event.title}
                        </h4>

                        <div className="flex items-center space-x-2 text-slate-400">
                          {event.organizer_avatar_url ? (
                            <img 
                              src={event.organizer_avatar_url} 
                              alt={`${event.organizer_first_name} avatar`} 
                              className="w-5 h-5 rounded-full border border-white/10"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                              <User className="w-3 h-3 text-slate-400" />
                            </div>
                          )}
                          <span className="text-xs font-semibold">
                            By {event.organizer_first_name} {event.organizer_last_name}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                          {event.description}
                        </p>

                        {event.tags && event.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {event.tags.slice(0, 3).map((t, i) => (
                              <span key={i} className="text-[9px] bg-white/5 text-slate-300 border border-white/10 px-2 py-0.5 rounded-md font-medium">
                                {t}
                              </span>
                            ))}
                            {event.tags.length > 3 && (
                              <span className="text-[9px] text-slate-500 font-bold px-1 py-0.5">
                                +{event.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                      </div>

                      <div className="pt-4 mt-auto">
                        <button
                          disabled={isSoldOut || isRegistered}
                          onClick={() => handleOpenCheckout(event)}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition duration-200 border flex items-center justify-center space-x-2 shadow-sm ${
                            isRegistered
                              ? 'bg-status-success/15 border-status-success/30 text-status-success cursor-default'
                              : isSoldOut
                                ? 'bg-red-950/20 border-red-900/30 text-red-500 cursor-not-allowed'
                                : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          {isRegistered ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Registration Confirmed</span>
                            </>
                          ) : isSoldOut ? (
                            <span>Capacity Fully Booked</span>
                          ) : (
                            <span>Secure Ticket Reservation</span>
                          )}
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && meta.total_pages > 1 && (
            <div className="pt-12 flex justify-center items-center space-x-2 shrink-0 border-t border-white/5">
              
              <button
                disabled={pageParam <= 1}
                onClick={() => handlePageChange(pageParam - 1)}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {Array.from({ length: meta.total_pages }).map((_, i) => {
                const pNum = i + 1;
                const isActive = pageParam === pNum;
                return (
                  <button
                    key={pNum}
                    onClick={() => handlePageChange(pNum)}
                    className={`w-10 h-10 rounded-xl font-mono text-sm font-bold border transition duration-200 ${
                      isActive 
                        ? 'bg-[#6366f1] border-[#6366f1] text-white' 
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}

              <button
                disabled={pageParam >= meta.total_pages}
                onClick={() => handlePageChange(pageParam + 1)}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

            </div>
          )}

        </div>
      </main>

      {/* Global Footer */}
      <footer className="border-t border-white/5 bg-[#030712] py-8 text-center text-xs text-slate-500 px-6 shrink-0 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Project Vora. Unified Attendee Space • EDUPFSD072 Full Stack Development.</p>
          <div className="flex space-x-4">
            <Link to="/" className="hover:underline hover:text-slate-300">Privacy Policy</Link>
            <span>•</span>
            <Link to="/" className="hover:underline hover:text-slate-300">Terms of Use</Link>
          </div>
        </div>
      </footer>

      {/* TRANSACTIONAL REGISTRATION CHECKOUT & DIGITAL WALLET MODAL */}
      {isCheckoutOpen && checkoutEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Backdrop Z-axis isolation overlay (Task 5) */}
          <div 
            onClick={handleCloseCheckout}
            className="fixed inset-0 bg-[#020306]/85 backdrop-blur-[24px] transition-opacity duration-300"
          ></div>

          {/* Checkout Housing Card (Task 5) */}
          <div className="w-full max-w-[800px] bg-[#111827] border border-white/10 rounded-[24px] shadow-2xl relative z-10 flex flex-col overflow-hidden h-[540px] md:h-[480px]">
            
            {/* Ambient Top lightning */}
            <div className="absolute left-0 right-0 top-0 h-[1.5px] bg-gradient-to-r from-accent-violet/30 via-accent-blue/20 to-transparent"></div>

            {/* Close Button */}
            <button
              disabled={checkoutSubmitting}
              onClick={handleCloseCheckout}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#111827]/80 border border-white/10 hover:bg-slate-800 text-slate-400 hover:text-white transition z-20 print-no-show"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Success state - ticket boarding pass layout (Task 8) */}
            {confirmedTicket ? (
              <div className="flex-1 flex flex-col justify-between p-6 print-area bg-[#111827]">
                
                <div className="space-y-4 flex-grow overflow-y-auto">
                  <div className="text-center print-no-show">
                    <span className="inline-flex items-center space-x-1.5 text-xs text-status-success font-bold bg-status-success/10 border border-status-success/20 px-3 py-1.5 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Registration Confirmed</span>
                    </span>
                    <h3 className="text-xl font-extrabold text-white mt-2">Your Ticket is Secured!</h3>
                  </div>

                  {/* Physical boarding pass replication geometry */}
                  <div className="wallet-pass bg-[#1e293b] rounded-2xl border border-white/10 flex overflow-hidden h-56 md:h-44 shadow-lg relative">
                    
                    {/* Punched circle notches */}
                    <div className="notch-left"></div>
                    <div className="notch-right"></div>

                    {/* Top / Left Half - Event Details */}
                    <div className="wallet-notches flex-1 p-5 flex flex-col justify-between border-right min-w-0">
                      <div className="space-y-1.5 min-w-0">
                        <span className="text-[9px] font-bold text-accent-blue font-mono tracking-widest block">
                          EVENT PASS
                        </span>
                        <h4 className="text-sm font-bold text-white truncate">
                          {confirmedTicket.event.title}
                        </h4>
                        <div className="text-[10px] font-mono text-slate-400 font-bold space-y-0.5">
                          <p>DATE: {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(confirmedTicket.event.start_timestamp))}</p>
                          <p>TIME: {new Date(confirmedTicket.event.start_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(confirmedTicket.event.end_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px] text-white">
                          {user?.first_name[0]}
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 truncate">
                          {user?.first_name} {user?.last_name}
                        </span>
                      </div>
                    </div>

                    {/* Perforated vertical line divider (Task 8) */}
                    <div className="hidden md:block w-px border-l-2 border-dashed border-white/10 h-full relative z-10"></div>

                    {/* Bottom / Right Half - Cryptographic validation (Task 8) */}
                    <div className="w-full md:w-44 bg-white/[0.02] p-5 flex flex-col items-center justify-center shrink-0 space-y-2 select-all">
                      
                      {/* Generated inline SVG QR code */}
                      <svg className="w-20 h-20 text-white bg-white p-1 rounded-lg shrink-0" viewBox="0 0 100 100" fill="currentColor">
                        <rect x="5" y="5" width="25" height="25" />
                        <rect x="10" y="10" width="15" height="15" fill="black" />
                        <rect x="70" y="5" width="25" height="25" />
                        <rect x="75" y="10" width="15" height="15" fill="black" />
                        <rect x="5" y="70" width="25" height="25" />
                        <rect x="10" y="75" width="15" height="15" fill="black" />
                        <rect x="35" y="5" width="10" height="10" />
                        <rect x="50" y="20" width="10" height="10" />
                        <rect x="35" y="35" width="15" height="15" />
                        <rect x="60" y="45" width="10" height="15" />
                        <rect x="80" y="40" width="15" height="10" />
                        <rect x="40" y="70" width="15" height="20" />
                        <rect x="65" y="75" width="20" height="10" />
                        <rect x="80" y="80" width="10" height="10" />
                      </svg>

                      <span className="text-[9px] font-mono font-bold text-accent-blue tracking-wide text-center uppercase block max-w-full truncate">
                        {confirmedTicket.registration.ticket_hash}
                      </span>
                    </div>

                  </div>
                </div>

                {/* Print/Calendar Toolbars */}
                <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between gap-3 print-no-show">
                  <div className="flex space-x-2">
                    <button
                      onClick={handlePrintTicket}
                      className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 font-bold text-xs flex items-center space-x-2 transition duration-200"
                    >
                      <Download className="w-4 h-4 text-accent-blue" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      onClick={() => handleExportCalendar(confirmedTicket.event)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 font-bold text-xs flex items-center space-x-2 transition duration-200"
                    >
                      <CalendarCheck className="w-4 h-4 text-accent-blue" />
                      <span>Add to Calendar</span>
                    </button>
                  </div>
                  <button
                    onClick={handleCloseCheckout}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-violet to-accent-blue text-white font-bold text-xs"
                  >
                    Done Explorer
                  </button>
                </div>

              </div>
            ) : (
              /* Transaction checkout detail summary view (Task 6) */
              <div className="flex-grow flex h-full">
                
                {/* Left 40% column - Poster Art Banner */}
                <div className="hidden md:block w-[40%] bg-slate-900 border-r border-white/5 relative">
                  <img 
                    src={checkoutEvent.banner_image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60'} 
                    alt="Checkout cover artwork"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent"></div>
                </div>

                {/* Right 60% column - Checklist parameters */}
                <div className="flex-1 p-6 flex flex-col justify-between h-full">
                  
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-accent-violet font-mono tracking-widest block uppercase">
                        SECURE REGISTRATION CHECKOUT
                      </span>
                      <h3 className="text-xl font-bold text-white leading-snug line-clamp-2">
                        {checkoutEvent.title}
                      </h3>
                    </div>

                    {/* Date and Venue summary */}
                    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-2">
                      <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
                        <Calendar className="w-4 h-4 text-accent-blue" />
                        <span>{formatEventDate(checkoutEvent.start_timestamp)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span>Vora Broadcast Space • Virtual Allocation</span>
                      </div>
                    </div>

                    {/* Hydrated user profile credentials details */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                        Attendee details
                      </span>
                      <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">NAME:</span>
                          <span className="font-bold text-white">{user?.first_name} {user?.last_name}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">EMAIL:</span>
                          <span className="font-mono text-slate-300">{user?.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Error Alerts */}
                    {checkoutError && (
                      <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-xl flex items-center space-x-2 text-xs text-red-400">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="font-bold">{checkoutError}</span>
                      </div>
                    )}
                  </div>

                  {/* Submission and cancel buttons */}
                  <div className="pt-4 border-t border-white/5 flex justify-end space-x-2 shrink-0">
                    <button
                      type="button"
                      disabled={checkoutSubmitting}
                      onClick={handleCloseCheckout}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={checkoutSubmitting}
                      onClick={handleConfirmRegistration}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-violet to-accent-blue text-white font-bold text-xs flex items-center space-x-2 shadow-md hover:opacity-90 transition duration-200"
                    >
                      {checkoutSubmitting ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Securing Allocation...</span>
                        </>
                      ) : (
                        <span>Confirm Ticket Reservation</span>
                      )}
                    </button>
                  </div>

                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default Attendee;
