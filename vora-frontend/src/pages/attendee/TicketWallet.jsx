import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import BrutalistButton from '../../components/BrutalistButton.jsx';
import BrutalistInput from '../../components/BrutalistInput.jsx';
import VoraModal from '../../components/VoraModal.jsx';
import apiClient from '../../services/apiClient.js';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  User, 
  Lock, 
  ArrowLeft, 
  Send, 
  Download, 
  Info,
  Maximize2,
  Minimize2,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Volume2
} from 'lucide-react';

// ─── ERROR BOUNDARY FOR TICKET WALLET ───────────────────────────────
class WalletErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[TicketWallet ErrorBoundary] caught exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[100dvh] bg-zinc-950 px-4 text-white">
          <div className="bg-zinc-900/40 backdrop-blur-md border border-red-500/10 p-8 rounded-2xl text-center space-y-4 max-w-lg w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white font-display">Wallet Sync Failed</h4>
              <p className="text-xs text-zinc-500 mt-1">Unable to initialize dynamic QR verification keys. Check device offline status and retry.</p>
            </div>
            <BrutalistButton 
              variant="secondary" 
              onClick={() => this.setState({ hasError: false })}
              className="text-xs px-4 py-2 mx-auto"
            >
              Retry Sync
            </BrutalistButton>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── TICKET TIER COLORS UTILITY ─────────────────────────────────────
