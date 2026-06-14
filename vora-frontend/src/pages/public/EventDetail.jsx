import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import apiClient from '../../services/apiClient.js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ArrowLeft, 
  AlertCircle, 
  Award, 
  RefreshCw, 
  Mail, 
  Phone, 
  Users,
  ShieldCheck,
  Check
} from 'lucide-react';
import Heading from '../../components/ui/Heading.jsx';
import Text from '../../components/ui/Text.jsx';
import NavBar from '../../components/layout/NavBar.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import SEOMatrix from '../../components/ui/SEOMatrix.jsx';
import ProgressiveImage from '../../components/ui/ProgressiveImage.jsx';



// ─── HIGH-FIDELITY ACADEMIC FALLBACK DATA ───
const FALLBACK_EVENT = {
  title: 'Vora Inaugural Summit 2026',
  description: 'The premier virtual gathering of developers, creators, and organizers to shape the future of immersive online events. Dive into workshops, networking lounges, and technical keynotes mapping the absolute limits of frontend and backend design architectures.',
  start_timestamp: '2026-06-25T18:00:00Z',
  end_timestamp: '2026-06-26T22:00:00Z',
  maximum_capacity: 1000,
  registrants: 142,
  banner_image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
  venue: 'Vora Technical Pavilion, SF & Streaming Worldwide',
  organizer_name: 'Vora Core Infrastructure Team',
  tags: ['Summit', 'Developer', 'Vora']
};

