import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Key, 
  Lock, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Eye,
  EyeOff,
  Copy,
  Terminal,
  Check
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import useETagPolling from '../../hooks/useETagPolling.js';
import { toast } from '../../components/ui/Toast.jsx';
import Heading from '../../components/ui/Heading.jsx';
import Text from '../../components/ui/Text.jsx';

/**
 * Kinetic number counting component.
 */
function CountingNumber({ value, duration = 1000 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10);
    if (isNaN(end)) {
      setCount(value);
      return;
    }
    if (start === end) {
      setCount(end);
      return;
    }

    const totalMiliseconds = duration;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 16);
    const startTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalMiliseconds, 1);
      // easeOutQuad
      const easedProgress = progress * (2 - progress);
      const current = Math.floor(easedProgress * end);
      
      setCount(current);

      if (progress >= 1) {
        clearInterval(timer);
        setCount(end);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{count.toLocaleString()}</>;
}

/**
 * Custom Tooltip for the Web Application Firewall (WAF) graph.
 */
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const threatsVal = data.threats;
    const legitVal = data.legitimate;
    return (
      <div className="bg-zinc-950/90 backdrop-blur-md border border-white/5 p-4 rounded-xl shadow-soft select-none text-left">
        <p className="text-[10px] font-accent font-bold tracking-widest text-zinc-500 uppercase">
          WAF Telemetry
        </p>
        <p className="text-xs font-semibold text-zinc-200 mt-1 font-technical">
          TIME INTERVAL: {data.label}
        </p>
        <p className="text-xs text-zinc-400 mt-2 font-technical">
          Legitimate Traffic: <span className="text-zinc-200 font-semibold">{legitVal} req/s</span>
        </p>
        <p className="text-xs font-semibold mt-1 text-red-500 font-accent">
          THREATS NEUTRALIZED: <span className="font-technical font-bold">{threatsVal.toLocaleString()}</span>
        </p>
        <p className="text-[9px] text-red-400 font-technical mt-2 uppercase leading-relaxed font-semibold">
          STATUS CODES: 429 Too Many Requests, 403 Forbidden
        </p>
      </div>
    );
  }
  return null;
};