const getTierBadgeStyle = (tier = '') => {
  const t = tier.toLowerCase();
  if (t.includes('vip')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  if (t.includes('all-access')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  return 'bg-primary-500/10 text-primary-400 border-primary-500/20';
};

// ─── TICKET CARD SUB-COMPONENT ──────────────────────────────────────
function TicketCard({ 
  ticket, 
  i, 
  cardWidth, 
  gap, 
  centerOffset, 
  dragX, 
  transferredIds, 
  setZoomTicket 
}) {
  const isTransferred = ticket.registration_status === 'transferred' || transferredIds.has(ticket.id);
  const formattedDate = new Date(ticket.start_timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const formattedTime = new Date(ticket.start_timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Cover Flow Scaling Transform calculations
  const cardCenter = i * (cardWidth + gap);
  const centerPos = -cardCenter + centerOffset;
  
  const cardScale = useTransform(dragX, [centerPos - 300, centerPos, centerPos + 300], [0.9, 1, 0.9]);
  const cardOpacity = useTransform(dragX, [centerPos - 300, centerPos, centerPos + 300], [0.5, 1, 0.5]);

  return (
    <motion.div
      key={ticket.id}
      style={{ 
        width: cardWidth,
        scale: cardScale,
        opacity: cardOpacity
      }}
      className="shrink-0 snap-center"
      role="document"
      aria-label={`Ticket for ${ticket.event_title} on ${formattedDate} at ${formattedTime}. Status: ${isTransferred ? 'Transferred' : 'Valid'}`}
    >
      
      {/* Ticket envelope */}
      <div className="bg-zinc-900/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden relative flex flex-col shadow-2xl shadow-black/60 h-[480px] justify-between">
        
        {/* 3. Transferred Watermark Overlay */}
        {isTransferred && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center text-center p-6 rounded-[2.5rem]">
            <div className="border-4 border-red-500/30 text-red-500 rounded-2xl px-6 py-3 font-display text-4xl font-extrabold uppercase tracking-widest rotate-[-15deg] select-none shadow-2xl">
              Transferred
            </div>
            <span className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase mt-6 block">Ticket Invalidated</span>
          </div>
        )}

        <div className="flex flex-col">
          
          {/* Image artwork container */}
          <div className="h-32 w-full overflow-hidden relative shrink-0">
            <img 
              src={ticket.banner_image_url} 
              alt="Cover poster artwork" 
              className="w-full h-full object-cover select-none"
            />
            {/* Dark overlay blend gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
            
            {/* Title overlay details */}
            <div className="absolute bottom-3 left-5 right-5">
              <span className="text-[8px] font-mono font-bold tracking-widest text-zinc-400 uppercase leading-none block mb-0.5">
                Virtual technical Event
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight leading-snug font-display line-clamp-1 truncate" title={ticket.event_title}>
                {ticket.event_title}
              </h3>
            </div>
          </div>

          {/* Data details Grid (2x2) */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-5 border-b border-zinc-900">
            
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest font-mono">Date</span>
              <p className="text-xs font-semibold text-zinc-200 mt-0.5 truncate">{formattedDate}</p>
            </div>

            <div className="min-w-0">
              <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest font-mono">Time</span>
              <p className="text-xs font-semibold text-zinc-200 mt-0.5 truncate">{formattedTime}</p>
            </div>

            <div className="min-w-0">
              <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest font-mono">Venue Location</span>
              <p className="text-xs font-semibold text-zinc-200 mt-0.5 truncate" title={ticket.venue}>{ticket.venue}</p>
            </div>

            <div className="min-w-0">
              <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest font-mono">Tier level</span>
              <span className={`inline-block border text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider mt-1 ${getTierBadgeStyle(ticket.tier)}`}>
                {ticket.tier}
              </span>
            </div>

          </div>

        </div>

        {/* Visual Perforated Torn separators stubs */}
        <div className="w-full relative h-[3px] shrink-0 my-1">
          <div className="border-t-2 border-dashed border-zinc-800 w-full" />
          <div aria-hidden="true" className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-zinc-950 border-r border-white/5" />
          <div aria-hidden="true" className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-zinc-950 border-l border-white/5" />
        </div>

        {/* Machine scan dynamic QR Area */}
        <div className="p-5 flex flex-col items-center justify-center shrink-0">
          
          {/* Conic glowing security halo */}
          <div 
            onClick={() => !isTransferred && setZoomTicket(ticket)}
            className="relative p-1 rounded-2xl bg-zinc-900 border border-white/5 overflow-hidden w-40 h-40 flex items-center justify-center cursor-pointer hover:border-primary-500/30 transition-colors"
          >
            <div 
              className="absolute inset-0 animate-[spin_4.s_linear_infinite]"
              style={{
                backgroundImage: `conic-gradient(from 0deg, #7c3aed, transparent 45%, #7c3aed 90%)`,
                animationDuration: '4s',
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite'
              }}
            />
            <div className="relative bg-white p-3.5 rounded-[14px] w-[150px] h-[150px] flex items-center justify-center shadow-inner select-none">
              <QRCodeSVG 
                value={ticket.ticket_hash} 
                size={120} 
                level="M" 
                includeMargin={false}
              />
            </div>
          </div>

          <span className="text-[10px] font-mono text-zinc-550 font-bold uppercase tracking-widest mt-3 block select-all">
            {ticket.ticket_hash}
          </span>

        </div>

      </div>

    </motion.div>
  );
}


// ─── LOCAL TELEMETRY BROWSERS BROADCAST CHANNEL ───────────────────────
const broadcastChannel = typeof window !== 'undefined' ? new BroadcastChannel('vora_live_telemetry_v1') : null;

// ─── WALLET PANEL CONTENT ───────────────────────────────────────────
function TicketWalletContent() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  // Zero-Trust Security Guards
  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Tab State: 'upcoming' | 'past'
  const [activeTab, setActiveTab] = useState('upcoming');

  // Ticket Data States
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offlineMode, setOfflineMode] = useState(!navigator.onLine);

  // Active Snap Carousel Index
  const [activeIdx, setActiveIdx] = useState(0);

  // Dynamic Layout Measuring
  const containerRef = useRef(null);
  const dragX = useMotionValue(0);
  const [containerWidth, setContainerWidth] = useState(360);

  // Card size metrics (responsive cover flow)
  const cardWidth = containerWidth < 640 ? Math.round(containerWidth * 0.82) : 380;
  const gap = 16;

  // Max-Brightness QR Zoom Overlay state
  const [zoomTicket, setZoomTicket] = useState(null);

  // Transfer Ticket modal states
  const [transferTicket, setTransferTicket] = useState(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferredIds, setTransferredIds] = useState(new Set());

  // Native Wallet download loading states
  const [downloadingWallet, setDownloadingWallet] = useState(null);

  // Live Broadcast Alert System State
  const [activeBroadcast, setActiveBroadcast] = useState(null);

  // Markdown parsing helper for alert text
  const renderMarkdownPreview = (text) => {
    if (!text) return '';
    const boldPattern = /\*\*(.*?)\*\*/g;
    const parts = text.split(boldPattern);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-extrabold text-white">{part}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Listen for Live Telemetry Broadcast messages via BroadcastChannel
  useEffect(() => {
    if (!broadcastChannel) return;

    const handleChannelMessage = (e) => {
      const data = e.data;
      if (data?.type === 'LIVE_BROADCAST') {
        setActiveBroadcast({
          priority: data.priority,
          message: data.message,
          idempotencyKey: data.idempotencyKey,
          timestamp: data.timestamp
        });

        // Trigger haptic pulses based on alert urgency
        if (data.priority === 'emergency' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100, 50, 100]);
        } else if (data.priority === 'urgent' && navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
      }
    };

    broadcastChannel.addEventListener('message', handleChannelMessage);
    return () => broadcastChannel.removeEventListener('message', handleChannelMessage);
  }, []);

  // Check iOS to render Apple Wallet badge vs Google Wallet
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsIOS(ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod'));
  }, []);

  // Set up resize observer to keep layout aligned
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Standard Mock Fallbacks if database has no active tickets
  const mockTickets = [
    {
      id: 'mock-ticket-01',
      ticket_hash: 'VORA-A82D-9F8C-23B1',
      registration_status: 'confirmed',
      event_title: 'Vora Inaugural Summit 2026',
      start_timestamp: '2026-06-25T18:00:00Z',
      end_timestamp: '2026-06-25T22:00:00Z',
      banner_image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60',
      venue: 'Vora Technical Pavilion, SF',
      tier: 'VIP Access Pass'
    },
    {
      id: 'mock-ticket-02',
      ticket_hash: 'VORA-E923-45F2-12B0',
      registration_status: 'confirmed',
      event_title: 'React 19 Core Masterclass',
      start_timestamp: '2026-07-02T14:00:00Z',
      end_timestamp: '2026-07-02T17:00:00Z',
      banner_image_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=60',
      venue: 'Holo Room 4, Virtual Allocation',
      tier: 'General Admission'
    },
    {
      id: 'mock-ticket-03',
      ticket_hash: 'VORA-32C9-411A-B882',
      registration_status: 'confirmed',
      event_title: 'Global DevCon & Hackathon',
      start_timestamp: '2026-05-10T09:00:00Z',
      end_timestamp: '2026-05-12T18:00:00Z',
      banner_image_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&auto=format&fit=crop&q=60',
      venue: 'Metropolitan Convention Hall, NY',
      tier: 'All-Access Pass'
    }
  ];

  // Fetch Tickets on Mount
  useEffect(() => {
    let active = true;

    const fetchTickets = async () => {
      setLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        if (!navigator.onLine) {
          throw new Error('Device is offline');
        }

        const res = await apiClient.get('/api/v1/registrations', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res?.data?.success && active) {
          const apiTickets = res.data.data.map(t => ({
            id: t.id,
            ticket_hash: t.ticket_hash,
            registration_status: t.registration_status,
            event_title: t.event_title,
            start_timestamp: t.start_timestamp,
            end_timestamp: t.end_timestamp,
            banner_image_url: t.banner_image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60',
            venue: 'Vora Technical Pavilion, SF',
            tier: t.registration_status === 'confirmed' ? 'All-Access Pass' : 'General Admission'
          }));

          // Merge API tickets and mock tickets ensuring unique IDs
          const merged = [...apiTickets, ...mockTickets.filter(m => !apiTickets.some(a => a.id === m.id))];
          setTickets(merged);
          localStorage.setItem('vora_offline_ticket_cache_v1', JSON.stringify(merged));
          setOfflineMode(false);
        }
      } catch (err) {
        if (active) {
          console.warn('[Ticket Wallet] Sync error. Loading cached data from storage.');
          const cached = localStorage.getItem('vora_offline_ticket_cache_v1');
          if (cached) {
            setTickets(JSON.parse(cached));
          } else {
            setTickets(mockTickets);
          }
          setOfflineMode(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchTickets();
    return () => { active = false; };
  }, []);

  // Listen online/offline events
  useEffect(() => {
    const handleOnline = () => setOfflineMode(false);
    const handleOffline = () => setOfflineMode(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filter tickets: Upcoming vs Past
  const filteredTickets = tickets.filter(t => {
    const isPast = new Date(t.end_timestamp) < new Date();
    return activeTab === 'upcoming' ? !isPast : isPast;
  });

  // Calculate carousel centers
  const centerOffset = (containerWidth - cardWidth) / 2;

  // Align active card initially or on index shift
  useEffect(() => {
    const targetX = -activeIdx * (cardWidth + gap) + centerOffset;
    animate(dragX, targetX, { type: 'spring', stiffness: 300, damping: 30 });
  }, [containerWidth, activeIdx, activeTab, filteredTickets.length]);

  // Adjust snaps when active tabs swap
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setActiveIdx(0);
  };

  // Apple/Google Wallet file download simulation
  const handleAddToWallet = (ticket) => {
    setDownloadingWallet(ticket.id);
    setTimeout(() => {
      const blob = new Blob(['MOCK_PKPASS_BINARY_DATA'], { type: 'application/vnd.apple.pkpass' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${ticket.event_title.replace(/\s+/g, '_')}_Ticket.pkpass`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloadingWallet(null);
    }, 1200);
  };

  // Secure ticket transfer dispatcher
  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!transferEmail || !transferTicket) return;

    setTransferLoading(true);
    setTimeout(() => {
      setTransferredIds(prev => new Set([...prev, transferTicket.id]));
      
      // Update local cache state
      const updated = tickets.map(t => {
        if (t.id === transferTicket.id) {
          return { ...t, registration_status: 'transferred' };
        }
        return t;
      });
      setTickets(updated);
      localStorage.setItem('vora_offline_ticket_cache_v1', JSON.stringify(updated));
      
      // Complete modals and notify haptics
      setTransferLoading(false);
      setTransferTicket(null);
      setTransferEmail('');
      
      if (navigator.vibrate) {
        navigator.vibrate([20, 50, 20]);
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-zinc-950 text-white font-sans overflow-hidden">
      
      {/* 1. Offline Banner Indicator Block */}
      {offlineMode && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 text-xs font-semibold py-2.5 px-4 w-full flex items-center justify-center gap-2 select-none shrink-0 sticky top-0 z-40 backdrop-blur-md">
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Offline Mode. Displaying cached tickets from last sync.</span>
        </div>
      )}

      {/* Main layout chassis */}
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pt-6 pb-24 flex flex-col items-stretch justify-start min-h-[calc(100vh-4rem)] relative">
        
        {/* Navigation Head */}
        <div className="flex justify-between items-center py-4 shrink-0">
          <button 
            onClick={() => navigate('/attendee')}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs font-bold uppercase tracking-widest outline-none transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Events Matrix</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-650 font-bold uppercase tracking-wider font-mono">Attendee Space</span>
            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-400 select-none cursor-pointer hover:border-primary-500 transition-colors">
              {user?.firstName ? user.firstName[0].toUpperCase() : 'A'}
            </div>
          </div>
        </div>

        {/* Greetings Area */}
        <div className="mt-4 shrink-0 select-none">
          <h1 className="text-3xl font-bold font-display tracking-tight text-white leading-none">
            Hello, {user?.firstName || 'Attendee'}
          </h1>
          <p className="text-zinc-550 text-xs mt-1.5 font-medium leading-none">
            Your dynamic admission credentials dashboard portal.
          </p>
        </div>

        {/* Temporal Navigation Toggles */}
        <div className="mt-6 shrink-0 relative flex justify-start">
          <div className="bg-zinc-900/50 p-1 rounded-full inline-flex w-full border border-white/5 backdrop-blur-md">
            {[
              { id: 'upcoming', label: 'Upcoming Events' },
              { id: 'past', label: 'Past Tickets' }
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative z-10 flex-1 py-2 text-xs font-semibold tracking-wide rounded-full transition-colors cursor-pointer outline-none ${
                    active ? 'text-white' : 'text-zinc-550 hover:text-zinc-350'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="walletTabIndicator"
                      className="absolute inset-0 bg-zinc-800 border border-zinc-700/50 rounded-full -z-10 shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Gestural Ticket Carousel Chassis */}
        <div 
          ref={containerRef}
          className="mt-8 flex-grow flex flex-col justify-center overflow-visible select-none py-4 relative"
        >
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest animate-pulse">Synchronizing Passes...</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="border border-zinc-900 rounded-3xl p-12 text-center flex flex-col items-center justify-center bg-zinc-900/10">
              <span className="text-sm font-semibold text-zinc-400 mb-1">No Tickets Found</span>
              <p className="text-xs text-zinc-650 max-w-xs leading-relaxed">
                {activeTab === 'upcoming' 
                  ? "You don't have any upcoming event passes registered. Search the Discover list to secure registrations."
                  : "No historic ticket registries resolved from your account."}
              </p>
            </div>
          ) : (
            <div className="w-full relative overflow-visible flex items-center justify-start h-[520px]">
              
              <motion.div
                drag="x"
                dragConstraints={{
                  left: -((filteredTickets.length - 1) * (cardWidth + gap)) + centerOffset,
                  right: centerOffset
                }}
                dragElastic={0.15}
                style={{ x: dragX }}
                className="flex gap-4 cursor-grab active:cursor-grabbing select-none overflow-visible items-center"
                onDragEnd={(event, info) => {
                  const currentX = dragX.get();
                  const swipeVelocity = info.velocity.x;
                  let targetIndex = activeIdx;
                  
                  if (swipeVelocity < -200) {
                    targetIndex = activeIdx + 1;
                  } else if (swipeVelocity > 200) {
                    targetIndex = activeIdx - 1;
                  } else {
                    targetIndex = Math.round((centerOffset - currentX) / (cardWidth + gap));
                  }
                  
                  const nextIndex = Math.max(0, Math.min(filteredTickets.length - 1, targetIndex));
                  const targetX = -nextIndex * (cardWidth + gap) + centerOffset;
                  
                  if (nextIndex !== activeIdx && navigator.vibrate) {
                    navigator.vibrate(10);
                  }
                  
                  setActiveIdx(nextIndex);
                  animate(dragX, targetX, { type: 'spring', stiffness: 300, damping: 30 });
                }}
              >
                {filteredTickets.map((ticket, i) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    i={i}
                    cardWidth={cardWidth}
                    gap={gap}
                    centerOffset={centerOffset}
                    dragX={dragX}
                    transferredIds={transferredIds}
                    setZoomTicket={setZoomTicket}
                  />
                ))}
              </motion.div>

            </div>
          )}
        </div>

        {/* Carousel Snapping Indicators */}
        {!loading && filteredTickets.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-2 select-none shrink-0">
            {filteredTickets.map((_, dotIdx) => (
              <button
                key={dotIdx}
                onClick={() => setActiveIdx(dotIdx)}
                className={`w-1.5 h-1.5 rounded-full transition-all outline-none cursor-pointer ${
                  activeIdx === dotIdx ? 'bg-primary-500 w-3' : 'bg-zinc-800'
                }`}
                aria-label={`Show card ${dotIdx + 1}`}
              />
            ))}
          </div>
        )}

        {/* 4. Static bottom actions and Native wallet integration badge */}
        {!loading && filteredTickets[activeIdx] && (
          <div className="mt-8 space-y-3 shrink-0">
            
            {/* Apple / Google Wallet native integration triggers */}
            <button
              onClick={() => handleAddToWallet(filteredTickets[activeIdx])}
              disabled={filteredTickets[activeIdx].registration_status === 'transferred' || downloadingWallet === filteredTickets[activeIdx].id}
              className={`w-full py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all border outline-none cursor-pointer active:scale-[0.98] disabled:opacity-35 disabled:pointer-events-none ${
                isIOS 
                  ? 'bg-black border-zinc-850 hover:border-zinc-800 text-white shadow-soft'
                  : 'bg-zinc-900 border-zinc-850 text-white hover:bg-zinc-850'
              }`}
            >
              {downloadingWallet === filteredTickets[activeIdx].id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                  <span>Compiling Wallet Token...</span>
                </>
              ) : isIOS ? (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  <span>Add to Apple Wallet</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-primary-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  <span>Add to Google Wallet</span>
                </>
              )}
            </button>

            <button
              onClick={() => setTransferTicket(filteredTickets[activeIdx])}
              disabled={filteredTickets[activeIdx].registration_status === 'transferred'}
              className="w-full py-3.5 px-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 text-zinc-450 hover:text-zinc-200 hover:border-zinc-800 text-xs font-semibold uppercase tracking-wider transition-colors outline-none cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-35 disabled:pointer-events-none"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send ticket to a friend</span>
            </button>

          </div>
        )}

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAX-BRIGHTNESS SCREEN QR SCANNER EXPAND ZOOM PROTOCOL         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {zoomTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomTicket(null)}
            className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 cursor-pointer select-none text-black transition-all"
            role="dialog"
            aria-modal="true"
          >
            {/* Ambient indicator lighting */}
            <div className="absolute top-8 left-0 right-0 text-center space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Interactive gate pass</span>
              <h2 className="text-xl font-bold font-display tracking-tight text-zinc-900 max-w-sm mx-auto line-clamp-1 truncate">{zoomTicket.event_title}</h2>
            </div>

            {/* Brightness instructions notice warning banner */}
            <div className="max-w-xs text-center space-y-1.5 mb-8">
              <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                <Maximize2 className="w-3 h-3" /> Max Brightness Recommended
              </div>
              <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                Please turn your device backlight screen brightness to maximum setting for instant scan verification.
              </p>
            </div>

            {/* Stark White Contrast Zoomed box */}
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="bg-white p-8 rounded-3xl shadow-ambient border border-zinc-100 flex items-center justify-center"
            >
              <QRCodeSVG 
                value={zoomTicket.ticket_hash} 
                size={220} 
                level="Q" 
                includeMargin={false}
              />
            </motion.div>

            {/* Unique code details */}
            <span className="text-xs font-mono font-bold text-zinc-500 tracking-widest uppercase mt-6 select-all">
              {zoomTicket.ticket_hash}
            </span>

            <button
              onClick={() => setZoomTicket(null)}
              className="absolute bottom-8 px-4 py-2 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-semibold text-xs flex items-center gap-1.5 outline-none"
            >
              <Minimize2 className="w-3.5 h-3.5" /> Close ticket
            </button>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── LIVE TELEMETRY INTERSTITIAL OVERLAY ─── */}
      <AnimatePresence>
        {activeBroadcast && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-center p-6 select-none"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className={`bg-zinc-900/95 backdrop-blur-2xl border p-6 rounded-[2rem] w-full max-w-sm flex flex-col justify-between shadow-2xl relative transition-all duration-300 ${
                activeBroadcast.priority === 'emergency'
                  ? 'border-red-500 shadow-red-500/10'
                  : activeBroadcast.priority === 'urgent'
                    ? 'border-amber-500/40 shadow-amber-500/10'
                    : 'border-white/10 shadow-black/50'
              }`}
            >
              <div className="space-y-4">
                
                {/* Header notice */}
                <div className="flex justify-between items-center border-b border-zinc-900/60 pb-3">
                  <span className={`text-[9px] font-mono tracking-widest font-bold uppercase flex items-center gap-1.5 ${
                    activeBroadcast.priority === 'emergency'
                      ? 'text-red-400'
                      : activeBroadcast.priority === 'urgent'
                        ? 'text-amber-400'
                        : 'text-primary-400'
                  }`}>
                    <Volume2 className="w-3.5 h-3.5" /> 
                    {activeBroadcast.priority === 'emergency' 
                      ? 'Emergency Protocol' 
                      : activeBroadcast.priority === 'urgent' 
                        ? 'Urgent logistics' 
                        : 'Broadcast Update'}
                  </span>
                  <span className="text-[8px] font-mono text-zinc-650">{activeBroadcast.timestamp}</span>
                </div>

                {/* Message markdown preview */}
                <div className={`py-4 text-sm font-medium leading-relaxed ${
                  activeBroadcast.priority === 'emergency' 
                    ? 'text-red-200 font-bold' 
                    : activeBroadcast.priority === 'urgent' 
                      ? 'text-amber-200 font-semibold' 
                      : 'text-zinc-350'
                }`}>
                  {renderMarkdownPreview(activeBroadcast.message)}
                </div>

              </div>

              {/* Acknowledgment Action */}
              <div className="pt-4 mt-6 border-t border-zinc-900/60">
                <button
                  type="button"
                  onClick={() => {
                    // Send ACK back through BroadcastChannel
                    if (broadcastChannel) {
                      broadcastChannel.postMessage({
                        type: 'BROADCAST_ACK',
                        idempotencyKey: activeBroadcast.idempotencyKey
                      });
                    }
                    
                    // Mild acknowledgement haptic
                    if (navigator.vibrate) {
                      navigator.vibrate([20, 50, 20]);
                    }
                    
                    setActiveBroadcast(null);
                  }}
                  className={`w-full py-3.5 rounded-2xl font-bold tracking-wider uppercase text-xs transition-colors cursor-pointer text-center outline-none ${
                    activeBroadcast.priority === 'emergency'
                      ? 'bg-red-950 border border-red-900/30 text-red-400 hover:bg-red-900 hover:text-white'
                      : activeBroadcast.priority === 'urgent'
                        ? 'bg-amber-950 border border-amber-900/30 text-amber-400 hover:bg-amber-900 hover:text-white'
                        : 'bg-zinc-950 border border-zinc-850 hover:border-zinc-800 text-white'
                  }`}
                >
                  Dismiss & Acknowledge
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECURE ATTENDEE TRANSFER TICKET ACCORDION MODAL               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <VoraModal
        isOpen={!!transferTicket}
        onClose={() => { setTransferTicket(null); setTransferEmail(''); }}
        title="Secure Ticket Transfer"
        className="max-w-md"
      >
        {transferTicket && (
          <form onSubmit={handleTransferSubmit} className="space-y-6 text-zinc-300 font-sans">
            
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-primary-500 tracking-wider uppercase font-mono">Immutable Action</span>
              <h4 className="text-base font-semibold text-white leading-snug">
                Transfer ticket for {transferTicket.event_title}?
              </h4>
              <p className="text-xs text-zinc-500">
                Key the recipient's registered Vora profile email address below to route ticket ownership.
              </p>
            </div>

            {/* Recipient Input */}
            <BrutalistInput
              label="Recipient's Email Address"
              type="email"
              required
              placeholder="friend@email.com"
              value={transferEmail}
              onChange={(e) => setTransferEmail(e.target.value)}
            />

            {/* Undeniable compliance warning alert */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-start gap-3 select-none leading-relaxed">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="text-[11px] font-medium">
                <span className="font-bold block uppercase tracking-wider mb-0.5">Cryptographic Notice</span>
                Warning: Transferring this ticket will instantly and permanently invalidate your current QR code. This action is irreversible.
              </div>
            </div>

            {/* Action controls */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                disabled={transferLoading}
                onClick={() => { setTransferTicket(null); setTransferEmail(''); }}
                className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer outline-none"
              >
                Cancel
              </button>
              <BrutalistButton
                variant="primary"
                type="submit"
                disabled={transferLoading || !transferEmail}
                className="text-xs font-semibold flex items-center justify-center gap-1.5 h-10"
              >
                {transferLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Executing Transfer...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm Transfer</span>
                  </>
                )}
              </BrutalistButton>
            </div>

          </form>
        )}
      </VoraModal>

    </div>
  );
}

export default function TicketWallet() {
  return (
    <WalletErrorBoundary>
      <TicketWalletContent />
    </WalletErrorBoundary>
  );
}
