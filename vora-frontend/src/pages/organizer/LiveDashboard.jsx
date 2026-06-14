import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import BrutalistButton from '../../components/BrutalistButton.jsx';
import BrutalistInput from '../../components/BrutalistInput.jsx';
import VoraModal from '../../components/VoraModal.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, 
  Lock, 
  Activity, 
  Users, 
  Send, 
  Clock, 
  ShieldAlert, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp,
  Volume2,
  Terminal,
  AlertTriangle,
  Loader2
} from 'lucide-react';

// ─── LOCAL TELEMETRY BROWSERS BROADCAST CHANNEL ───────────────────────
// Establish a unified browser channel for real-time offline multi-tab communication
const broadcastChannel = typeof window !== 'undefined' ? new BroadcastChannel('vora_live_telemetry_v1') : null;

// ─── SOCKET TELEMETRY CONTEXT PROVIDER ────────────────────────────────
const TelemetryContext = createContext(undefined);

export function TelemetryProvider({ children }) {
  const [connectionState, setConnectionState] = useState('CONNECTED'); // CONNECTED | RECONNECTING | DISCONNECTED
  const [backoffDelay, setBackoffDelay] = useState(1000);
  const reconnectTimeoutRef = useRef(null);

  // Trigger manual network disconnect simulation
  const simulateDisconnect = () => {
    setConnectionState('DISCONNECTED');
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
  };

  // Trigger force reconnect with exponential backoff
  const triggerReconnect = () => {
    setConnectionState('RECONNECTING');
    
    // Simulate exponential backoff
    reconnectTimeoutRef.current = setTimeout(() => {
      setConnectionState('CONNECTED');
      setBackoffDelay(1000); // reset delay
    }, backoffDelay);

    // Double the delay for next time (max 8 seconds)
    setBackoffDelay(prev => Math.min(prev * 2, 8000));
  };

  // Listen to standard browser online state changes
  useEffect(() => {
    const handleOnline = () => {
      setConnectionState('RECONNECTING');
      setTimeout(() => setConnectionState('CONNECTED'), 1200);
    };
    const handleOffline = () => {
      setConnectionState('DISCONNECTED');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  const value = {
    connectionState,
    simulateDisconnect,
    triggerReconnect,
    broadcastChannel
  };

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
}

export const useLiveTelemetry = () => {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useLiveTelemetry must be used inside a TelemetryProvider context.');
  }
  return context;
};

// ─── KINETIC TYPOGRAPHY FLIP CLOCK NUMBER CARD ────────────────────────
const FlipNumber = ({ value }) => {
  return (
    <div className="relative overflow-hidden h-14 w-28 flex items-center justify-center bg-zinc-950/60 border border-zinc-900 rounded-xl">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="text-4xl font-bold font-display text-white tabular-nums tracking-tighter block absolute"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

// ─── REAL-TIME LOG LEDGER ROW ────────────────────────────────────────
const LedgerRow = ({ log }) => {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0, y: -10 }}
      animate={{ height: "auto", opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="border-b border-zinc-900/40 py-2.5 px-4 flex items-center justify-between gap-4 text-xs hover:bg-zinc-900/10"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-[10px] text-zinc-550 shrink-0">{log.time}</span>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.type === 'VIP' ? 'bg-emerald-500' : 'bg-primary-500'}`} />
        <span className="font-semibold text-zinc-350 truncate">{log.event}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-mono text-[10px] text-zinc-650 select-all">{log.hash}</span>
        <span className="text-[10px] bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded text-zinc-500 font-mono font-medium">{log.gate}</span>
      </div>
    </motion.div>
  );
};

// ─── LIVE DASHBOARD CORE CONTENT ──────────────────────────────────────
function LiveDashboardContent() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { connectionState, simulateDisconnect, triggerReconnect, broadcastChannel } = useLiveTelemetry();

  // Zero-Trust Authorization Security clearance check
  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate('/auth');
      else if (user.role !== 'organizer') navigate('/attendee');
    }
  }, [user, authLoading, navigate]);

  // Telemetry Telecommunications States
  const [ingressRate, setIngressRate] = useState(142);
  const [totalCapacity, setTotalCapacity] = useState(7800);
  const [vipCapacity, setVipCapacity] = useState(1240);
  const maxCapacity = 10000;
  const maxVipCapacity = 2000;

  // Log Ledger States
  const [scanLogs, setScanLogs] = useState([
    { id: '1', time: '16:33:20', type: 'General', event: 'Scanned Ticket for Alice Johnson', hash: 'VORA-A82D-9F8C', gate: 'Gate 2' },
    { id: '2', time: '16:33:12', type: 'VIP', event: 'VIP Attendance Confirmed: Marcus Aurelius', hash: 'VORA-E923-45F2', gate: 'Gate 1' },
    { id: '3', time: '16:33:05', type: 'General', event: 'Scanned Ticket for Nikola Tesla', hash: 'VORA-32C9-411A', gate: 'Gate 3' },
    { id: '4', time: '16:32:50', type: 'General', event: 'Scanned Ticket for Sarah Jenkins', hash: 'VORA-8201-9283', gate: 'Gate 2' },
    { id: '5', time: '16:32:42', type: 'VIP', event: 'VIP Attendance Confirmed: Grace Hopper', hash: 'VORA-9023-7182', gate: 'Gate 1' }
  ]);

  // Broadcast Controller States
  const [priority, setPriority] = useState('standard'); // standard | urgent | emergency
  const [message, setMessage] = useState('');
  const characterLimit = 160;

  // Hold-to-Confirm slingshot safety controls
  const [holdPercentage, setHoldPercentage] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdIntervalRef = useRef(null);

  // Delivery receipt loop metrics
  const [isPropagating, setIsPropagating] = useState(false);
  const [propagationCount, setPropagationCount] = useState(0);
  const propagationTimerRef = useRef(null);

  // Live Telemetry stream simulators
  useEffect(() => {
    if (connectionState !== 'CONNECTED') return;

    const interval = setInterval(() => {
      // 1. Simulate ingress counts increase
      const rateDelta = Math.floor(Math.random() * 5) - 2; // -2 to +2
      setIngressRate(prev => Math.max(80, Math.min(220, prev + rateDelta)));

      const capacityDelta = Math.floor(Math.random() * 3) + 1; // 1 to 3 scans
      setTotalCapacity(prev => Math.min(maxCapacity, prev + capacityDelta));

      if (Math.random() > 0.6) {
        setVipCapacity(prev => Math.min(maxVipCapacity, prev + 1));
      }

      // 2. Prepend a new scan row
      const randomNames = ['John Doe', 'Marie Curie', 'Albert Einstein', 'Isaac Newton', 'Ada Lovelace', 'Alan Turing', 'Galileo Galilei'];
      const randomGates = ['Gate 1', 'Gate 2', 'Gate 3'];
      const randomHash = `VORA-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      const newType = Math.random() > 0.7 ? 'VIP' : 'General';
      const name = randomNames[Math.floor(Math.random() * randomNames.length)];
      const gate = randomGates[Math.floor(Math.random() * randomGates.length)];
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      const newLog = {
        id: String(Date.now()),
        time: timeStr,
        type: newType,
        event: newType === 'VIP' ? `VIP Attendance Confirmed: ${name}` : `Scanned Ticket for ${name}`,
        hash: randomHash.substring(0, 14),
        gate
      };

      setScanLogs(prev => [newLog, ...prev.slice(0, 49)]);

    }, 3500);

    return () => clearInterval(interval);
  }, [connectionState]);

  // Handle Multi-Tab Telemetry broadcast updates
  useEffect(() => {
    if (!broadcastChannel) return;

    const handleChannelMessage = (e) => {
      const data = e.data;
      if (data?.type === 'BROADCAST_ACK' && isPropagating) {
        // Increment deliveries progress when attendees click Acknowledge
        setPropagationCount(prev => Math.min(100, prev + Math.floor(Math.random() * 8) + 4));
      }
    };

    broadcastChannel.addEventListener('message', handleChannelMessage);
    return () => broadcastChannel.removeEventListener('message', handleChannelMessage);
  }, [broadcastChannel, isPropagating]);

  // Hold progress tracking ticker
  const handleHoldStart = (e) => {
    e.preventDefault();
    if (isPropagating || !message.trim()) return;
    
    setIsHolding(true);
    setHoldPercentage(0);

    const step = 100 / 15; // 15 intervals of 100ms = 1500ms
    holdIntervalRef.current = setInterval(() => {
      setHoldPercentage(prev => {
        if (prev >= 100) {
          clearInterval(holdIntervalRef.current);
          triggerBroadcastSend();
          return 100;
        }
        return prev + step;
      });
    }, 100);
  };

  const handleHoldEnd = () => {
    setIsHolding(false);
    setHoldPercentage(0);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
  };

  // Keyboard accessibility triggers for hold safety button
  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      handleHoldStart(e);
    }
  };

  const handleKeyUp = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      handleHoldEnd();
    }
  };

  // Dispatch Broadcast through network channel
  const triggerBroadcastSend = () => {
    setIsHolding(false);
    setHoldPercentage(0);

    if (!message.trim()) return;

    // Dispatch optimistic delivery state
    setIsPropagating(true);
    setPropagationCount(0);

    // Generate unique idempotency key
    const idempotencyKey = `BROADCAST-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Publish payload broadcast to local channels (interstitials wallet alerts)
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'LIVE_BROADCAST',
        priority,
        message,
        idempotencyKey,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    // Simulate network delivery receipts stream
    let currentPct = 0;
    propagationTimerRef.current = setInterval(() => {
      currentPct += Math.floor(Math.random() * 15) + 5;
      if (currentPct >= 100) {
        setPropagationCount(100);
        clearInterval(propagationTimerRef.current);
        
        // Retain success confirmation message for 3 seconds then flush states
        setTimeout(() => {
          setIsPropagating(false);
          setMessage('');
          setPropagationCount(0);
        }, 3000);
      } else {
        setPropagationCount(currentPct);
      }
    }, 400);
  };

  // Character counter color classes
  const characterCountColor = useMemo(() => {
    const remaining = characterLimit - message.length;
    if (remaining <= 20) return 'text-red-500 font-bold';
    if (remaining <= 50) return 'text-amber-500 font-semibold';
    return 'text-zinc-500';
  }, [message]);

  // Clean raw Markdown strings into bold preview tags
  const renderMarkdownPreview = (text) => {
    if (!text.trim()) return <span className="text-zinc-650 italic">Waiting for payload input...</span>;
    // Replace **text** with bold elements
    const boldPattern = /\*\*(.*?)\*\*/g;
    const parts = text.split(boldPattern);
    
    return parts.map((part, index) => {
      // odd indices are matching bold captures
      if (index % 2 === 1) {
        return <strong key={index} className="font-extrabold text-white">{part}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  // SVG Circular Radial parameters math
  const outerCircumference = 2 * Math.PI * 80; // r=80 -> ~502
  const innerCircumference = 2 * Math.PI * 65; // r=65 -> ~408

  const outerOffset = outerCircumference - (totalCapacity / maxCapacity) * outerCircumference;
  const innerOffset = innerCircumference - (vipCapacity / maxVipCapacity) * innerCircumference;

  return (
    <div className="h-[100dvh] bg-zinc-950 flex flex-col overflow-hidden text-white font-sans">
      
      {/* ─── LIVE WEB CONSOLE SECURE HEADER ─── */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md py-4 px-6 shrink-0 z-30 select-none">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center w-full">
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center font-bold text-sm text-white shadow-soft">
              V
            </div>
            <div>
              <h1 className="font-display font-bold text-base tracking-tight leading-none text-white">Live Operations Command</h1>
              <p className="text-[10px] text-zinc-500 font-medium font-mono mt-1">TELEMETRY DECK • VORA SECURE FRAMEWORKS</p>
            </div>
          </div>

          {/* Top-Right Connection Status machine indicators */}
          <div className="flex items-center gap-3">
            
            {/* Simulation controls */}
            <div className="hidden sm:flex items-center gap-2 border border-zinc-900 bg-zinc-950 px-2 py-1 rounded-lg">
              <button 
                onClick={simulateDisconnect}
                disabled={connectionState === 'DISCONNECTED'}
                className="text-[10px] font-semibold text-zinc-500 hover:text-red-400 transition-colors cursor-pointer outline-none disabled:opacity-20"
              >
                Simulate Drop
              </button>
            </div>

            {/* Health indicators */}
            <div className="flex items-center gap-2 bg-zinc-900/40 border border-zinc-850 px-3.5 py-1.5 rounded-full text-xs font-semibold">
              <div className="relative flex h-2 w-2">
                {connectionState === 'CONNECTED' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  connectionState === 'CONNECTED' 
                    ? 'bg-primary-500' 
                    : connectionState === 'RECONNECTING' 
                      ? 'bg-amber-500 animate-[pulse_0.4s_infinite_alternate]' 
                      : 'bg-red-500/50'
                }`} />
              </div>
              <span className="text-[11px] font-bold font-mono tracking-wider uppercase text-zinc-300">
                {connectionState}
              </span>
            </div>

            {connectionState === 'DISCONNECTED' && (
              <BrutalistButton
                variant="secondary"
                onClick={triggerReconnect}
                className="text-[10px] font-bold uppercase tracking-wider py-1 px-3 bg-red-950 border-red-900/30 text-red-400 hover:bg-red-900 hover:text-white"
              >
                Force Reconnect
              </BrutalistButton>
            )}

          </div>

        </div>
      </header>

      {/* ─── MASTER DUAL HORIZON LAYOUT GRID ─── */}
      <main className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow h-[calc(100vh-4.5rem)] overflow-hidden">
        
        {/* LEFT HORIZON: Telemetry Scorecards & SVGs */}
        <div className="lg:col-span-7 flex flex-col gap-6 h-full overflow-y-auto hide-scrollbar pb-6">
          
          {/* Top row metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 shrink-0">
            
            {/* scanning velocity card with flip animation */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 flex items-center justify-between shadow-soft relative overflow-hidden select-none">
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block font-mono">Gate Ingress Rate</span>
                <h3 className="text-sm font-semibold text-zinc-200">Scans Per Minute</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase font-mono tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                  <span>Real-time Active</span>
                </div>
              </div>
              
              <FlipNumber value={ingressRate} />
            </div>

            {/* Ingress status scorecard */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 flex flex-col justify-between shadow-soft select-none">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block font-mono">Operations clock</span>
                  <h3 className="text-sm font-semibold text-zinc-200">Gate Check-in Gates</h3>
                </div>
                <div className="p-1.5 rounded-lg bg-zinc-950/80 border border-zinc-850 text-zinc-500 font-mono text-[9px] font-bold">
                  ACTIVE
                </div>
              </div>
              
              <div className="flex items-baseline justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-500" />
                  <span className="text-xl font-bold font-display text-white tabular-nums tracking-tight">3 Gates Active</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-550">Target Capacity: 10,000</span>
              </div>
            </div>

          </div>

          {/* SVG capacity radial engine */}
          <div className="bg-zinc-900/20 border border-white/5 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-around gap-6 shrink-0 shadow-ambient select-none">
            
            <div className="space-y-2 text-center sm:text-left max-w-xs">
              <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block font-mono">Verification status</span>
              <h3 className="text-lg font-bold font-display text-white tracking-tight">Ingress Capacity Engine</h3>
              <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                Visualizing checks ratios. Purple indicates general admittance stubs, green tracks VIP credentials.
              </p>
            </div>

            {/* Handcoded SVG Radial circles */}
            <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                
                {/* Background tracks */}
                <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="12" />
                <circle cx="100" cy="100" r="65" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="10" />

                {/* Outer General Circle */}
                <circle 
                  cx="100" 
                  cy="100" 
                  r="80" 
                  fill="none" 
                  stroke="#7c3aed" 
                  strokeWidth="12" 
                  strokeDasharray={outerCircumference}
                  strokeDashoffset={outerOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />

                {/* Inner VIP Circle */}
                <circle 
                  cx="100" 
                  cy="100" 
                  r="65" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="10" 
                  strokeDasharray={innerCircumference}
                  strokeDashoffset={innerOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />

              </svg>

              {/* Central text stats */}
              <div className="absolute text-center space-y-0.5">
                <span className="text-3xl font-bold font-display tracking-tighter tabular-nums block">
                  {Math.round((totalCapacity / maxCapacity) * 100)}%
                </span>
                <span className="text-[9px] font-mono font-bold text-zinc-550 block uppercase tracking-wider">
                  {totalCapacity.toLocaleString()} / {maxCapacity.toLocaleString()}
                </span>
              </div>
            </div>

          </div>

          {/* Live scan events ledger terminal */}
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-3xl flex-1 flex flex-col overflow-hidden min-h-[220px]">
            
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-950/60 shrink-0 select-none">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary-500 shrink-0" />
                <h4 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Gate Entry Stream logs</h4>
              </div>
              <span className="text-[9px] font-mono text-zinc-600 font-bold uppercase tracking-widest animate-pulse">Streaming logs...</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/30 font-sans">
              <AnimatePresence initial={false}>
                {scanLogs.map((log) => (
                  <LedgerRow key={log.id} log={log} />
                ))}
              </AnimatePresence>
            </div>

          </div>

        </div>

        {/* RIGHT HORIZON: Broadcast Node Dispatcher */}
        <div className="lg:col-span-5 flex flex-col h-full overflow-hidden pb-6">
          <div className={`bg-zinc-900/40 backdrop-blur-2xl border rounded-[2rem] p-6 flex flex-col h-full justify-between shadow-ambient relative transition-all duration-500 ${
            priority === 'emergency' 
              ? 'border-red-500/30 shadow-red-500/5' 
              : priority === 'urgent' 
                ? 'border-amber-500/20 shadow-amber-500/5' 
                : 'border-white/5'
          }`}>
            
            {/* Dynamic Emergency Background pulse glow glow */}
            {priority === 'emergency' && (
              <div className="absolute inset-0 bg-red-500/[0.01] rounded-[2rem] pointer-events-none animate-pulse" />
            )}

            <div className="space-y-6 flex-grow overflow-y-auto hide-scrollbar pr-1">
              
              <div className="space-y-1 select-none">
                <span className="text-[9px] font-bold text-primary-500 tracking-wider uppercase font-mono">Wallet Broadcast Server</span>
                <h2 className="text-lg font-bold font-display text-white tracking-tight">Broadcast Dispatch Console</h2>
                <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                  Dispatch alert messages to all checked-in attendee ticket wallets globally.
                </p>
              </div>

              {/* Priority level options */}
              <div className="space-y-2 select-none">
                <label className="text-xs font-semibold text-zinc-400">Alert Priority Level</label>
                <div className="flex p-1 bg-zinc-950 border border-zinc-900 rounded-xl relative w-full">
                  {[
                    { id: 'standard', label: 'Standard' },
                    { id: 'urgent', label: 'Urgent' },
                    { id: 'emergency', label: 'Emergency' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPriority(opt.id)}
                      className={`relative z-10 flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer text-center outline-none ${
                        priority === opt.id 
                          ? opt.id === 'emergency' 
                            ? 'text-red-400' 
                            : opt.id === 'urgent' 
                              ? 'text-amber-400' 
                              : 'text-white' 
                          : 'text-zinc-500 hover:text-zinc-350'
                      }`}
                    >
                      {priority === opt.id && (
                        <motion.div
                          layoutId="prioritySelectBg"
                          className="absolute inset-0 bg-zinc-800 border border-zinc-700/50 rounded-lg -z-10"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Markdown inputs textarea */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline select-none">
                  <label htmlFor="broadcast-msg-input" className="text-xs font-semibold text-zinc-400">Broadcast Text Message</label>
                  <span className={`text-[10px] font-mono ${characterCountColor}`}>
                    {characterLimit - message.length} / {characterLimit}
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    id="broadcast-msg-input"
                    maxLength={characterLimit}
                    rows={3}
                    placeholder="Type details (use **bold** code blocks to call out stage details)..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-zinc-950/60 border border-zinc-850 hover:border-zinc-800 focus:border-primary-500 rounded-2xl text-xs px-4 py-3 outline-none transition-all focus:ring-1 focus:ring-primary-500 placeholder-zinc-650 resize-none font-sans"
                  />
                </div>
              </div>

              {/* Attendee Wallet live device previewer */}
              <div className="space-y-2 select-none">
                <label className="text-xs font-semibold text-zinc-400">Attendee Wallet Preview</label>
                <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 relative overflow-hidden min-h-[140px] flex flex-col justify-between">
                  
                  {/* Subtle glass header mockup */}
                  <div className="flex justify-between items-center border-b border-zinc-900/60 pb-3">
                    <span className="text-[8px] font-mono tracking-widest text-zinc-500 uppercase flex items-center gap-1">
                      <Volume2 className="w-3 h-3 text-primary-500" /> Vora Push Service
                    </span>
                    <span className="text-[8px] font-mono text-zinc-600">LIVE NOW</span>
                  </div>

                  {/* Preview content mapped */}
                  <div className={`py-4 text-xs font-medium leading-relaxed ${
                    priority === 'emergency' 
                      ? 'text-red-400 font-bold' 
                      : priority === 'urgent' 
                        ? 'text-amber-400 font-semibold' 
                        : 'text-zinc-350'
                  }`}>
                    {renderMarkdownPreview(message)}
                  </div>

                  {/* Device home bar overlay mockup */}
                  <div className="flex justify-center pt-2">
                    <div className="w-20 h-1 bg-zinc-850 rounded-full" />
                  </div>

                </div>
              </div>

            </div>

            {/* Slingshot Safety Hold confirmation button controls */}
            <div className="pt-6 border-t border-zinc-900 shrink-0 select-none">
              
              {isPropagating ? (
                /* Delivery receipt progression loops */
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-primary-400 flex items-center gap-1.5 animate-pulse uppercase tracking-wider font-mono text-[10px]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Propagating to Attendees...
                    </span>
                    <span className="font-mono text-zinc-400 font-bold">{propagationCount}%</span>
                  </div>
                  
                  <div className="w-full bg-zinc-950 border border-zinc-900 h-2.5 rounded-full overflow-hidden">
                    <motion.div 
                      className="bg-primary-500 h-full rounded-full"
                      style={{ width: `${propagationCount}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                  
                  {propagationCount === 100 && (
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[3.5]" /> Broadcast Delivers Confirmed
                    </p>
                  )}
                </div>
              ) : (
                /* Hold to confirm buttons triggers */
                <div className="space-y-4">
                  
                  {priority !== 'standard' && message.trim() && (
                    <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-[10px] text-amber-500 font-medium">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Security: Urgent / Emergency priority requires Hold-to-Confirm to fire.</span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!message.trim() || connectionState !== 'CONNECTED'}
                    onMouseDown={priority === 'standard' ? triggerBroadcastSend : handleHoldStart}
                    onMouseUp={priority === 'standard' ? null : handleHoldEnd}
                    onMouseLeave={priority === 'standard' ? null : handleHoldEnd}
                    onTouchStart={priority === 'standard' ? triggerBroadcastSend : handleHoldStart}
                    onTouchEnd={priority === 'standard' ? null : handleHoldEnd}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    className="w-full h-14 rounded-2xl bg-zinc-950 border border-zinc-850 hover:border-zinc-800 text-white font-bold tracking-wider uppercase text-xs transition-all relative overflow-hidden flex items-center justify-center cursor-pointer select-none active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none disabled:active:scale-100 outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    {/* Safe progress indicators fill bar */}
                    {isHolding && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-primary-600/20 transition-all ease-linear"
                        style={{ width: `${holdPercentage}%` }}
                      />
                    )}

                    <div className="relative z-10 flex items-center gap-2">
                      <Send className="w-4 h-4 text-primary-400" />
                      <span>
                        {priority === 'standard' 
                          ? 'Send Broadcast Update' 
                          : isHolding 
                            ? `Hold to confirms (${Math.round(holdPercentage)}%)` 
                            : 'Hold to Confirm Dispatch'}
                      </span>
                    </div>
                  </button>

                </div>
              )}

            </div>

          </div>
        </div>

      </main>

    </div>
  );
}

export default function LiveDashboard() {
  return (
    <TelemetryProvider>
      <LiveDashboardContent />
    </TelemetryProvider>
  );
}