const FALLBACK_SESSIONS = [
  {
    id: 'fallback-s1',
    session_title: 'Opening Keynote: Next-Generation Virtual Architectures',
    session_description: 'Exploring zero-latency real-time data flow pipelines, decentralized credential systems, and next-generation browser compilation structures for global scales.',
    session_start_time: '2026-06-25T18:00:00Z',
    session_end_time: '2026-06-25T19:30:00Z',
    track_name: 'Main Stage',
    speaker_first_name: 'Ava',
    speaker_last_name: 'Chen',
    speaker_avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    speaker_role: 'Principal Research Lead'
  },
  {
    id: 'fallback-s2',
    session_title: 'React 19 Compiler Deep Dive',
    session_description: 'Unlocking structural optimizations, auto-memoization profiles, Server Component hydration strategies, and asynchronous state transition models.',
    session_start_time: '2026-06-25T20:00:00Z',
    session_end_time: '2026-06-25T21:30:00Z',
    track_name: 'Developer Track A',
    speaker_first_name: 'Marcus',
    speaker_last_name: 'Aurelius',
    speaker_avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    speaker_role: 'Lead Core Developer'
  }
];

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core Data States
  const [event, setEvent] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [attendeesCount, setAttendeesCount] = useState(0);
  const [attendeeIds, setAttendeeIds] = useState([]);
  
  // Registration tracking states
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState(null);

  // UI state control
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [hoveredSessionId, setHoveredSessionId] = useState(null);

  // Fetch Event details and Check registration status
  const loadData = async () => {
    setIsLoading(true);
    setApiError(false);
    try {
      // 1. Fetch Event Row details (includes registrants subquery count)
      const eventRes = await apiClient.get(`/api/v1/events/${id}`);
      if (eventRes.data?.success) {
        const eventData = eventRes.data.data;
        setEvent(eventData);
        setAttendeesCount(parseInt(eventData.registrants, 10) || 0);
      } else {
        throw new Error('API returned unsuccessful status');
      }

      // 2. Fetch Associated Sessions
      try {
        const sessionsRes = await apiClient.get(`/api/v1/events/${id}/sessions`);
        if (sessionsRes.data?.success) {
          setSessions(sessionsRes.data.data || []);
        } else {
          setSessions(FALLBACK_SESSIONS);
        }
      } catch (sessErr) {
        console.warn('[EventDetail] Failed to load event sessions, using fallback decks.', sessErr);
        setSessions(FALLBACK_SESSIONS);
      }

      // 3. Check Attendee Registration Status (using GET registrations filter)
      if (user && user.role === 'attendee') {
        try {
          const regRes = await apiClient.get(`/api/v1/registrations?event_id=${id}`);
          if (regRes.data?.success) {
            const list = regRes.data.data || [];
            setAttendeeIds(list.map(r => r.attendee_id));
            if (list.length > 0) {
              setIsRegistered(true);
            } else {
              setIsRegistered(false);
            }
          }
        } catch (regErr) {
          console.error('[EventDetail] Failed to verify user registration roster:', regErr);
        }
      }
    } catch (err) {
      console.warn('[EventDetail] Failed to query API backend event data. Loading mock presentation fallbacks.', err);
      // If error is a strict 404, we trigger the error boundary
      if (err.response?.status === 404) {
        setApiError(true);
      } else {
        setEvent(FALLBACK_EVENT);
        setAttendeesCount(FALLBACK_EVENT.registrants);
        setAttendeeIds([]);
        setSessions(FALLBACK_SESSIONS);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, user]);

  // Execute authenticated registration check-out mutation (POST relation binding)
  const handleRegistration = async () => {
    if (isRegistered) {
      navigate(`/event/${id}/live`);
      return;
    }

    if (!user) {
      // Guest Redirect flow to sign-in gateway
      navigate(`/auth?redirect=/event/${id}`);
      return;
    }

    if (user.role !== 'attendee') {
      setRegistrationError('Only attendee accounts can register for events.');
      return;
    }

    setIsRegistering(true);
    setRegistrationError(null);

    const previousCount = attendeesCount;
    const previousRegistered = isRegistered;
    const previousIds = attendeeIds;

    // Optimistically update registration status and count
    setAttendeesCount(prev => prev + 1);
    setIsRegistered(true);
    if (user.id) {
      setAttendeeIds(prev => [...prev, user.id]);
    }

    try {
      // Execute the mapped endpoint
      const response = await apiClient.post(`/api/v1/events/${id}/register`, {});
      
      if (response.data?.success) {
        // Trigger the global Toast notification
        toast('Seat Confirmed. Check your dashboard for event access links.', 'success');
      } else {
        throw new Error('API returned invalid success signature.');
      }
    } catch (err) {
      console.error('[EventDetail] Registration transaction failed:', err);
      // Rollback optimistic states
      setAttendeesCount(previousCount);
      setIsRegistered(previousRegistered);
      setAttendeeIds(previousIds);
      const serverMsg = err.response?.data?.message || err.message || 'Checkout failed. Please try again.';
      setRegistrationError(serverMsg);
    } finally {
      setIsRegistering(false);
    }
  };

  // Group sessions by Day dynamically
  const groupedSessions = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    
    const groups = {};
    sessions.forEach(session => {
      const startVal = session.session_start_time || session.start_timestamp;
      const dateStr = new Date(startVal).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(session);
    });

    return Object.keys(groups).map(day => ({
      dayLabel: day,
      items: groups[day].sort((a, b) => new Date(a.session_start_time) - new Date(b.session_start_time))
    }));
  }, [sessions]);

  // Extract unique speakers lineup list
  const speakerLineup = useMemo(() => {
    const registry = new Set();
    const list = [];
    
    sessions.forEach(s => {
      if (!s.speaker_first_name && !s.speaker_last_name) return;
      const fullName = `${s.speaker_first_name} ${s.speaker_last_name}`;
      if (!registry.has(fullName)) {
        registry.add(fullName);
        list.push({
          name: fullName,
          role: s.speaker_role || 'Tech Lead Speaker',
          avatar: s.speaker_avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${fullName}`
        });
      }
    });

    return list;
  }, [sessions]);

  const maxCapacity = event ? (parseInt(event.maximum_capacity, 10) || 100) : 100;
  const isFull = event ? (attendeesCount >= maxCapacity) : false;

  // Resolve Button States: 'unauthenticated', 'ready', 'success', 'locked'
  const buttonState = useMemo(() => {
    if (!user) return 'unauthenticated';
    if (isRegistered) return 'success';
    if (isFull) return 'locked';
    return 'ready';
  }, [user, isRegistered, isFull]);

  // Formatting date functions
  const formatHeroDate = (start, end) => {
    if (!start) return '';
    const dStart = new Date(start);
    const dEnd = new Date(end);
    const startStr = dStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const endStr = dEnd.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' });
    return `${startStr} — ${endStr}`;
  };

  const formatSessionTime = (timeStr) => {
    if (!timeStr) return '';
    return new Date(timeStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // ─── RENDER: SKELETON LOADER STATE ───
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col text-white font-sans overflow-x-hidden relative">
        <NavBar />
        
        {/* Hero pulse */}
        <div className="w-full h-[75vh] bg-zinc-950 relative flex flex-col justify-end p-12 overflow-hidden select-none">
          {/* Radial glow background in skeleton */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[80vh] bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.08)_0%,rgba(9,9,11,0)_60%)] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto w-full space-y-6 z-10 text-left">
            <div className="h-6 bg-zinc-900 rounded-full w-32 animate-pulse" />
            <div className="h-16 bg-zinc-900 rounded-2xl w-3/4 animate-pulse" />
            <div className="h-5 bg-zinc-900 rounded w-1/2 animate-pulse" />
          </div>
        </div>

        {/* Content columns pulse */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 w-full">
          {/* Left Column Prose Skeleton */}
          <div className="lg:col-span-8 space-y-6 text-left">
            <div className="h-7 bg-zinc-900 rounded-lg w-1/3 animate-pulse" />
            <div className="space-y-3 pt-4">
              <div className="h-4 bg-zinc-900 rounded w-full animate-pulse" />
              <div className="h-4 bg-zinc-900 rounded w-[95%] animate-pulse" />
              <div className="h-4 bg-zinc-900 rounded w-[90%] animate-pulse" />
              <div className="h-4 bg-zinc-900 rounded w-[97%] animate-pulse" />
              <div className="h-4 bg-zinc-900 rounded w-[85%] animate-pulse" />
              <div className="h-4 bg-zinc-900 rounded w-[80%] animate-pulse" />
            </div>
          </div>
          
          {/* Right Column Sidebar Matrix Skeleton */}
          <div className="lg:col-span-4">
            <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-8 h-80 animate-pulse space-y-6 relative">
              <div className="h-3 bg-zinc-800 rounded w-1/4 animate-pulse" />
              <div className="h-8 bg-zinc-850 rounded w-2/3 animate-pulse" />
              <div className="h-[6px] bg-zinc-950 rounded-full w-full animate-pulse" />
              <div className="h-12 bg-zinc-850 rounded-xl w-full mt-6 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: 404 FALLBACK STATE ───
  if (apiError || !event) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white font-sans text-center select-none relative overflow-hidden">
        {/* Soft radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <NavBar />
        
        <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-3xl p-8 sm:p-12 max-w-md w-full shadow-2xl flex flex-col items-center space-y-6 relative">
          <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/10 to-transparent rounded-t-3xl" />
          
          <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-650 shadow-inner">
            {/* Custom empty calendar with a diagonal line (broken) */}
            <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" stroke="#f43f5e" strokeWidth="1.5" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <Heading level="h2" className="text-2xl font-bold tracking-tight text-white font-display">Event Not Found</Heading>
            <p className="text-xs text-zinc-500 font-sans leading-relaxed max-w-xs mx-auto">
              The virtual event you are attempting to access does not exist, or the registration period has permanently concluded.
            </p>
          </div>
          
          <Link to="/" className="w-full">
            <button className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold font-form py-4 rounded-xl shadow-xl shadow-primary-600/35 hover:shadow-primary-600/50 transition-all cursor-pointer border-none outline-none text-xs tracking-wider uppercase">
              Explore Upcoming Events
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const getButtonStyles = () => {
    switch (buttonState) {
      case 'unauthenticated':
        return 'bg-transparent border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700 cursor-pointer';
      case 'ready':
        return 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-600/35 cursor-pointer';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/35 cursor-pointer';
      case 'locked':
        return 'bg-zinc-800 text-zinc-500 cursor-not-allowed pointer-events-none';
      default:
        return '';
    }
  };

  const getButtonText = () => {
    switch (buttonState) {
      case 'unauthenticated':
        return 'Sign in to Register';
      case 'ready':
        return 'Register for Virtual Event';
      case 'success':
        return 'Enter Live Broadcast Room';
      case 'locked':
        return isFull ? 'Capacity Reached' : 'Registration Full';
      default:
        return '';
    }
  };

  const percentFilled = Math.min(100, Math.round((attendeesCount / maxCapacity) * 100));

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-x-hidden relative">
      
      {/* SEO metadata and structured JSON-LD schema injection */}
      <SEOMatrix 
        title={event.title}
        description={event.description}
        image={event.banner_image_url}
        type="article"
        articleData={{
          title: event.title,
          startDate: event.start_timestamp,
          endDate: event.end_timestamp,
          organizerName: event.organizer_name || `${event.organizer_first_name || 'Vora'} ${event.organizer_last_name || 'Organizer'}`,
          price: "0.00"
        }}
      />

      {/* Floating pill NavBar */}
      <NavBar />

      {/* ─── SECTION 1: CINEMATIC HERO VIEWPORT ─── */}
      <section className="relative h-[75vh] flex flex-col justify-end overflow-hidden pb-12 sm:pb-20 pt-32 w-full select-none bg-zinc-950">
        
        {/* Procedural radial bloom background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[80vh] bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.12)_0%,rgba(9,9,11,0)_60%)] pointer-events-none" />
          {/* Gradient Bleed Mask */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none" />
        </div>

        {/* Identity Foreground text */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full text-left">
          
          {/* Sub-brand status badge */}
          <span className="font-accent text-[9px] font-bold text-emerald-400 uppercase tracking-[-0.05em] mb-4 inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isFull ? 'CAPACITY FULL' : 'REGISTRATION OPEN'}</span>
          </span>

          <Heading level="h1" className="text-4xl sm:text-5xl md:text-8xl font-extrabold text-white tracking-[-0.04em] leading-[0.9] max-w-4xl font-display">
            {event.title}
          </Heading>

          {/* Temporal horizontal metadata row */}
          <div className="text-zinc-400 text-xs sm:text-sm mt-6 flex flex-wrap items-center gap-4 font-medium font-sans">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>{formatHeroDate(event.start_timestamp, event.end_timestamp)}</span>
            </div>
            <span className="text-primary-500 font-bold font-sans">•</span>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>{new Date(event.start_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Local</span>
            </div>
            <span className="text-primary-500 font-bold font-sans">•</span>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>{event.venue || 'Virtual Webinar Room'}</span>
            </div>
          </div>

        </div>

      </section>

      {/* ─── SECTION 2: EDITORIAL CONTENT GRID ─── */}
      <section className="bg-zinc-950 border-t border-white/5 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          
          {/* Left Column: Rich Prose Narrative */}
          <div className="lg:col-span-8 flex flex-col text-left space-y-8">
            <div className="space-y-4">
              <Heading level="h2" className="text-xl font-bold tracking-tight text-white font-accent mb-4">
                About This Virtual Event
              </Heading>
              
              <p className="text-md sm:text-base leading-relaxed text-zinc-400 font-sans font-normal max-w-[68ch]">
                {event.description}
              </p>

              <div className="space-y-6 text-zinc-400 leading-relaxed text-sm font-sans max-w-[68ch]">
                <p>
                  Prepare to immerse yourself in keynotes and workshops hosted by principal developers pushing structural frameworks to dynamic ranges. This conference acts as the focal interface where builders, managers, and security architects compile critical design parameters governing low-latency web synchronization.
                </p>
                <p>
                  Attendees gain full access to private GitHub repositories, download nodes, and networking forums to integrate these modular libraries directly into their workspaces. Expand your technical horizon and align with real-time optimization trends.
                </p>
              </div>
            </div>

            {/* Academic highlights blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-10 select-none">
              <div className="p-6 bg-zinc-900/20 border border-white/5 rounded-2xl flex items-start gap-4">
                <Award className="w-6 h-6 text-primary-400 mt-1 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white font-display">Credential Validation</h4>
                  <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed font-sans">
                    Includes digital entrance ticket wallets, secure JWT checking profiles, and custom seat verification vouchers.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-zinc-900/20 border border-white/5 rounded-2xl flex items-start gap-4">
                <RefreshCw className="w-6 h-6 text-primary-400 mt-1 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white font-display">Resource Distribution</h4>
                  <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed font-sans">
                    Post-event files shared securely. Organizers can upload and share slide presentations, citation packages, and webinar transcripts.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Floating Registration Matrix */}
          <div className="lg:col-span-4">
            <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-3xl p-6 sm:p-8 lg:sticky lg:top-24 flex flex-col text-left shadow-2xl relative overflow-hidden">
              
              {/* Overhead bright border highlight */}
              <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/20 via-primary-500/10 to-transparent rounded-t-3xl" />

              {/* ─── SECTION 3: CAPACITY READOUT ─── */}
              <div className="space-y-1 select-none">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] font-accent block">
                  CAPACITY
                </span>
                
                {/* Geist massive tabular numbers display */}
                <div className="text-3xl font-bold text-white font-technical tracking-tight mt-1 select-none">
                  {attendeesCount} / {maxCapacity}
                </div>

                {/* Progress bar with Framer Motion fluid 800ms animation */}
                <div className="w-full h-[6px] bg-zinc-950 rounded-full border border-white/5 mt-4 overflow-hidden relative">
                  <motion.div 
                    className="h-full bg-primary-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentFilled}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>

              {/* Error messages during transaction process */}
              {registrationError && (
                <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-xs text-red-400 font-sans leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{registrationError}</span>
                </div>
              )}

              {/* ─── CTAs (REGISTRATION ENGINE STATES) ─── */}
              <div className="mt-8">
                <motion.button
                  type="button"
                  layout
                  onClick={handleRegistration}
                  disabled={buttonState === 'locked' || isRegistering}
                  whileHover={buttonState === 'ready' || buttonState === 'success' ? { scale: 1.02 } : {}}
                  whileTap={buttonState === 'ready' || buttonState === 'success' ? { scale: 0.98 } : {}}
                  className={`w-full py-4 rounded-xl font-form font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden outline-none border-none ${getButtonStyles()}`}
                >
                  <AnimatePresence mode="wait">
                    {isRegistering ? (
                      <motion.div
                        key="spinner"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                          <path className="opacity-85" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </motion.div>
                    ) : (
                      <motion.span
                        key={buttonState}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-2"
                      >
                        {buttonState === 'success' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                        {getButtonText()}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>

              {/* Extra logistics alerts */}
              <div className="pt-6 border-t border-zinc-850 mt-6 select-none">
                <div className="flex items-start gap-2.5 text-[10px] font-medium font-mono text-zinc-500 bg-zinc-950/40 p-3 rounded-xl border border-zinc-850">
                  <ShieldCheck className="w-4 h-4 text-zinc-650 shrink-0 mt-0.5" />
                  <span>Valid JWT token is required for route verification. Ticket codes generated automatically on check-out.</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ─── SPEAKER DECK MATRIX ─── */}
      {speakerLineup.length > 0 && (
        <section className="bg-zinc-950 border-t border-zinc-900 py-16 lg:py-24 select-none relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="space-y-2 mb-12 text-left">
              <span className="text-xs font-bold text-primary-400 uppercase tracking-widest font-mono">Presenters Deck</span>
              <Heading level="h2" className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                Featured Speakers
              </Heading>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {speakerLineup.map((speaker, idx) => (
                <div 
                  key={idx}
                  className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-white/10 transition-all duration-300"
                >
                  <ProgressiveImage 
                    src={speaker.avatar} 
                    alt={speaker.name}
                    aspectClass="aspect-[4/5]"
                    className="w-full h-full"
                    imgClassName="grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent pointer-events-none" />
                  
                  <div className="absolute bottom-0 left-0 w-full p-6 text-left translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <h4 className="text-base font-bold font-display text-white">{speaker.name}</h4>
                    <p className="text-[10px] text-primary-400 font-sans mt-1">{speaker.role}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>
      )}

      {/* ─── SCHEDULE TIMELINE ─── */}
      {groupedSessions.length > 0 && (
        <section className="bg-zinc-950 border-t border-zinc-900 py-16 lg:py-24 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 text-left select-none">
              <div className="space-y-2">
                <span className="text-xs font-bold text-primary-400 uppercase tracking-widest font-mono">Schedules Timeline</span>
                <Heading level="h2" className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                  Conference Program
                </Heading>
              </div>

              {groupedSessions.length > 1 && (
                <div className="flex items-center space-x-6 overflow-x-auto pb-2 scrollbar-none font-display">
                  {groupedSessions.map((group, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveDayIdx(idx)}
                      className={`text-2xl sm:text-3xl font-bold tracking-tight pb-1 border-b-2 cursor-pointer transition-all ${
                        activeDayIdx === idx 
                          ? 'text-white border-primary-500' 
                          : 'text-zinc-650 hover:text-zinc-400 border-transparent'
                      }`}
                    >
                      {group.dayLabel}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col font-sans text-left">
              {groupedSessions[activeDayIdx]?.items.map((session) => {
                const isHovered = hoveredSessionId === session.id;
                const isDimmed = hoveredSessionId !== null && !isHovered;
                
                return (
                  <div 
                    key={session.id}
                    onMouseEnter={() => setHoveredSessionId(session.id)}
                    onMouseLeave={() => setHoveredSessionId(null)}
                    className={`grid grid-cols-[100px_1fr] sm:grid-cols-[150px_1fr] gap-4 sm:gap-8 py-8 border-b border-white/5 group transition-all duration-300 ${
                      isDimmed ? 'opacity-45 scale-[0.99]' : 'opacity-100 scale-100'
                    }`}
                  >
                    
                    {/* Start Time label */}
                    <div className="text-zinc-450 font-semibold font-mono tracking-tighter text-sm group-hover:text-primary-400 transition-colors pt-1 shrink-0 select-none">
                      {formatSessionTime(session.session_start_time)}
                    </div>

                    {/* Timeline session descriptions */}
                    <div className="flex flex-col">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h3 className="text-lg text-white font-medium font-display group-hover:text-primary-300 transition-colors">
                          {session.session_title}
                        </h3>
                        <span className="text-[9px] bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded text-zinc-550 font-mono font-medium select-none uppercase tracking-wider">
                          {session.track_name}
                        </span>
                      </div>
                      
                      {(session.speaker_first_name || session.speaker_last_name) && (
                        <p className="text-xs text-zinc-500 mt-1.5 font-medium select-none font-sans">
                          Led by <span className="text-zinc-300 font-semibold">{session.speaker_first_name} {session.speaker_last_name}</span>
                          {session.speaker_role && <span className="text-zinc-500"> ({session.speaker_role})</span>}
                        </p>
                      )}

                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mt-4 max-w-3xl font-sans">
                        {session.session_description}
                      </p>

                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </section>
      )}

    </div>
  );
}