export default function SecurityPosture() {
  // Static state placeholders for toggles
  const [tlsConfig, setTlsConfig] = useState(true);
  const [encryptAtRest, setEncryptAtRest] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);

  // Key generator states
  const [keyPair, setKeyPair] = useState(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [isHoldingKey, setIsHoldingKey] = useState(false);

  // Defcon lockdown states
  const [isDefconModalOpen, setIsDefconModalOpen] = useState(false);
  const [lockdownConfirmation, setLockdownConfirmation] = useState('');
  const [isLockingDown, setIsLockingDown] = useState(false);
  const [isLockdownPulsing, setIsLockdownPulsing] = useState(false);
  const [threatLevel, setThreatLevel] = useState('NOMINAL'); // NOMINAL, ELEVATED, CRITICAL
  const [activeSessionsCount, setActiveSessionsCount] = useState(48);
  const [blockedAttacks, setBlockedAttacks] = useState(1402);

  // Audit Logs state
  const [auditEvents, setAuditEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Fetch security audit logs and WAF data via ETag polling
  const { data: polledLogs, refetch: refetchLogs } = useETagPolling('/api/v1/security/audit-logs', 5000);
  const { data: polledWaf } = useETagPolling('/api/v1/security/waf-stats', 10000);

  useEffect(() => {
    if (polledLogs && polledLogs.success) {
      setAuditEvents(polledLogs.data);
      // Check if global lockdown or violation was executed
      const hasLockdown = polledLogs.data.some(l => l.action === 'GLOBAL_SESSION_REVOCATION_EXECUTED');
      const hasViolation = polledLogs.data.some(l => l.action === 'RBAC_VIOLATION_INTERCEPTED');
      if (hasLockdown) {
        setThreatLevel('CRITICAL');
        setActiveSessionsCount(1);
      } else if (hasViolation) {
        setThreatLevel('ELEVATED');
        setActiveSessionsCount(48);
      } else {
        setThreatLevel('NOMINAL');
        setActiveSessionsCount(48);
      }
    }
  }, [polledLogs]);

  // E2EE blur reveal animated via Framer Motion natively

  // Rotate Key pair mutation
  const handleGenerateKey = async () => {
    setIsGeneratingKey(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/v1/security/generate-key', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.success) {
        setKeyPair(response.data.data);
        window.dispatchEvent(new CustomEvent('vora-refresh-tasks'));
        refetchLogs();
        toast('New cryptographic key pair generated successfully.', 'success');
      }
    } catch (err) {
      console.error(err);
      toast('Failed to generate key pair.', 'error');
    } finally {
      setIsGeneratingKey(false);
    }
  };

  // Execute Defcon Lockdown
  const handleExecuteLockdown = async () => {
    if (lockdownConfirmation !== 'initiate global lockdown') {
      toast('Verification text does not match.', 'error');
      return;
    }

    setIsLockingDown(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/v1/security/defcon', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.success) {
        // Optimistic UI updates
        setIsLockdownPulsing(true);
        setThreatLevel('NOMINAL');
        setActiveSessionsCount(1);
        setBlockedAttacks(prev => prev + 1);
        setIsDefconModalOpen(false);
        setLockdownConfirmation('');

        // Optimistically prepend the lockdown event log
        const optimisticEvent = {
          id: `evt-temp-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'GLOBAL_SESSION_REVOCATION_EXECUTED',
          description: 'Global Defcon lockdown initiated by administrator. All active JWT sessions revoked.',
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent || 'Admin Client Web',
          payload: {
            initiatedBy: 'current-admin',
            lockdownTime: new Date().toISOString()
          }
        };
        setAuditEvents(prev => [optimisticEvent, ...prev]);

        setTimeout(() => {
          setIsLockdownPulsing(false);
        }, 1500);

        refetchLogs();
        // Fire custom window pulse animation event
        window.dispatchEvent(new CustomEvent('vora-refresh-tasks'));
        toast('GLOBAL LOCKDOWN TRIGGERED. All sessions terminated.', 'success');
      }
    } catch (err) {
      console.error(err);
      toast('Lockdown request failed.', 'error');
    } finally {
      setIsLockingDown(false);
    }
  };

  const handleCopyKey = () => {
    if (!keyPair) return;
    navigator.clipboard.writeText(keyPair.privateKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const filteredLogs = auditEvents.filter(event => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (event.action || '').toLowerCase().includes(q) ||
      (event.ipAddress || '').toLowerCase().includes(q) ||
      (event.description || '').toLowerCase().includes(q)
    );
  });

  const getThreatBadgeColor = () => {
    if (threatLevel === 'NOMINAL') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (threatLevel === 'ELEVATED') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse';
  };

  const getPulseDuration = () => {
    if (threatLevel === 'NOMINAL') return 2;
    if (threatLevel === 'ELEVATED') return 1;
    return 0.5;
  };

  return (
    <div className="w-full flex flex-col gap-8 relative select-none">
      
      {/* Absolute warning amber/crimson background radial glow with Framer Motion */}
      <motion.div 
        animate={{
          background: isLockdownPulsing 
            ? [
                'radial-gradient(circle, rgba(239, 68, 68, 0.8) 0%, transparent 70%)',
                'radial-gradient(circle, rgba(239, 68, 68, 0.0) 0%, transparent 70%)'
              ]
            : threatLevel === 'CRITICAL'
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, transparent 70%)'
            : threatLevel === 'ELEVATED'
            ? 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%)'
        }}
        transition={isLockdownPulsing ? { duration: 1.5, ease: 'easeOut' } : { duration: 0.5 }}
        className="absolute w-[600px] h-[600px] rounded-full filter blur-[150px] pointer-events-none -top-40 -right-20"
      />

      {/* ─── COMMAND CENTER HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-8 border-b border-white/5 gap-6">
        <div className="flex flex-col select-none py-4">
          <Heading level="h1" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tighter text-white leading-none font-display">
            Security Posture
          </Heading>
          <Text variant="muted" className="!text-zinc-400 !text-sm mt-2 max-w-2xl font-sans">
            Forensic monitoring of the platform perimeters, API traffic filters, and cryptographic configurations.
          </Text>
        </div>
        
        {/* Global Threat status indicator */}
        <div className={`flex items-center gap-3 px-4 py-2 border rounded-xl font-accent text-xs font-bold uppercase tracking-widest ${getThreatBadgeColor()}`}>
          <svg className="w-3 h-3 text-current shrink-0" viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="3" fill="currentColor" />
            <motion.circle
              key={threatLevel}
              cx="6"
              cy="6"
              r="3"
              fill="currentColor"
              animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
              style={{ originX: "6px", originY: "6px" }}
              transition={{
                repeat: Infinity,
                duration: getPulseDuration(),
                ease: "easeInOut"
              }}
            />
          </svg>
          <span>CURRENT SYSTEM STATUS: {threatLevel}</span>
        </div>
      </div>

      {/* ─── SECURITY SCORECARD GRID ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        
        <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all duration-300">
          <span className="text-[10px] font-accent font-bold tracking-widest text-zinc-500 block uppercase">
            Active JWT Sessions
          </span>
          <h3 className="text-3xl font-semibold text-white tracking-tight mt-2 font-technical">
            <CountingNumber value={activeSessionsCount} />
          </h3>
          <p className="text-[10px] text-zinc-500 mt-2 font-sans">
            Verified online accounts
          </p>
        </div>

        <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all duration-300">
          <span className="text-[10px] font-accent font-bold tracking-widest text-zinc-500 block uppercase">
            Blocked Penetration Attempts
          </span>
          <h3 className="text-3xl font-semibold text-white tracking-tight mt-2 font-technical">
            <CountingNumber value={blockedAttacks} />
          </h3>
          <p className="text-[10px] text-zinc-500 mt-2 font-sans">
            Filtered malformed packets
          </p>
        </div>

        <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all duration-300">
          <span className="text-[10px] font-accent font-bold tracking-widest text-zinc-500 block uppercase">
            Failed Authentication Pings
          </span>
          <h3 className="text-3xl font-semibold text-zinc-400 tracking-tight mt-2 font-technical">
            <CountingNumber value={0} />
          </h3>
          <p className="text-[10px] text-emerald-400 font-sans mt-2 font-semibold">
            0.00% anomaly rate
          </p>
        </div>

        <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all duration-300">
          <span className="text-[10px] font-accent font-bold tracking-widest text-zinc-500 block uppercase">
            Data Encryption Integrity
          </span>
          <h3 className="text-3xl font-semibold text-emerald-400 tracking-tight mt-2 font-technical">
            <CountingNumber value={100} />%
          </h3>
          <p className="text-[10px] text-zinc-500 mt-2 font-sans">
            AES-256 GCM applied
          </p>
        </div>

      </div>

      {/* ─── WAF TRAFFIC CHART MATRIX ─── */}
      <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
        <div>
          <span className="text-[10px] font-accent font-bold tracking-widest text-zinc-500 uppercase">
            Web Application Firewall Traffic
          </span>
          <h2 className="text-sm font-semibold text-zinc-200 mt-1 uppercase font-display tracking-wide">
            Real-Time Network Filtration Telemetry
          </h2>
        </div>

        <div className="h-64 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={polledWaf?.data || []}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="legitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#27272a" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#09090b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#09090b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
              <XAxis 
                dataKey="label" 
                stroke="#52525b" 
                tickLine={false} 
                axisLine={false}
                tick={{ fontSize: 9, fontFamily: 'Geist' }}
              />
              <YAxis 
                stroke="#52525b" 
                tickLine={false} 
                axisLine={false}
                tick={{ fontSize: 9, fontFamily: 'Geist' }}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ stroke: 'rgba(239, 68, 68, 0.2)', strokeWidth: 1, strokeDasharray: '3 3' }} 
              />
              
              {/* Baseline legitimate traffic (zinc) */}
              <Area 
                type="monotone" 
                dataKey="legitimate" 
                stackId="1"
                stroke="#71717a" 
                strokeWidth={1.5}
                fillOpacity={1} 
                fill="url(#legitGradient)" 
              />
              
              {/* Dropped malicious traffic (warning red) */}
              <Area 
                type="monotone" 
                dataKey="threats" 
                stackId="1"
                stroke="#ef4444" 
                strokeWidth={1.5}
                fillOpacity={1} 
                fill="url(#threatGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── IMMUTABLE AUDIT LEDGER MATRIX ─── */}
      <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-accent font-bold tracking-widest text-zinc-500 uppercase">
              Cryptographic Event Provenance
            </span>
            <h2 className="text-sm font-semibold text-zinc-200 mt-1 uppercase font-display tracking-wide">
              Immutable Forensic Audit Ledger
            </h2>
          </div>
          
          {/* Search ledger */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-white/5 focus:border-red-500/30 focus:ring-2 focus:ring-red-500/10 px-9 py-2 rounded-xl text-xs text-white placeholder:text-zinc-650 font-form outline-none transition-all duration-200"
            />
          </div>
        </div>

        {/* Audit event list */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredLogs.map((event) => {
              const isExpanded = expandedEventId === event.id;
              
              // Icon selection based on threat status
              const renderStatusIcon = () => {
                if (event.action === 'GLOBAL_SESSION_REVOCATION_EXECUTED' || event.action === 'RBAC_VIOLATION_INTERCEPTED') {
                  return (
                    <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                      <XCircle className="w-4.5 h-4.5" />
                    </div>
                  );
                }
                if (event.action === 'API_KEY_ROTATED') {
                  return (
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                      <AlertTriangle className="w-4.5 h-4.5" />
                    </div>
                  );
                }
                return (
                  <div className="w-8 h-8 rounded-full bg-zinc-800/40 border border-zinc-700/30 flex items-center justify-center text-zinc-400 shrink-0">
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  </div>
                );
              };

              return (
                <motion.div
                  key={event.id}
                  layout
                  className="group relative border border-white/5 bg-zinc-900/40 rounded-xl p-4 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.02]"
                >
                  <div className="flex items-start gap-4 justify-between flex-wrap sm:flex-nowrap">
                    <div className="flex items-start gap-3 min-w-0">
                      {renderStatusIcon()}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-technical text-[10px] text-zinc-500 font-semibold">
                            {new Date(event.timestamp).toLocaleTimeString()} • {new Date(event.timestamp).toLocaleDateString()}
                          </span>
                          <span className="font-accent text-[9px] font-bold tracking-widest text-zinc-300 uppercase">
                            {event.action}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                          {event.description}
                        </p>
                      </div>
                    </div>

                    {/* Metadata & hover action button */}
                    <div className="flex items-end gap-3 shrink-0 relative">
                      <div className="flex flex-col items-end select-text font-technical text-[10px] text-zinc-500 space-y-0.5 group-hover:opacity-20 transition-opacity duration-200">
                        <span>IP: {event.ipAddress}</span>
                        <span className="max-w-[150px] truncate">Agent: {event.userAgent}</span>
                      </div>
                      
                      {/* Ghost button fading in on hover */}
                      <button
                        onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-zinc-950/80 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-form font-semibold text-zinc-350 hover:text-white hover:border-white/20 cursor-pointer shadow-md"
                      >
                        {isExpanded ? 'Hide Payload' : 'View Raw JSON Payload'}
                      </button>
                    </div>
                  </div>

                  {/* Expandable JSON details codeblock */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden mt-3"
                      >
                        <div className="bg-zinc-950 p-4 rounded-lg border border-white/5 text-[10px] font-mono text-zinc-400 overflow-x-auto select-text leading-relaxed">
                          <pre>{JSON.stringify(event, null, 2)}</pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── E2EE CONFIGURATION & KEY ROTATION ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Toggle settings */}
        <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
          <div>
            <span className="text-[10px] font-accent font-bold tracking-widest text-zinc-500 uppercase">
              Cryptographic Data Sovereignty
            </span>
            <h2 className="text-sm font-semibold text-zinc-200 mt-1 uppercase font-display tracking-wide">
              Network Hardening Controls
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-zinc-950/20 border border-white/5 rounded-2xl">
              <div>
                <span className="text-xs font-semibold text-zinc-300 block">Enforce Strict TLS 1.3 Transit</span>
                <span className="text-[10px] text-zinc-500">Rejects legacy cipher suites</span>
              </div>
              <button
                onClick={() => setTlsConfig(!tlsConfig)}
                className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 border border-white/5 outline-none cursor-pointer ${
                  tlsConfig ? 'bg-primary-600' : 'bg-zinc-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${tlsConfig ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-zinc-950/20 border border-white/5 rounded-2xl">
              <div>
                <span className="text-xs font-semibold text-zinc-300 block">Encrypt Attendee PII at Rest</span>
                <span className="text-[10px] text-zinc-500">Encrypt email, names with envelope key</span>
              </div>
              <button
                onClick={() => setEncryptAtRest(!encryptAtRest)}
                className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 border border-white/5 outline-none cursor-pointer ${
                  encryptAtRest ? 'bg-primary-600' : 'bg-zinc-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${encryptAtRest ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-zinc-950/20 border border-white/5 rounded-2xl">
              <div>
                <span className="text-xs font-semibold text-zinc-300 block">Require MFA for Organizers</span>
                <span className="text-[10px] text-zinc-500">Enforces Authenticator App verification</span>
              </div>
              <button
                onClick={() => setMfaRequired(!mfaRequired)}
                className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 border border-white/5 outline-none cursor-pointer ${
                  mfaRequired ? 'bg-primary-600' : 'bg-zinc-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${mfaRequired ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* E2EE Master Key generator */}
        <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary-400" />
              <span className="text-[10px] font-accent font-bold tracking-widest text-zinc-500 uppercase">
                Master Key Rotation
              </span>
            </div>
            <h2 className="text-sm font-semibold text-zinc-200 mt-1 uppercase font-display tracking-wide">
              Regenerate Cryptographic Key Pair
            </h2>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              Rotating your keys enforces a complete re-indexing of stored attendee logs. Make sure to download your private key file immediately.
            </p>
          </div>

          <div className="space-y-4 mt-6">
            {keyPair ? (
              <div className="bg-zinc-950 rounded-2xl border border-white/5 p-4 space-y-3 select-text relative overflow-hidden">
                <div className="flex justify-between items-center relative z-10 select-none">
                  <span className="text-[9px] font-technical font-semibold text-zinc-500">
                    FINGERPRINT: {keyPair.fingerprint}
                  </span>
                  <button
                    onClick={handleCopyKey}
                    className="p-1 rounded bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Key Blur Reveal interaction box */}
                <div
                  onMouseDown={() => setIsHoldingKey(true)}
                  onMouseUp={() => setIsHoldingKey(false)}
                  onMouseLeave={() => setIsHoldingKey(false)}
                  onTouchStart={() => setIsHoldingKey(true)}
                  onTouchEnd={() => setIsHoldingKey(false)}
                  className="bg-zinc-900 rounded-xl p-3 border border-white/5 text-[9px] font-mono select-none flex flex-col items-center justify-center min-h-[90px] cursor-pointer group hover:border-primary-500/20 transition-colors duration-200 relative overflow-hidden"
                >
                  {/* Obscured Blur display */}
                  <motion.div 
                    animate={{ filter: isHoldingKey ? 'blur(0px)' : 'blur(16px)' }}
                    transition={{
                      duration: isHoldingKey ? 0.5 : 0,
                      ease: "easeOut"
                    }}
                    className="w-full break-all leading-normal font-technical text-zinc-350"
                  >
                    {keyPair.privateKey}
                  </motion.div>
                  
                  {/* Overlay text description when not revealed */}
                  <motion.div 
                    animate={{ opacity: isHoldingKey ? 0 : 1 }}
                    transition={{
                      duration: isHoldingKey ? 0.5 : 0,
                      ease: "easeOut"
                    }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 pointer-events-none gap-1 bg-opacity-70 backdrop-blur-[1px]"
                  >
                    <Terminal className="w-4 h-4 text-primary-400 shrink-0 mb-1" />
                    <span className="text-[10px] font-accent font-bold tracking-wider text-zinc-200">
                      HOLD CLICK TO REVEAL KEY
                    </span>
                  </motion.div>
 
                  {/* Microscopic reveal progress bar along bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-950">
                    <motion.div 
                      animate={{ width: isHoldingKey ? '100%' : '0%' }}
                      transition={{
                        duration: isHoldingKey ? 0.5 : 0,
                        ease: "linear"
                      }}
                      className="h-full bg-primary-600"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGenerateKey}
                disabled={isGeneratingKey}
                className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white font-semibold font-form text-xs tracking-wider rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border-none outline-none"
              >
                {isGeneratingKey ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <Key className="w-4 h-4" />
                )}
                <span>Generate New Cryptographic Key Pair</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ─── DEFCON LOCKDOWN CONTROL MATRIX ─── */}
      <div className="bg-red-950/5 border border-red-500/15 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mt-4 relative overflow-hidden select-none">
        {/* Background danger linear wash */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/[0.02] to-transparent pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2 text-red-500">
            <Lock className="w-4 h-4" />
            <span className="text-[10px] font-accent font-bold tracking-widest uppercase">
              Emergency Containment
            </span>
          </div>
          <h2 className="text-sm font-semibold text-zinc-200 mt-1 uppercase font-display tracking-wide">
            Automated Defcon Lockdown Protocol
          </h2>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed max-w-xl">
            In the event of an active intrusion, execute global session revocation to securely terminate and invalidate all online user JWT session tokens.
          </p>
        </div>

        <button
          onClick={() => setIsDefconModalOpen(true)}
          className="px-6 py-3 border border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5 text-red-400 hover:text-red-300 font-bold text-xs tracking-wider rounded-xl transition-all font-form shrink-0 relative z-10 cursor-pointer bg-transparent outline-none"
        >
          Execute Global Session Revocation
        </button>
      </div>

      {/* ─── DEFCON CONFIRMATION MODAL ─── */}
      <AnimatePresence>
        {isDefconModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
            
            {/* Pulsing red lockdown glow */}
            <div className="absolute w-[500px] h-[500px] rounded-full bg-red-500 filter blur-[150px] opacity-15 pointer-events-none animate-pulse" />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="bg-zinc-950 border border-red-500/20 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-5 relative z-10 bg-opacity-95"
            >
              <div className="flex items-start gap-3 text-red-500">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-md font-bold font-display text-white uppercase tracking-tight">
                    Initiate Defcon Lockdown?
                  </h3>
                  <p className="text-xs text-zinc-400 font-sans mt-2 leading-relaxed pr-1">
                    You are about to cryptographically invalidate all active user sessions across the entire ecosystem. Every attendee and organizer currently logged in will be instantly severed and forced to re-authenticate. This is a catastrophic intervention.
                  </p>
                </div>
              </div>

              {/* Type to confirm block */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-technical">
                  Type <span className="text-red-400 font-mono">initiate global lockdown</span> to verify
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={lockdownConfirmation}
                  onChange={(e) => setLockdownConfirmation(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/5 focus:border-red-500/30 focus:ring-2 focus:ring-red-500/10 px-4 py-2.5 rounded-xl text-xs text-white placeholder:text-zinc-750 font-form outline-none transition-all duration-200"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-2">
                <button
                  onClick={() => {
                    setIsDefconModalOpen(false);
                    setLockdownConfirmation('');
                  }}
                  disabled={isLockingDown}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 text-zinc-350 rounded-lg text-xs font-semibold font-form transition-colors cursor-pointer outline-none bg-transparent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteLockdown}
                  disabled={isLockingDown || lockdownConfirmation !== 'initiate global lockdown'}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white rounded-lg text-xs font-bold font-form transition-colors cursor-pointer outline-none border-none flex items-center gap-1.5"
                >
                  {isLockingDown ? (
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5" />
                  )}
                  <span>{isLockingDown ? 'Executing...' : 'Confirm Lockdown'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
