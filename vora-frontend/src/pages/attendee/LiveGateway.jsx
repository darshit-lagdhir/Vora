import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ArrowLeft, 
  Maximize, 
  Minimize, 
  Send, 
  Users, 
  Clock, 
  Tv, 
  MessageSquare,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import apiClient from '../../services/apiClient.js';
import { toast } from '../../components/ui/Toast.jsx';
import useRealTimeSync from '../../hooks/useRealTimeSync.js';

export default function LiveGateway() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core Gateway States
  const [event, setEvent] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [upvotedQuestions, setUpvotedQuestions] = useState(new Set());
  
  // UI Interactive States
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showControlBar, setShowControlBar] = useState(true);
  const [isConcluded, setIsConcluded] = useState(false);
  
  // Custom Transport States
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(40);

  // Live Telemetry States
  const [viewerCount, setViewerCount] = useState(128);
  const [timeLeft, setTimeLeft] = useState('00:00:00');
  const [questionText, setQuestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileTab, setIsMobileTab] = useState('video'); // 'video' or 'qa' on mobile

  const qaEndRef = useRef(null);

  const [votedOption, setVotedOption] = useState(null);

  // SSE Unidirectional connection hook
  const {
    syncState,
    activePoll,
    presenceList,
    globalOverride,
    isReconciling
  } = useRealTimeSync(id, async () => {
    // Reconcile snapshot state reload
    await loadInitialData();
  });

  // Reset local vote selection on new poll launch
  useEffect(() => {
    setVotedOption(null);
  }, [activePoll?.question]);

  // Vote payload dispatcher
  const handleVote = async (optionIndex) => {
    setVotedOption(optionIndex);
    try {
      await apiClient.post(`/api/v1/events/${id}/polls/vote`, { optionIndex });
      toast('Vote registered successfully.', 'success');
    } catch (err) {
      console.error('[LiveGateway] Vote registration failed:', err);
      setVotedOption(null);
      toast('Failed to register vote.', 'error');
    }
  };

  // 1. Fetch Event & Questions details on mount, and start REST polling
  const loadInitialData = async () => {
    try {
      const eventRes = await apiClient.get(`/api/v1/events/${id}`);
      if (eventRes.data?.success) {
        const evData = eventRes.data.data;
        setEvent(evData);
        if (evData.status === 'completed' || evData.status === 'cancelled') {
          setIsConcluded(true);
        }
      }
    } catch (err) {
      console.error('[LiveGateway] Failed to retrieve event details:', err);
    }

    try {
      const qaRes = await apiClient.get(`/api/v1/events/${id}/questions`);
      if (qaRes.data?.success) {
        setQuestions(qaRes.data.data || []);
      }
    } catch (err) {
      console.error('[LiveGateway] Failed to retrieve questions:', err);
    }
  };

  useEffect(() => {
    loadInitialData();

    // REST Polling interval: queries event status and Q&A matrix every 10 seconds
    const pollInterval = setInterval(async () => {
      if (syncState === 'CONNECTED') return; // Bypass REST polling when Server-Sent Events stream is active
      try {
        // Poll event status
        const eventRes = await apiClient.get(`/api/v1/events/${id}`);
        if (eventRes.data?.success) {
          const evData = eventRes.data.data;
          setEvent(prev => {
            if (evData.status !== prev?.status) {
              if (evData.status === 'completed' || evData.status === 'cancelled') {
                setIsConcluded(true);
              }
            }
            return evData;
          });
        }

        // Poll Q&A questions list
        const qaRes = await apiClient.get(`/api/v1/events/${id}/questions`);
        if (qaRes.data?.success) {
          const freshQs = qaRes.data.data || [];
          
          setQuestions(prev => {
            // Check if lists are identical to prevent rendering updates
            const prevIds = prev.map(q => q.id).join(',');
            const freshIds = freshQs.map(q => q.id).join(',');
            
            const prevVotes = prev.map(q => q.upvotes).join(',');
            const freshVotes = freshQs.map(q => q.upvotes).join(',');

            if (prevIds !== freshIds || prevVotes !== freshVotes) {
              return freshQs;
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('[LiveGateway] Polling failure:', err.message);
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [id]);

  // 2. Control Bar auto-hiding logic
  useEffect(() => {
    let hideTimer;
    
    const resetTimer = () => {
      setShowControlBar(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        // Auto-hide unless cursor remains inside top 20% of viewport
        setShowControlBar(false);
      }, 3000);
    };

    const handleMouseMove = (e) => {
      const topBoundary = window.innerHeight * 0.20;
      if (e.clientY <= topBoundary) {
        resetTimer();
      } else {
        // Hide immediately if they move deep into the viewport
        setShowControlBar(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hideTimer);
    };
  }, []);

  // 3. Live Viewer simulated organic fluctuation
  useEffect(() => {
    const timer = setInterval(() => {
      setViewerCount(prev => {
        const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
        return Math.max(8, prev + delta);
      });
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  // 4. Live monospaced Countdown clock calculations
  useEffect(() => {
    if (!event?.end_timestamp) return;

    const calcTime = () => {
      const difference = new Date(event.end_timestamp) - new Date();
      if (difference <= 0) {
        setTimeLeft('00:00:00');
      } else {
        const hrs = String(Math.floor(difference / (1000 * 60 * 60))).padStart(2, '0');
        const mins = String(Math.floor((difference / 1000 / 60) % 60)).padStart(2, '0');
        const secs = String(Math.floor((difference / 1000) % 60)).padStart(2, '0');
        setTimeLeft(`${hrs}:${mins}:${secs}`);
      }
    };

    calcTime();
    const clockTimer = setInterval(calcTime, 1000);

    return () => clearInterval(clockTimer);
  }, [event]);

  // 5. Ingest new question Optimistically
  const handleSendQuestion = async (e) => {
    e.preventDefault();
    if (questionText.trim().length < 10 || isConcluded) return;

    const text = questionText.trim();
    setQuestionText('');
    setIsSubmitting(true);

    const tempId = crypto.randomUUID();
    const tempQuestion = {
      id: tempId,
      event_id: id,
      attendee_name: `${user?.firstName || 'User'} ${user?.lastName || ''}`.trim() || 'Attendee',
      question_text: text,
      upvotes: 0,
      created_at: new Date().toISOString(),
      isOptimistic: true
    };

    // Optimistic UI insert: prepend new questions
    setQuestions(prev => [tempQuestion, ...prev]);

    try {
      const response = await apiClient.post(`/api/v1/events/${id}/questions`, {
        question_text: text
      });
      if (response.data?.success) {
        // Swap local optimistic question with actual returned DB row
        setQuestions(prev => prev.map(q => q.id === tempId ? response.data.data : q));
        toast('Question submitted successfully.', 'success');
      }
    } catch (err) {
      console.error('[LiveGateway] Question ingestion failed, rolling back:', err);
      // Rollback optimistic state
      setQuestions(prev => prev.filter(q => q.id !== tempId));
      toast('Failed to submit question. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Optimistic Q&A Upvote incrementor
  const handleUpvote = async (qId) => {
    if (upvotedQuestions.has(qId) || isConcluded) return;

    setUpvotedQuestions(prev => new Set(prev).add(qId));
    const previousState = [...questions];

    // Optimistic UI state increment
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return { ...q, upvotes: q.upvotes + 1 };
      }
      return q;
    }).sort((a, b) => b.upvotes - a.upvotes || new Date(b.created_at) - new Date(a.created_at)));

    try {
      await apiClient.post(`/api/v1/events/${id}/questions/${qId}/upvote`);
    } catch (err) {
      console.error('[LiveGateway] Upvote registration failed, rolling back:', err);
      setQuestions(previousState);
      setUpvotedQuestions(prev => {
        const next = new Set(prev);
        next.delete(qId);
        return next;
      });
      toast('Failed to register upvote.', 'error');
    }
  };

  // 7. Route glides returning to Attendee Dashboard
  const handleLeaveSession = () => {
    navigate('/attendee');
  };

  // 8. Dynamic video transport mute toggle
  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (isMuted && volume === 0) {
      setVolume(30);
    }
  };

  const currentSpeaker = event?.organizer_first_name 
    ? `${event.organizer_first_name} ${event.organizer_last_name || ''}`.trim() 
    : 'Featured Platform Speaker';

  // Construct simulated unlisted embed video stream URL (defaults to a high-quality clean developer webcast loop)
  const embedUrl = `https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&showinfo=0&rel=0&modestbranding=1&enablejsapi=1&iv_load_policy=3&playlist=jfKfPfyJRdk`;

  return (
    <div className="w-screen h-screen min-h-screen bg-zinc-950 text-white overflow-hidden relative flex flex-col font-sans select-none">
      {/* ─── TASK 5: GLOBAL OVERRIDE BANNER ─── */}
      <AnimatePresence>
        {globalOverride && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 25 }}
            className="fixed top-0 inset-x-0 h-16 bg-gradient-to-r from-red-650 via-primary-600 to-indigo-600 z-[99] flex items-center justify-center px-6 shadow-2xl overflow-hidden"
          >
            {/* Pulsing SVG wave background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <motion.path
                  animate={{
                    d: [
                      "M0,160L80,186.7C160,213,320,267,480,250.7C640,235,800,149,960,117.3C1120,85,1280,107,1360,117.3L1440,128L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z",
                      "M0,192L80,176C160,160,320,128,480,144C640,160,800,224,960,229.3C1120,235,1280,181,1360,154.7L1440,128L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z",
                      "M0,160L80,186.7C160,213,320,267,480,250.7C640,235,800,149,960,117.3C1120,85,1280,107,1360,117.3L1440,128L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
                    ]
                  }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                  fill="#ffffff"
                />
              </svg>
            </div>
            
            <div className="flex items-center gap-3 relative z-10 select-text">
              <span className="font-display font-extrabold text-white text-xs sm:text-sm tracking-wider uppercase text-center leading-none">
                {globalOverride.message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TASK 6: STATE RECONCILIATION OVERLAY ─── */}
      <AnimatePresence>
        {isReconciling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md select-none"
          >
            <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col items-center space-y-4 max-w-xs text-center backdrop-blur-xl">
              <svg
                className="animate-spin h-6 w-6 text-primary-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <div>
                <h4 className="text-xs font-semibold text-white font-sans uppercase tracking-wider">
                  Network Reconnected
                </h4>
                <p className="text-[10px] text-zinc-400 font-sans mt-1 leading-relaxed">
                  Network interrupted. Synchronizing live telemetry...
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── SENSOR FOR CONTROL BAR HOVER ─── */}
      <div 
        className="fixed top-0 left-0 right-0 h-4 z-40 cursor-n-resize"
        onMouseEnter={() => setShowControlBar(true)}
      />

      {/* ─── TASK 1: THE AUTO-HIDING CONTROL BAR ─── */}
      <motion.div
        id="control-bar"
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: showControlBar ? 0 : -64, opacity: showControlBar ? 1 : 0 }}
        style={{ top: globalOverride ? '64px' : '0px' }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed inset-x-0 h-16 bg-gradient-to-b from-black/95 via-black/70 to-transparent flex items-center justify-between px-6 z-50 select-none transition-all duration-300"
      >
        <button
          id="btn-leave-session"
          onClick={handleLeaveSession}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5 font-sans uppercase tracking-wider outline-none cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Leave Session</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-display font-extrabold tracking-[-0.04em] text-sm uppercase mr-2 text-white">
            Vora
          </span>
          <span className="font-accent text-[9px] font-bold text-zinc-500 tracking-[0.05em] uppercase border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 rounded-full select-none">
            THEATER MODE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-theater-focus"
            onClick={() => setIsFocusMode(!isFocusMode)}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 p-2.5 rounded-full border border-white/5 font-sans outline-none cursor-pointer"
            title={isFocusMode ? "Show Q&A Panel" : "Hide Q&A Panel (Focus)"}
          >
            {isFocusMode ? <Maximize className="w-4 h-4" /> : <Minimize className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>

      {/* ─── RESPONSIVE TAB BAR FOR MOBILE VIEWPORTS ─── */}
      <div className="lg:hidden flex border-b border-white/5 bg-zinc-900/40 backdrop-blur-xl h-12 shrink-0 pt-2 z-35">
        <button
          onClick={() => setIsMobileTab('video')}
          className={`flex-1 text-center font-accent text-xs font-bold uppercase tracking-wider border-b-2 pb-2 transition-all border-none bg-transparent cursor-pointer ${
            isMobileTab === 'video' ? 'text-primary-400 border-primary-500' : 'text-zinc-500 border-transparent'
          }`}
        >
          Webcast stage
        </button>
        <button
          onClick={() => setIsMobileTab('qa')}
          className={`flex-1 text-center font-accent text-xs font-bold uppercase tracking-wider border-b-2 pb-2 transition-all border-none bg-transparent cursor-pointer ${
            isMobileTab === 'qa' ? 'text-primary-400 border-primary-500' : 'text-zinc-500 border-transparent'
          }`}
        >
          Audience Q&A
        </button>
      </div>

      {/* ─── MACRO-VIEWPORT CONTENT STAGE ─── */}
      <div className="flex flex-1 w-full h-[calc(100vh-64px)] overflow-hidden relative flex-col lg:flex-row">
        
        {/* ─── LEFT PORTION: VIDEO STAGE & METADATA ─── */}
        <motion.div
          layout
          transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
          className={`h-full flex flex-col p-4 sm:p-6 overflow-y-auto ${
            isMobileTab !== 'video' ? 'hidden lg:flex' : 'flex'
          } ${
            isFocusMode ? 'w-full lg:w-full' : 'w-full lg:w-[calc(100%-360px)]'
          }`}
        >
          {/* Main Stage Grid Centerer */}
          <div className="flex-grow flex flex-col justify-center max-w-5xl mx-auto w-full space-y-6">
            
            {/* ─── TASK 2: THE SOFT-GLASS VIDEO WRAPPER ─── */}
            <div className="relative w-full rounded-2xl bg-black border border-white/10 aspect-ratio: 16/9 aspect-[16/9] shadow-glow overflow-hidden group">
              
              <AnimatePresence mode="wait">
                {!isConcluded ? (
                  <motion.div
                    key="webcast-player"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="w-full h-full relative"
                  >
                    {/* Native Iframe embed */}
                    <iframe
                      src={embedUrl}
                      title="Live Webcast Player Stream"
                      className="w-full h-full border-none absolute inset-0 pointer-events-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />

                    {/* Edge Immersion Masking Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40 pointer-events-none border border-white/5 rounded-2xl shadow-inner" />

                    {/* ─── CUSTOM TRANSPORT LAYER OVERLAY ─── */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between z-30 select-none backdrop-blur-sm">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="text-zinc-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer outline-none"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>

                        <button
                          onClick={handleMuteToggle}
                          className="text-zinc-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer outline-none"
                        >
                          {isMuted ? <VolumeX className="w-5 h-5 text-primary-400" /> : <Volume2 className="w-5 h-5" />}
                        </button>

                        {/* Custom Volume Track Slider */}
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-20 h-1 bg-zinc-700 rounded-full relative cursor-pointer group/vol"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const clickX = e.clientX - rect.left;
                              const pct = Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 100)));
                              setVolume(pct);
                              if (pct > 0) setIsMuted(false);
                            }}
                          >
                            <div 
                              className="absolute top-0 left-0 h-full bg-primary-500 rounded-full" 
                              style={{ width: `${isMuted ? 0 : volume}%` }}
                            />
                            <div 
                              className="absolute top-1/2 w-2 h-2 bg-white rounded-full -translate-y-1/2 shadow-md opacity-0 group-hover/vol:opacity-100 transition-opacity"
                              style={{ left: `calc(${isMuted ? 0 : volume}% - 4px)` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold font-technical text-zinc-400 uppercase tracking-widest px-2.5 py-1 bg-zinc-900 border border-white/5 rounded-md">
                          1080p stream
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  // ─── TASK 5: EDITORIAL CONCLUDED EMPTY STATE ───
                  <motion.div
                    key="concluded-splash"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-6 text-center select-none relative"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.06)_0%,transparent_65%)] pointer-events-none" />
                    
                    <div className="space-y-4 max-w-md z-10">
                      <div className="inline-flex p-3 rounded-full bg-zinc-900/60 border border-white/5 text-zinc-500 mb-2">
                        <Tv className="w-8 h-8 text-zinc-500" />
                      </div>
                      
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] text-white font-display uppercase leading-tight">
                        Broadcast Concluded
                      </h2>
                      
                      <p className="text-zinc-500 text-xs sm:text-sm font-sans leading-relaxed max-w-sm mx-auto">
                        Thank you for attending this virtual session. The live feed has been terminated by the organizer. You can now access all conference files.
                      </p>

                      <div className="pt-4">
                        <button
                          id="btn-access-vault"
                          onClick={() => navigate(`/event/${id}/vault`)}
                          className="flex items-center gap-2 px-6 py-3.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold font-form text-xs tracking-wider uppercase transition-all shadow-lg shadow-primary-600/35 hover:-translate-y-0.5 active:translate-y-0 border-none cursor-pointer outline-none mx-auto"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Access Post-Event Resource Vault</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ─── TASK 4: METADATA RIBBON & TELEMETRY CLUSTER ─── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-white/5 pt-5 gap-4 select-none">
              
              {/* Left Side: Session Title Info */}
              <div className="text-left">
                <span className="text-[9px] font-bold text-primary-400 uppercase tracking-widest font-technical">
                  active session
                </span>
                <h1 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight leading-tight mt-1 line-clamp-1">
                  {event?.title || 'Vora Webcast Stream'}
                </h1>
                <p className="text-xs text-zinc-400 font-sans mt-0.5">
                  Hosted by <strong className="text-zinc-200 font-semibold">{currentSpeaker}</strong>
                </p>
              </div>

              {/* Right Side: Telemetry Metrics */}
              <div className="flex items-center gap-6 shrink-0 flex-wrap sm:flex-nowrap">
                
                {/* 1. Pulse LIVE indicator */}
                <div className="flex items-center gap-4">
                  {!isConcluded ? (
                    <div className="flex items-center">
                      <motion.span
                        animate={{ scale: [1, 1.25, 1], opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="w-2 h-2 rounded-full bg-rose-500 mr-2 shrink-0"
                      />
                      <span className="font-accent text-[9px] font-bold text-rose-400 uppercase tracking-widest leading-none">
                        LIVE BROADCAST
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-zinc-600 mr-2 shrink-0" />
                      <span className="font-accent text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
                        SESSION CONCLUDED
                      </span>
                    </div>
                  )}

                  {/* Microscopic connection indicator dot and text */}
                  {!isConcluded && (
                    <div className="flex items-center gap-1.5 border border-white/5 bg-zinc-950/60 rounded-full px-2.5 py-1">
                      <span 
                        className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                          syncState === 'CONNECTED'
                            ? 'bg-primary-500 shadow-[0_0_8px_theme(colors.primary.500)]'
                            : syncState === 'RECONNECTING'
                            ? 'bg-amber-500 animate-pulse'
                            : 'bg-zinc-850'
                        }`} 
                      />
                      <span className="font-technical text-[9px] font-semibold text-zinc-400 tracking-wider">
                        {syncState === 'CONNECTED' ? 'SYNC: ACTIVE' : 'SYNC: RECONNECTING'}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Simulated Viewer count */}
                {!isConcluded && (
                  <div className="flex items-center gap-1.5 font-technical text-xs font-medium text-zinc-300">
                    <Users className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span>
                      <span className="font-semibold text-white">{viewerCount}</span> attending
                    </span>
                  </div>
                )}

                {/* 3. Temporal Telemetry countdown */}
                <div className="flex items-center gap-1.5 font-technical text-xs font-medium text-zinc-300">
                  <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span className="tracking-widest font-bold">
                    {timeLeft}
                  </span>
                </div>

              </div>

            </div>

            {/* ─── TASK 3: THE LIVE AUDIENCE PRESENCE TRACK ─── */}
            {!isConcluded && presenceList && presenceList.length > 0 && (
              <div className="pt-4 border-t border-white/5 text-left">
                <span className="text-[9px] font-accent font-bold tracking-widest text-zinc-550 block uppercase mb-2">
                  CONNECTED AUDIENCE ({presenceList.length})
                </span>
                <div className="flex items-center overflow-x-auto hide-scrollbar select-none py-1">
                  <div className="flex -space-x-2.5">
                    <AnimatePresence mode="popLayout">
                      {presenceList.map((attendee) => {
                        const initials = `${attendee.firstName?.[0] || ''}${attendee.lastName?.[0] || ''}`.toUpperCase() || '?';
                        return (
                          <motion.div
                            key={attendee.id}
                            layout
                            initial={{ opacity: 0, scale: 0.5, x: 20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.5, x: -20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center text-[10px] font-accent font-bold text-zinc-300 shadow-lg shrink-0 cursor-help"
                            title={`${attendee.firstName} ${attendee.lastName}`}
                          >
                            {initials}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}

          </div>
        </motion.div>

        {/* ─── RIGHT PORTION: TASK 3: THE Q&A INTERACTION MATRIX ─── */}
        <AnimatePresence>
          {!isFocusMode && (
            <motion.div
              id="qa-sidebar"
              initial={{ x: 360, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 360, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
              className={`w-full lg:w-[360px] h-full bg-zinc-900/40 backdrop-blur-xl border-l border-white/5 flex flex-col z-10 shrink-0 ${
                isMobileTab !== 'qa' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* Q&A Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary-400" />
                  <span className="font-accent font-bold uppercase tracking-wider text-xs text-white">
                    Live Audience Q&A
                  </span>
                </div>
                <span className="font-technical text-[9px] bg-zinc-950 border border-white/5 rounded-full px-2.5 py-0.5 text-zinc-400">
                  {questions.length} questions
                </span>
              </div>

              {/* ─── TASK 4: INTERACTIVE LIVE POLL MATRIX ─── */}
              <AnimatePresence>
                {activePoll && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, y: -20 }}
                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="p-4 border-b border-white/5 bg-zinc-950/45 backdrop-blur-md relative overflow-hidden shrink-0"
                  >
                    {/* Pulsing primary-colored border */}
                    <div className="absolute inset-0 border border-primary-500/20 rounded-none pointer-events-none animate-pulse" />
                    
                    <div className="space-y-3 relative z-10 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-accent text-[9px] font-extrabold text-primary-400 uppercase tracking-widest">
                          LIVE AUDIENCE POLL
                        </span>
                        <span className="font-technical text-[8px] bg-primary-600/10 border border-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                          ACTIVE
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-white font-sans leading-relaxed">
                        {activePoll.question}
                      </h3>

                      <div className="space-y-2.5 pt-1">
                        {votedOption === null ? (
                          // Vote Selection buttons
                          activePoll.options.map((option, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleVote(idx)}
                              className="w-full text-left p-3 bg-zinc-900/40 hover:bg-zinc-900/80 border border-white/5 hover:border-primary-500/25 rounded-xl text-xs font-form font-semibold text-zinc-350 hover:text-white transition-all outline-none cursor-pointer"
                            >
                              {option}
                            </button>
                          ))
                        ) : (
                          // Real-Time Results visualization Progress bars
                          activePoll.options.map((option, idx) => {
                            const voteCount = activePoll.votes?.[idx] || 0;
                            const percentage = activePoll.percentages?.[idx] || 0;
                            const isUserVote = votedOption === idx;
                            
                            return (
                              <div key={idx} className="space-y-1.5 font-sans">
                                <div className="flex justify-between items-baseline text-[11px]">
                                  <span className={`font-semibold ${isUserVote ? 'text-primary-400 font-bold' : 'text-zinc-400'}`}>
                                    {option} {isUserVote && <span className="text-[9px] font-mono text-primary-500/80 uppercase tracking-widest ml-1">(Your Vote)</span>}
                                  </span>
                                  <span className="font-technical text-zinc-300 font-bold">
                                    {percentage}% <span className="text-zinc-550 font-normal text-[9px]">({voteCount})</span>
                                  </span>
                                </div>
                                
                                {/* Horizontal Progress Track fill */}
                                <div className="w-full h-2 bg-zinc-900 border border-white/5 rounded-full overflow-hidden relative">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                    className={`h-full rounded-full ${
                                      isUserVote ? 'bg-primary-500' : 'bg-zinc-700'
                                    }`}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {votedOption !== null && (
                        <div className="text-[9px] font-technical text-zinc-550 pt-2 flex justify-between">
                          <span>Total votes: {activePoll.totalVotes}</span>
                          <span>Real-time updates active</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scrollable Questions stream */}
              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                <AnimatePresence initial={false}>
                  {questions.length === 0 ? (
                    <motion.div
                      key="empty-questions"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 select-none"
                    >
                      <Sparkles className="w-6 h-6 text-zinc-650 mb-2" />
                      <p className="text-xs font-sans">No questions asked yet.</p>
                      <p className="text-[10px] text-zinc-600 mt-1 max-w-[20ch]">Be the first to submit a query to the presenter!</p>
                    </motion.div>
                  ) : (
                    questions.map((q) => {
                      const isUpvoted = upvotedQuestions.has(q.id);
                      return (
                        <motion.div
                          key={q.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 450, damping: 30 }}
                          className={`p-3.5 bg-zinc-900/35 border border-white/5 rounded-2xl flex items-start justify-between gap-3 relative overflow-hidden group ${
                            q.isOptimistic ? 'opacity-60 border-primary-500/20' : ''
                          }`}
                        >
                          <div className="space-y-1.5 text-left">
                            <span className="text-[10px] font-sans font-medium text-zinc-500 block truncate max-w-[200px]">
                              {q.attendee_name}
                            </span>
                            <p className="text-xs text-white leading-relaxed font-form font-normal whitespace-pre-wrap break-words pr-1">
                              {q.question_text}
                            </p>
                          </div>

                          {/* Upvote button matrix */}
                          <button
                            id={`btn-upvote-${q.id}`}
                            onClick={() => handleUpvote(q.id)}
                            disabled={isUpvoted || isConcluded || q.isOptimistic}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-lg border border-white/5 transition-all outline-none shrink-0 cursor-pointer ${
                              isUpvoted 
                                ? 'bg-primary-600/15 border-primary-500/25 text-primary-400' 
                                : 'bg-zinc-950/40 hover:bg-zinc-900 text-zinc-400 hover:text-white'
                            }`}
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M4 14h6v8h4v-8h6L12 4 4 14z"/>
                            </svg>
                            <span className="font-technical text-[9px] font-bold mt-1 tracking-tighter">
                              {q.upvotes}
                            </span>
                          </button>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
                <div ref={qaEndRef} />
              </div>

              {/* Ingestion console console */}
              <div className="p-4 border-t border-white/5 shrink-0 bg-zinc-950/20 select-none">
                <form onSubmit={handleSendQuestion} className="space-y-2 relative">
                  <div className="relative">
                    <textarea
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      placeholder={isConcluded ? "Q&A is now closed." : "Ask a question..."}
                      disabled={isConcluded || isSubmitting}
                      rows={2}
                      className="w-full bg-zinc-950/60 border border-white/5 hover:border-white/10 focus:border-primary-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 outline-none resize-none font-form transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-sans text-zinc-500">
                      {isConcluded ? "Closed" : "Min 10 characters"}
                    </span>
                    
                    <button
                      id="btn-submit-question"
                      type="submit"
                      disabled={questionText.trim().length < 10 || isConcluded || isSubmitting}
                      className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-[10px] font-bold font-form uppercase tracking-wider transition-all border-none outline-none ${
                        questionText.trim().length >= 10 && !isConcluded && !isSubmitting
                          ? 'bg-primary-600 hover:bg-primary-500 text-white cursor-pointer shadow-lg shadow-primary-600/10'
                          : 'bg-zinc-900 text-zinc-500 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {isSubmitting ? (
                        <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <>
                          <span>Send</span>
                          <Send className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
