import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Plus, 
  Search, 
  Clock, 
  Edit, 
  Trash2, 
  Users, 
  X, 
  User, 
  MapPin, 
  TrendingUp,
  AlertTriangle,
  Check,
  Minus
} from 'lucide-react';
import apiClient from '../../services/apiClient.js';

const Events = () => {
  // Primary State Registry
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [profiles, setProfiles] = useState([]); // used for speaker dropdown
  
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  // Modal Control States (Task 3)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalActive, setIsModalActive] = useState(false); // triggers CSS transition
  const [isModalExiting, setIsModalExiting] = useState(false); // triggers exit CSS transition
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [activeSessionId, setActiveSessionId] = useState(null);
  
  // Modal Form Inputs
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formTrack, setFormTrack] = useState('Main Stage');
  const [formSpeaker, setFormSpeaker] = useState('');
  const [formCapacity, setFormCapacity] = useState('');

  // Dropdown UI States (Task 6)
  const [isSpeakerDropdownOpen, setIsSpeakerDropdownOpen] = useState(false);
  const [speakerSearch, setSpeakerSearch] = useState('');
  const [isTrackDropdownOpen, setIsTrackDropdownOpen] = useState(false);
  const [trackSearch, setTrackSearch] = useState('');

  // Capacity switches (Task 7)
  const [enforceCapacity, setEnforceCapacity] = useState(false);

  // Validation & Transaction States (Task 5, 8 & 9)
  const [temporalError, setTemporalError] = useState(null);
  const [collisionWarning, setCollisionWarning] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Biometric Mobile Swipe Dismissal States (Task 10)
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchMoveY, setTouchMoveY] = useState(0);

  // Tooltip & Hover projection states (Task 8 of Prompt 13)
  const [tooltipSession, setTooltipSession] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef(null);

  // DOM References for focus trapping and click-away close
  const modalRef = useRef(null);
  const speakerDropdownRef = useRef(null);
  const trackDropdownRef = useRef(null);

  // Timeline Scale Constants
  const MINUTE_SCALE = 3;
  const HOUR_HEIGHT = 60 * MINUTE_SCALE; // 180px
  const DAY_START_HOUR = 8;
  const DAY_END_HOUR = 20;
  const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;

  // Fetch Parent Events & Profiles on Mount
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await apiClient.get('/api/v1/events');
        if (res?.data?.success) {
          setEvents(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedEvent(res.data.data[0]);
          }
        }
      } catch (err) {
        console.error('[Events] Error loading parent events:', err);
      } finally {
        setLoadingEvents(false);
      }
    };

    const loadProfiles = async () => {
      try {
        const res = await apiClient.get('/api/v1/auth/profiles');
        if (res?.data?.success) {
          setProfiles(res.data.data);
        }
      } catch (err) {
        console.error('[Events] Error loading speaker profiles:', err);
      }
    };

    loadEvents();
    loadProfiles();
  }, []);

  // Fetch Child Sessions when selected event changes
  useEffect(() => {
    if (!selectedEvent) return;
    
    const loadSessions = async () => {
      setLoadingSessions(true);
      try {
        const res = await apiClient.get(`/api/v1/events/${selectedEvent.id}/sessions`);
        if (res?.data?.success) {
          setSessions(res.data.data);
        }
      } catch (err) {
        console.error('[Events] Error loading sessions:', err);
      } finally {
        setLoadingSessions(false);
      }
    };

    loadSessions();
  }, [selectedEvent]);

  // Handle outside clicks to close searchable dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (speakerDropdownRef.current && !speakerDropdownRef.current.contains(e.target)) {
        setIsSpeakerDropdownOpen(false);
      }
      if (trackDropdownRef.current && !trackDropdownRef.current.contains(e.target)) {
        setIsTrackDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Body Scroll Lock & Focus Trap Hook (Task 1)
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      // Simple focus trap: find first input and focus it
      setTimeout(() => {
        const firstInput = modalRef.current?.querySelector('input');
        if (firstInput) firstInput.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Compute Unique Tracks dynamically from session payload
  const uniqueTracks = React.useMemo(() => {
    const tracksSet = new Set();
    sessions.forEach(s => {
      if (s.track_name) tracksSet.add(s.track_name);
    });
    if (tracksSet.size === 0) {
      return ['Main Stage', 'Technical Track', 'Security Arena'];
    }
    return Array.from(tracksSet);
  }, [sessions]);

  // Filter Parent Events based on Search/Status selectors
  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Statuses' || e.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Dynamic Coordinate Calculations for SVG height mapping
  const getCoordinates = (startTimeStr, endTimeStr) => {
    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);
    
    const startHrs = start.getHours() + start.getMinutes() / 60;
    const endHrs = end.getHours() + end.getMinutes() / 60;
    
    const topOffset = (startHrs - DAY_START_HOUR) * HOUR_HEIGHT;
    const cardHeight = (endHrs - startHrs) * HOUR_HEIGHT;
    
    return {
      top: `${topOffset + 48}px`, 
      height: `${cardHeight}px`
    };
  };

  // Tooltip projection trigger (Task 8 of Prompt 13)
  const handleCardMouseEnter = (e, session) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollParent = e.currentTarget.offsetParent;
    const parentRect = scrollParent ? scrollParent.getBoundingClientRect() : { left: 0, top: 0 };
    
    const x = rect.right - parentRect.left + 12;
    const y = rect.top - parentRect.top;
    
    hoverTimeoutRef.current = setTimeout(() => {
      setTooltipSession(session);
      setTooltipPos({ x, y });
    }, 400); 
  };

  const handleCardMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setTooltipSession(null);
  };

  // Real-Time Bounding & Collision Pre-Checks (Task 5 & 8)
  useEffect(() => {
    if (!formStart || !formEnd || !selectedEvent) {
      setTemporalError(null);
      setCollisionWarning(null);
      return;
    }

    const start = new Date(formStart);
    const end = new Date(formEnd);
    const eventStart = new Date(selectedEvent.start_timestamp);
    const eventEnd = new Date(selectedEvent.end_timestamp);

    // 1. Event boundaries check
    if (start < eventStart || end > eventEnd) {
      setTemporalError('Temporal Boundary Violation: Session Schedule Exceeds Parent Event Lifespan.');
      return;
    }

    // 2. Minimum 15-minute gap check
    const diffMins = (end.getTime() - start.getTime()) / 60000;
    if (diffMins < 15) {
      setTemporalError('Invalid Timeline: Session duration must be at least 15 minutes.');
      return;
    }

    // Clear temporal errors if validations clear
    setTemporalError(null);

    // 3. Real-time overlap collision check
    const overlapDetected = sessions.some(s => {
      // Exclude self if editing
      if (modalMode === 'edit' && s.id === activeSessionId) return false;

      const sStart = new Date(s.session_start_time);
      const sEnd = new Date(s.session_end_time);

      const hasTrackConflict = formTrack && s.track_name?.toLowerCase() === formTrack.trim().toLowerCase();
      const hasSpeakerConflict = formSpeaker && s.speaker_id === formSpeaker;

      if (hasTrackConflict || hasSpeakerConflict) {
        // Standard overlap: proposed start < existing end AND proposed end > existing start
        return start < sEnd && end > sStart;
      }
      return false;
    });

    if (overlapDetected) {
      setCollisionWarning('Scheduling Collision Warning: Designated Track or Speaker has an overlapping slot.');
    } else {
      setCollisionWarning(null);
    }

  }, [formStart, formEnd, formTrack, formSpeaker, selectedEvent, sessions, modalMode, activeSessionId]);

  // Safe Cascade Delete Action (Task 9 of Prompt 12)
  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this session?')) return;

    try {
      const res = await apiClient.delete(`/api/v1/events/${selectedEvent.id}/sessions/${sessionId}`);
      if (res?.data?.success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete session.');
    }
  };

  // Close Modal with exit transitions (Task 3)
  const handleCloseModal = () => {
    setIsModalExiting(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsModalExiting(false);
      setIsModalActive(false);
      setSubmitSuccess(false);
      setSubmitError(null);
      setCollisionWarning(null);
      setTemporalError(null);
    }, 200); 
  };

  // Open Creation Modal (Task 4)
  const openCreateModal = () => {
    setModalMode('create');
    setFormTitle('');
    setFormDesc('');
    
    // Set default datetime inputs to start of event
    if (selectedEvent) {
      const eStart = new Date(selectedEvent.start_timestamp);
      const tzOffset = eStart.getTimezoneOffset() * 60000;
      const localISO = new Date(eStart.getTime() - tzOffset).toISOString().slice(0, 16);
      setFormStart(localISO);
      setFormEnd(new Date(eStart.getTime() + 60 * 60 * 1000 - tzOffset).toISOString().slice(0, 16)); // default 1h
    } else {
      setFormStart('');
      setFormEnd('');
    }
    
    setFormTrack('Main Stage');
    setFormSpeaker('');
    setFormCapacity('');
    setEnforceCapacity(false);
    
    setIsModalOpen(true);
    setTimeout(() => setIsModalActive(true), 10);
  };

  // Open Editing Modal (Task 9 of Prompt 13)
  const openEditModal = (e, session) => {
    e.stopPropagation();
    setModalMode('edit');
    setActiveSessionId(session.id);
    setFormTitle(session.session_title);
    setFormDesc(session.session_description || '');
    
    const startISO = new Date(session.session_start_time);
    const endISO = new Date(session.session_end_time);
    
    const toLocalISO = (d) => {
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    };
    
    setFormStart(toLocalISO(startISO));
    setFormEnd(toLocalISO(endISO));
    setFormTrack(session.track_name);
    setFormSpeaker(session.speaker_id || '');
    
    if (session.session_capacity_limit) {
      setEnforceCapacity(true);
      setFormCapacity(session.session_capacity_limit);
    } else {
      setEnforceCapacity(false);
      setFormCapacity('');
    }
    
    setIsModalOpen(true);
    setTimeout(() => setIsModalActive(true), 10);
  };

  // Handle Save Form submission (Task 9)
  const handleSaveSession = async (e) => {
    e.preventDefault();
    if (temporalError) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      session_title: formTitle,
      session_description: formDesc,
      session_start_time: new Date(formStart).toISOString(),
      session_end_time: new Date(formEnd).toISOString(),
      track_name: formTrack,
      speaker_id: formSpeaker || null,
      session_capacity_limit: enforceCapacity && formCapacity ? parseInt(formCapacity, 10) : null
    };

    try {
      if (modalMode === 'create') {
        const res = await apiClient.post(`/api/v1/events/${selectedEvent.id}/sessions`, payload);
        if (res?.data?.success) {
          setSessions(prev => [...prev, res.data.data]);
        }
      } else {
        const res = await apiClient.patch(`/api/v1/events/${selectedEvent.id}/sessions/${activeSessionId}`, payload);
        if (res?.data?.success) {
          setSessions(prev => prev.map(s => s.id === activeSessionId ? res.data.data : s));
        }
      }
      
      setSubmitSuccess(true);
      setTimeout(() => {
        handleCloseModal();
        setIsSubmitting(false);
      }, 500); // short success delay for visual confirmation
      
    } catch (err) {
      setIsSubmitting(false);
      setSubmitError(err.response?.data?.message || 'Conflict or bounds error detected.');
    }
  };

  // Biometric Drag down handlers (Task 10)
  const handleTouchStart = (e) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY;
    if (diff > 0) {
      setTouchMoveY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (touchMoveY > 120) {
      handleCloseModal();
    }
    setTouchMoveY(0);
  };

  // Floating capacity increments (Task 7)
  const incrementCapacity = () => {
    setFormCapacity(prev => {
      const val = parseInt(prev, 10) || 0;
      return val + 10;
    });
  };

  const decrementCapacity = () => {
    setFormCapacity(prev => {
      const val = parseInt(prev, 10) || 0;
      return Math.max(1, val - 10);
    });
  };

  // Filter lists for searchable select boxes (Task 6)
  const filteredSpeakers = profiles.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(speakerSearch.toLowerCase())
  );

  const filteredTracks = uniqueTracks.filter(t => 
    t.toLowerCase().includes(trackSearch.toLowerCase())
  );

  const activeSpeakerProfile = profiles.find(p => p.id === formSpeaker);

  // Form Validity Evaluation (Task 8)
  const isFormValid = formTitle.trim() && formStart && formEnd && formTrack.trim() && !temporalError && !isSubmitting;

  return (
    <div className="h-full flex flex-col overflow-hidden select-none space-y-6">
      
      {/* CSS Stylesheet Modules (Task 1, 2, 3, 4 & 10) */}
      <style>{`
        .timeline-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .timeline-scrollbar::-webkit-scrollbar-track {
          background: rgba(11, 15, 25, 0.4);
        }
        .timeline-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.35);
          border-radius: 9999px;
        }
        .timeline-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.55);
        }
        .session-card {
          background: rgba(17, 24, 39, 0.50);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .session-card:hover {
          transform: translateY(-4px);
          border-color: rgba(139, 92, 246, 0.85);
          box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.35), 0 8px 10px -6px rgba(139, 92, 246, 0.35);
          z-index: 10;
        }
        .session-card:hover .action-bar {
          opacity: 1;
        }
        .sticky-axis-header {
          position: sticky;
          top: 0;
          z-index: 30;
          background: #090d16;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .sticky-axis-column {
          position: sticky;
          left: 0;
          z-index: 30;
          background: #090d16;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }
        .sticky-axis-corner {
          position: sticky;
          top: 0;
          left: 0;
          z-index: 40;
          background: #090d16;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        /* Floating form input labels (Task 4) */
        .floating-group {
          position: relative;
        }
        .floating-input {
          background: rgba(17, 24, 39, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 1.25rem 0.75rem 0.35rem 0.75rem;
          color: white;
          width: 100%;
          font-size: 0.85rem;
          transition: all 0.2s ease;
        }
        .floating-input:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
        }
        .floating-label {
          position: absolute;
          left: 0.75rem;
          top: 0.85rem;
          color: #9ca3af;
          pointer-events: none;
          transition: all 0.2s ease;
          font-size: 0.85rem;
        }
        .floating-input:focus ~ .floating-label,
        .floating-input:not(:placeholder-shown) ~ .floating-label {
          top: 0.25rem;
          font-size: 0.65rem;
          color: #8b5cf6;
          font-weight: bold;
        }

        /* Modal mounting transitions (Task 3) */
        .modal-overlay {
          opacity: 0;
          transition: opacity 300ms linear;
        }
        .modal-overlay.active {
          opacity: 1;
        }
        .modal-card {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 400ms cubic-bezier(0.16, 1, 0.3, 1), transform 400ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .modal-card.active {
          opacity: 1;
          transform: translateY(0);
        }

        /* Exit Transitions */
        .modal-overlay.exit {
          opacity: 0;
          transition: opacity 200ms linear;
        }
        .modal-card.exit {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 200ms ease-in, transform 200ms ease-in;
        }

        /* Mobile drawer adjustments (Task 10) */
        @media (max-width: 767px) {
          .modal-card {
            width: 100% !important;
            max-width: 100% !important;
            border-bottom-left-radius: 0px !important;
            border-bottom-right-radius: 0px !important;
            border-top-left-radius: 24px !important;
            border-top-right-radius: 24px !important;
            bottom: 0 !important;
            position: fixed !important;
            height: 95% !important;
            max-height: 95% !important;
            transform: translateY(100%);
            transition: transform 400ms cubic-bezier(0.16, 1, 0.3, 1);
          }
          .modal-card.active {
            transform: translateY(0);
          }
          .modal-card.exit {
            transform: translateY(100%);
            transition: transform 200ms ease-in;
          }
        }
      `}</style>

      {/* Header section controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Interactive Schedule Builder</h2>
          <p className="text-brand-muted text-sm mt-1">Design multi-track session maps and coordinate speaker slots.</p>
        </div>

        {selectedEvent && (
          <button 
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-accent-violet to-accent-blue text-white font-semibold rounded-xl hover:opacity-90 transition duration-200 shadow-md outline-none"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Session</span>
          </button>
        )}
      </div>

      {/* Dynamic Filter Deck */}
      <div className="bg-brand-slate/50 backdrop-blur-md p-4 rounded-2xl border border-brand-card shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        
        {/* Parent Event dropdown */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <Calendar className="w-5 h-5 text-accent-violet shrink-0" />
          <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider block shrink-0">Active Event:</span>
          {loadingEvents ? (
            <div className="h-9 w-48 bg-brand-dark/50 border border-brand-card animate-pulse rounded-xl"></div>
          ) : (
            <select 
              value={selectedEvent ? selectedEvent.id : ''}
              onChange={(e) => {
                const ev = events.find(o => o.id === e.target.value);
                setSelectedEvent(ev);
              }}
              className="bg-brand-dark border border-brand-card text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-accent-violet transition min-w-[200px] max-w-sm truncate"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          )}
        </div>

        {/* Filter input elements */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Search event schedules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-brand-dark border border-brand-card focus:border-accent-violet focus:outline-none rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-600 transition w-48"
            />
          </div>

          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-brand-dark border border-brand-card text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-accent-violet transition"
          >
            <option>All Statuses</option>
            <option>Published</option>
            <option>Active</option>
            <option>Draft</option>
            <option>Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main Workspace Viewport */}
      <div className="flex-1 min-h-0 bg-brand-dark rounded-2xl border border-brand-card shadow-inner flex overflow-hidden relative">
        
        {loadingEvents || loadingSessions ? (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-dark/40 backdrop-blur-sm z-20">
            <svg className="animate-spin h-8 w-8 text-accent-violet" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : !selectedEvent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-accent-violet/10 text-accent-violet flex items-center justify-center">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-lg font-bold text-white">No Event Console Registries</h3>
              <p className="text-brand-muted text-sm leading-relaxed">
                Active connection pool will retrieve database rows upon creating event entities.
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col">
            
            {/* DESKTOP 2D MULTI-TRACK TIMELINE GRID */}
            <div className="hidden md:flex flex-1 overflow-auto timeline-scrollbar relative min-h-0">
              
              <div 
                className="grid" 
                style={{
                  gridTemplateColumns: `80px repeat(${uniqueTracks.length}, minmax(300px, 1fr))`,
                  gridTemplateRows: `48px ${TOTAL_HOURS * HOUR_HEIGHT}px`,
                  width: 'max-content',
                  minWidth: '100%',
                  height: 'max-content'
                }}
              >
                {/* Intersection cell */}
                <div className="sticky-axis-corner flex items-center justify-center text-[10px] font-bold text-slate-400 font-mono">
                  GMT-08
                </div>

                {/* Top header row - Sticky Track Labels */}
                {uniqueTracks.map((track, idx) => (
                  <div 
                    key={idx} 
                    className="sticky-axis-header flex items-center justify-center px-4"
                  >
                    <span className="text-[10px] font-bold tracking-widest text-slate-300 uppercase bg-accent-violet/10 border border-accent-violet/30 px-3 py-1 rounded-full">
                      {track}
                    </span>
                  </div>
                ))}

                {/* Leftmost column - Sticky Hour Blocks */}
                <div className="col-start-1 col-end-2 row-start-2 relative">
                  {Array.from({ length: TOTAL_HOURS }).map((_, i) => {
                    const hour = DAY_START_HOUR + i;
                    const formatHour = `${hour.toString().padStart(2, '0')}:00`;
                    
                    return (
                      <div 
                        key={i} 
                        className="sticky-axis-column flex items-start justify-center pt-2 font-mono text-[10px] text-slate-400 font-bold border-bottom"
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      >
                        {formatHour}
                      </div>
                    );
                  })}
                </div>

                {/* Main grid canvas overlay gridlines */}
                <div 
                  className="row-start-2 col-start-2 relative pointer-events-none"
                  style={{
                    gridColumnEnd: uniqueTracks.length + 2,
                    height: '100%'
                  }}
                >
                  {/* Horizontal grid lines */}
                  {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                    <div 
                      key={i}
                      className="absolute left-0 right-0 border-b border-white/5"
                      style={{ top: `${(i + 1) * HOUR_HEIGHT}px` }}
                    />
                  ))}
                  
                  {/* Vertical grid lines */}
                  {uniqueTracks.map((_, i) => (
                    <div 
                      key={i}
                      className="absolute top-0 bottom-0 border-r border-white/5"
                      style={{ left: `${(i + 1) * (100 / uniqueTracks.length)}%` }}
                    />
                  ))}
                </div>

                {/* Spatial Injection of Absolute Session Cards */}
                {uniqueTracks.map((track, colIdx) => {
                  const columnSessions = sessions.filter(s => s.track_name === track);
                  
                  return (
                    <div 
                      key={colIdx} 
                      className="row-start-2 relative"
                      style={{ gridColumnStart: colIdx + 2 }}
                    >
                      {columnSessions.map((session) => {
                        const { top, height } = getCoordinates(session.session_start_time, session.session_end_time);
                        const progressRatio = session.event_attendees_count / (session.session_capacity_limit || selectedEvent.maximum_capacity);
                        const isPacked = progressRatio >= 1.0;
                        const speaker = profiles.find(p => p.id === session.speaker_id);

                        return (
                          <div
                            key={session.id}
                            onMouseEnter={(e) => handleCardMouseEnter(e, session)}
                            onMouseLeave={handleCardMouseLeave}
                            onClick={(e) => openEditModal(e, session)}
                            className="absolute left-2 right-2 session-card rounded-2xl p-4 flex flex-col justify-between overflow-hidden cursor-pointer"
                            style={{ top, height }}
                          >
                            <div className="absolute left-0 right-0 top-0 h-[1.5px] bg-gradient-to-r from-accent-violet/30 via-accent-blue/20 to-transparent"></div>

                            {/* Toolbar actions */}
                            <div className="absolute top-2 right-2 flex space-x-1.5 action-bar opacity-0 transition-opacity duration-150 z-20">
                              <button
                                onClick={(e) => openEditModal(e, session)}
                                className="p-1.5 rounded-lg bg-brand-slate/80 border border-brand-card hover:border-accent-violet hover:text-accent-violet text-slate-400 transition"
                                aria-label="Edit Session Config"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDelete(e, session.id)}
                                className="p-1.5 rounded-lg bg-brand-slate/80 border border-brand-card hover:border-status-danger hover:text-status-danger text-slate-400 transition"
                                aria-label="Destructive Delete Session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Title stack */}
                            <div className="space-y-1.5 min-w-0 pr-12">
                              <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                                {session.session_title}
                              </h4>
                              <div className="flex items-center space-x-1.5 text-[9px] text-[#9ca3af] font-bold font-mono">
                                <Clock className="w-3 h-3 text-accent-blue shrink-0" />
                                <span>
                                  {new Date(session.session_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(session.session_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </span>
                              </div>
                            </div>

                            {/* Speaker identity */}
                            <div className="flex items-center space-x-2 text-[10px] text-brand-muted font-mono truncate">
                              <User className="w-3.5 h-3.5 text-accent-violet shrink-0" />
                              <span className="font-semibold text-slate-300">
                                {speaker ? `${speaker.first_name} ${speaker.last_name}` : 'TBA Speaker'}
                              </span>
                            </div>

                            {/* Seating capacity bar */}
                            <div className="space-y-1 shrink-0">
                              <div className="flex justify-between items-center text-[9px] font-bold font-mono text-[#9ca3af]">
                                <span>CAPACITY</span>
                                <span className={isPacked ? 'text-status-danger font-extrabold' : 'text-status-success font-extrabold'}>
                                  {session.event_attendees_count || 0} / {session.session_capacity_limit || 'UNLIMITED'}
                                </span>
                              </div>
                              <div className="h-1 w-full bg-[#1f2937] rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isPacked ? 'bg-status-danger' : 'bg-status-success'
                                  }`}
                                  style={{ width: `${Math.min(100, (progressRatio * 100) || 0)}%` }}
                                />
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Hover Contextual Tooltip */}
              {tooltipSession && (
                <div
                  className="absolute tooltip-glass p-4 rounded-xl shadow-2xl space-y-3 z-50 pointer-events-none text-xs w-80 border border-white/10"
                  style={{
                    left: `${tooltipPos.x}px`,
                    top: `${tooltipPos.y}px`
                  }}
                >
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-accent-violet uppercase tracking-widest block font-mono">
                      {tooltipSession.track_name}
                    </span>
                    <h5 className="font-bold text-white text-sm leading-snug">{tooltipSession.session_title}</h5>
                  </div>
                  
                  {tooltipSession.session_description && (
                    <p className="text-[#9ca3af] leading-relaxed text-[11px]">
                      {tooltipSession.session_description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-brand-card/50 text-[10px] font-mono text-brand-muted">
                    <div className="space-y-0.5">
                      <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">Scheduled Time</span>
                      <div className="flex items-center space-x-1 text-slate-300">
                        <Clock className="w-3 h-3 text-accent-blue" />
                        <span>
                          {new Date(tooltipSession.session_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(tooltipSession.session_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">Attendee Seats</span>
                      <div className="flex items-center space-x-1 text-slate-300">
                        <Users className="w-3 h-3 text-accent-violet" />
                        <span>{tooltipSession.event_attendees_count} Registered</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* MOBILE 1D VERTICAL LIST OVERRIDE */}
            <div className="flex md:hidden flex-1 overflow-y-auto p-4 space-y-4 timeline-scrollbar">
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-[#9ca3af] text-xs">
                  No sessions scheduled for this period.
                </div>
              ) : (
                [...sessions]
                  .sort((a, b) => new Date(a.session_start_time) - new Date(b.session_start_time))
                  .map((session) => {
                    const speaker = profiles.find(p => p.id === session.speaker_id);
                    const progressRatio = session.event_attendees_count / (session.session_capacity_limit || selectedEvent.maximum_capacity);
                    const isPacked = progressRatio >= 1.0;

                    return (
                      <div 
                        key={session.id}
                        onClick={(e) => openEditModal(e, session)}
                        className="bg-brand-slate/40 border border-brand-card p-4 rounded-xl space-y-3 relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-violet"></div>
                        
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-bold text-accent-blue uppercase tracking-widest font-mono">
                            {session.track_name}
                          </span>
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => openEditModal(e, session)}
                              className="p-1 rounded-lg bg-brand-dark/50 border border-brand-card text-slate-400"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, session.id)}
                              className="p-1 rounded-lg bg-brand-dark/50 border border-brand-card text-slate-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-white leading-snug">
                          {session.session_title}
                        </h4>

                        {session.session_description && (
                          <p className="text-xs text-brand-muted line-clamp-2">
                            {session.session_description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-4 text-[10px] font-mono text-slate-400 pt-1">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-accent-blue" />
                            <span>
                              {new Date(session.session_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(session.session_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <User className="w-3.5 h-3.5 text-accent-violet" />
                            <span>
                              {speaker ? `${speaker.first_name} ${speaker.last_name}` : 'TBA Speaker'}
                            </span>
                          </div>
                        </div>

                        {/* Seating limit bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[9px] font-bold font-mono text-[#9ca3af]">
                            <span>SEATING CAPACITY</span>
                            <span className={isPacked ? 'text-status-danger font-extrabold' : 'text-status-success font-extrabold'}>
                              {session.event_attendees_count} / {session.session_capacity_limit || 'UNLIMITED'}
                            </span>
                          </div>
                          <div className="h-1 w-full bg-[#1f2937] rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isPacked ? 'bg-status-danger' : 'bg-status-success'}`}
                              style={{ width: `${Math.min(100, (progressRatio * 100) || 0)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

          </div>
        )}

      </div>

      {/* SESSION CREATION & ASSIGNMENT DIALOG MODAL (Task 1 to 10) */}
      {isModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center`}>
          
          {/* 1. Macro-backdrop overlay & Scroll Lock (Task 1 & 3) */}
          <div 
            className={`fixed inset-0 bg-[#020306]/75 backdrop-blur-[24px] modal-overlay ${
              isModalActive && !isModalExiting ? 'active' : ''
            } ${isModalExiting ? 'exit' : ''}`}
            onClick={handleCloseModal}
          ></div>

          {/* 2. Glassmorphic Modal Card Housing / Mobile Drawer Morphing (Task 2, 3 & 10) */}
          <div 
            ref={modalRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              transform: touchMoveY > 0 ? `translateY(${touchMoveY}px)` : undefined,
              maxHeight: '90vh'
            }}
            className={`w-full max-w-[640px] bg-[#111827]/50 backdrop-blur-[16px] border border-transparent rounded-[24px] shadow-2xl p-6 mx-4 z-10 flex flex-col overflow-hidden modal-card ${
              isModalActive && !isModalExiting ? 'active' : ''
            } ${isModalExiting ? 'exit' : ''}`}
          >
            {/* Ambient Top lighting path */}
            <div className="absolute left-0 right-0 top-0 h-[1.5px] bg-gradient-to-r from-accent-violet/30 via-accent-blue/20 to-transparent"></div>

            {/* Mobile Drag Indicator Handle (Task 10) */}
            <div className="md:hidden flex justify-center pb-2 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-slate-600/50"></div>
            </div>

            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/5 shrink-0">
              <h3 className="text-xl font-bold text-white tracking-tight">
                {modalMode === 'create' ? 'Orchestrate New Session' : 'Modify Session Settings'}
              </h3>
              
              {/* Circular close button (Task 4) */}
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-full bg-[#111827]/50 border border-white/10 hover:bg-slate-700/50 text-slate-400 hover:text-white transition outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Modal Internal Scrollable Body */}
            <div className="flex-1 overflow-y-auto timeline-scrollbar py-4 pr-1 text-xs space-y-4 min-h-0">
              
              {/* Dynamic Error Alerts and Conflict Banners (Task 5, 8 & 9) */}
              {submitError && (
                <div className="bg-status-danger/10 border border-status-danger/30 text-status-danger p-3 rounded-xl flex items-center space-x-2 animate-pulse">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{submitError}</span>
                </div>
              )}

              {temporalError && (
                <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] p-3 rounded-xl flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{temporalError}</span>
                </div>
              )}

              {collisionWarning && !temporalError && (
                <div className="bg-status-warning/10 border border-status-warning/30 text-status-warning p-3 rounded-xl flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">{collisionWarning}</span>
                </div>
              )}

              <form onSubmit={handleSaveSession} className="space-y-4">
                
                {/* Session Topic Title field with custom floating labels (Task 4) */}
                <div className="floating-group">
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    placeholder=" "
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="floating-input"
                  />
                  <label className="floating-label">Session Topic Title</label>
                </div>

                {/* Description textarea */}
                <div className="floating-group">
                  <textarea
                    disabled={isSubmitting}
                    placeholder=" "
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="floating-input h-16 resize-none"
                  />
                  <label className="floating-label">Brief Description paradigms...</label>
                </div>

                {/* Chronological Dual Inputs (Task 5) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-400 uppercase tracking-wider text-[9px] font-mono">Session Start Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      disabled={isSubmitting}
                      value={formStart}
                      onChange={(e) => setFormStart(e.target.value)}
                      className={`w-full bg-brand-dark border focus:outline-none rounded-xl py-2.5 px-3.5 text-white font-mono ${
                        temporalError ? 'border-status-danger' : 'border-white/10 focus:border-accent-violet'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-400 uppercase tracking-wider text-[9px] font-mono">Session End Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      disabled={isSubmitting}
                      value={formEnd}
                      onChange={(e) => setFormEnd(e.target.value)}
                      className={`w-full bg-brand-dark border focus:outline-none rounded-xl py-2.5 px-3.5 text-white font-mono ${
                        temporalError ? 'border-status-danger' : 'border-white/10 focus:border-accent-violet'
                      }`}
                    />
                  </div>
                </div>

                {/* Asymmetric 2-column dropdown grid (Task 4, 6) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Searchable Track Selection Matrix (Task 6) */}
                  <div className="space-y-1 relative" ref={trackDropdownRef}>
                    <label className="block font-bold text-slate-400 uppercase tracking-wider text-[9px] font-mono">Track / Virtual Room</label>
                    <div 
                      onClick={() => !isSubmitting && setIsTrackDropdownOpen(!isTrackDropdownOpen)}
                      className="bg-brand-dark border border-white/10 hover:border-white/20 rounded-xl py-2.5 px-3.5 text-white cursor-pointer flex justify-between items-center"
                    >
                      <span className="truncate">{formTrack || 'Select Track'}</span>
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    </div>

                    {isTrackDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-[#090d16] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-48">
                        <div className="p-2 border-b border-white/5 bg-[#111827]/50 sticky top-0">
                          <input 
                            type="text"
                            placeholder="Filter track list..."
                            value={trackSearch}
                            onChange={(e) => setTrackSearch(e.target.value)}
                            className="w-full bg-brand-dark border border-white/10 focus:outline-none focus:border-accent-violet rounded-lg p-1.5 text-[11px] text-white"
                          />
                        </div>
                        <div className="overflow-y-auto timeline-scrollbar flex-1">
                          {filteredTracks.map((t, idx) => (
                            <div 
                              key={idx}
                              onClick={() => {
                                setFormTrack(t);
                                setIsTrackDropdownOpen(false);
                              }}
                              className="px-3.5 py-2 hover:bg-accent-violet/10 text-white cursor-pointer flex justify-between items-center"
                            >
                              <span>{t}</span>
                              {formTrack === t && <Check className="w-3.5 h-3.5 text-accent-blue" />}
                            </div>
                          ))}
                          <div 
                            onClick={() => {
                              if (trackSearch.trim() && !uniqueTracks.includes(trackSearch.trim())) {
                                setFormTrack(trackSearch.trim());
                                setIsTrackDropdownOpen(false);
                              }
                            }}
                            className="px-3.5 py-2 hover:bg-accent-violet/10 text-slate-400 border-t border-white/5 cursor-pointer italic"
                          >
                            + Custom Track: "{trackSearch || 'Type track name'}"
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Searchable Speaker Selection Matrix (Task 6) */}
                  <div className="space-y-1 relative" ref={speakerDropdownRef}>
                    <label className="block font-bold text-slate-400 uppercase tracking-wider text-[9px] font-mono">Speaker Assignment</label>
                    <div 
                      onClick={() => !isSubmitting && setIsSpeakerDropdownOpen(!isSpeakerDropdownOpen)}
                      className="bg-brand-dark border border-white/10 hover:border-white/20 rounded-xl py-2.5 px-3.5 text-white cursor-pointer flex justify-between items-center"
                    >
                      <span className="truncate">
                        {activeSpeakerProfile ? `${activeSpeakerProfile.first_name} ${activeSpeakerProfile.last_name}` : 'TBA / No Speaker'}
                      </span>
                      <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    </div>

                    {isSpeakerDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-[#090d16] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-48">
                        <div className="p-2 border-b border-white/5 bg-[#111827]/50 sticky top-0">
                          <input 
                            type="text"
                            placeholder="Search speaker registry..."
                            value={speakerSearch}
                            onChange={(e) => setSpeakerSearch(e.target.value)}
                            className="w-full bg-brand-dark border border-white/10 focus:outline-none focus:border-accent-violet rounded-lg p-1.5 text-[11px] text-white"
                          />
                        </div>
                        <div className="overflow-y-auto timeline-scrollbar flex-1">
                          <div 
                            onClick={() => {
                              setFormSpeaker('');
                              setIsSpeakerDropdownOpen(false);
                            }}
                            className="px-3.5 py-2 hover:bg-accent-violet/10 text-[#9ca3af] cursor-pointer"
                          >
                            TBA / No Speaker
                          </div>
                          {filteredSpeakers.map(p => (
                            <div 
                              key={p.id}
                              onClick={() => {
                                setFormSpeaker(p.id);
                                setIsSpeakerDropdownOpen(false);
                              }}
                              className="px-3.5 py-2 hover:bg-accent-violet/10 text-white cursor-pointer flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-2.5">
                                <div className="w-6 h-6 rounded-full bg-brand-card flex items-center justify-center border border-white/10 text-slate-400 overflow-hidden font-bold text-[9px]">
                                  {p.first_name[0]}
                                </div>
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-white">{p.first_name} {p.last_name}</p>
                                  <span className="text-[9px] text-slate-500 font-mono block">{p.platform_role}</span>
                                </div>
                              </div>
                              {formSpeaker === p.id && <Check className="w-3.5 h-3.5 text-accent-blue" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Seating Capacity constraints sector (Task 7) */}
                <div className="bg-brand-dark/45 border border-white/5 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <p className="font-bold text-white text-[11px]">Enforce Seating Limit Constraints</p>
                      <span className="text-brand-muted text-[10px]">Turn on capacity check filters to block overbooking.</span>
                    </div>
                    
                    {/* Toggle switch */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setEnforceCapacity(!enforceCapacity)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        enforceCapacity ? 'bg-status-success' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          enforceCapacity ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Increment triggers visually expand */}
                  {enforceCapacity && (
                    <div className="flex items-center space-x-3 pt-2 animate-slide-in">
                      <span className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider font-mono">Maximum Capacity limit:</span>
                      
                      <div className="flex items-center space-x-1.5 relative max-w-[150px]">
                        <button
                          type="button"
                          onClick={decrementCapacity}
                          className="p-2 rounded-lg bg-brand-dark border border-white/10 hover:border-white/20 text-slate-400 hover:text-white"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          required={enforceCapacity}
                          disabled={isSubmitting}
                          min="1"
                          value={formCapacity}
                          onChange={(e) => setFormCapacity(Math.max(1, parseInt(e.target.value, 10) || ''))}
                          className="w-16 bg-brand-dark border border-white/10 rounded-lg py-1.5 text-center text-white font-mono focus:outline-none focus:border-accent-violet"
                        />
                        <button
                          type="button"
                          onClick={incrementCapacity}
                          className="p-2 rounded-lg bg-brand-dark border border-white/10 hover:border-white/20 text-slate-400 hover:text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary submit action trigger */}
                <div className="pt-2 flex justify-end space-x-2 border-t border-white/5">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleCloseModal}
                    className="px-4 py-2.5 rounded-xl bg-brand-card hover:bg-brand-card/80 text-slate-300 font-semibold transition outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className={`px-5 py-2.5 rounded-xl text-white font-semibold shadow-md flex items-center space-x-2 transition duration-200 outline-none ${
                      submitSuccess 
                        ? 'bg-status-success' 
                        : isFormValid 
                          ? 'bg-gradient-to-r from-accent-violet to-accent-blue hover:opacity-90' 
                          : 'bg-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Transmitting...</span>
                      </>
                    ) : submitSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Scheduled!</span>
                      </>
                    ) : (
                      <span>Initialize Session</span>
                    )}
                  </button>
                </div>

              </form>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Events;
