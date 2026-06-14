import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  Calendar, 
  DownloadCloud, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Ticket, 
  Activity, 
  Search, 
  ChevronDown,
  ChevronUp,
  AlertCircle, 
  Check, 
  FileSpreadsheet,
  Settings
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useAuth } from '../../context/AuthContext.jsx';
import apiClient from '../../services/apiClient.js';
import { toast } from '../../components/ui/Toast.jsx';
import Heading from '../../components/ui/Heading.jsx';

// ─── LOCAL SKELETON LOADING BLOCKS ──────────────────────────────────
function SkeletonMetricCard() {
  return (
    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden select-none shadow-soft">
      <div className="flex justify-between items-start">
        <div className="h-3 bg-zinc-800 rounded w-1/3 animate-pulse" />
        <div className="w-6 h-6 bg-zinc-800 rounded animate-pulse" />
      </div>
      <div className="h-9 bg-zinc-800 rounded w-1/2 mt-5 animate-pulse" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-zinc-900/20 border border-white/5 rounded-3xl p-6 h-80 flex flex-col justify-between animate-pulse">
      <div className="space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-1/4" />
        <div className="h-3 bg-zinc-850 rounded w-1/3" />
      </div>
      <div className="h-36 bg-zinc-850/50 rounded-xl w-full flex items-end justify-around p-4">
        {[40, 60, 35, 75, 55, 90].map((h, i) => (
          <div key={i} className="bg-zinc-800/40 w-12 rounded-t-lg" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between p-5 border-b border-white/5 last:border-none animate-pulse">
      <div className="space-y-1.5 flex-grow">
        <div className="h-4 bg-zinc-850 rounded w-1/4" />
        <div className="h-3 bg-zinc-900 rounded w-1/3" />
      </div>
      <div className="w-24 h-4 bg-zinc-850 rounded mr-12" />
      <div className="w-16 h-5 bg-zinc-850 rounded-full" />
    </div>
  );
}

// ─── ANIMATED COUNTING CUSTOM REACT HOOK ────────────────────────────
function useAnimatedCounter(targetValue, duration = 800) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const end = parseFloat(targetValue) || 0;
    const start = 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quadratic
      const ease = progress * (2 - progress);
      setCount(start + ease * (end - start));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [targetValue, duration]);

  return count;
}

// ─── RECHARTS OVERRIDDEN CUSTOM TOOLTIP ─────────────────────────────
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-950/95 border border-white/10 p-3.5 rounded-2xl shadow-2xl space-y-1 backdrop-blur-md text-left select-none z-50">
        <span className="text-[10px] font-bold font-accent text-zinc-550 block uppercase tracking-wider leading-none">
          {label}
        </span>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-sm font-semibold text-white font-technical leading-none">
            ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-zinc-500 font-sans">Net Vol</span>
        </div>
      </div>
    );
  }
  return null;
};

// ─── FINANCIAL COMMAND PANEL PAGE ───────────────────────────────────
export default function Financials() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  // Zero-Trust Session Verification
  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate('/auth');
      else if (user.role !== 'organizer') navigate('/attendee');
    }
  }, [user, authLoading, navigate]);

  // Core Data States
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [timePreset, setTimePreset] = useState('30D'); // 7D, 30D, 90D
  const [isLoading, setIsLoading] = useState(true);
  
  // Interactive Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRowId, setExpandedRowId] = useState(null);

  // CSV Export States
  const [isExporting, setIsExporting] = useState(false);
  const [isExportComplete, setIsExportComplete] = useState(false);

  // Fetch data on parameters update
  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const url = `/api/v1/organizer/analytics?timeframe=${timePreset}${selectedEventId ? `&eventId=${selectedEventId}` : ''}`;
      const res = await apiClient.get(url);
      if (res.data?.success) {
        setAnalyticsData(res.data.data);
      }
    } catch (err) {
      console.error('[Financials] Analytics fetch error:', err);
      toast('Failed to load financials telemetry database.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'organizer') {
      fetchAnalytics();
    }
  }, [timePreset, selectedEventId, user]);

  // Compute metrics with animated transitions
  const metrics = analyticsData?.metrics || {
    grossVolume: 0,
    netRevenue: 0,
    conversionRate: 0,
    resourceDownloads: 0,
    ticketsIssued: 0
  };

  const countGross = useAnimatedCounter(metrics.grossVolume);
  const countNet = useAnimatedCounter(metrics.netRevenue);
  const countConversion = useAnimatedCounter(metrics.conversionRate);
  const countDownloads = useAnimatedCounter(metrics.resourceDownloads);

  // Filter transaction listings
  const filteredTransactions = useMemo(() => {
    if (!analyticsData?.transactions) return [];
    if (!searchTerm.trim()) return analyticsData.transactions;

    const term = searchTerm.toLowerCase().trim();
    return analyticsData.transactions.filter(txn => 
      (txn.id || '').toLowerCase().includes(term) ||
      (txn.customerName || '').toLowerCase().includes(term) ||
      (txn.customerEmail || '').toLowerCase().includes(term) ||
      (txn.eventTitle || '').toLowerCase().includes(term)
    );
  }, [analyticsData, searchTerm]);

  // CSV Export handler
  const handleExportCSV = async () => {
    setIsExporting(true);
    setIsExportComplete(false);

    try {
      const url = `/api/v1/organizer/analytics/export?timeframe=${timePreset}${selectedEventId ? `&eventId=${selectedEventId}` : ''}`;
      const response = await apiClient.get(url, { responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const dlUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = dlUrl;
      link.download = `Vora_Ledger_${selectedEventId || 'all'}_${timePreset}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExportComplete(true);
      toast('Data ledger successfully compiled and downloaded to your local machine.', 'success');
      setTimeout(() => {
        setIsExportComplete(false);
        setIsExporting(false);
      }, 2000);
    } catch (err) {
      console.error('[Financials] Export process error:', err);
      toast('Export compilation process failed. Please retry.', 'error');
      setIsExporting(false);
    }
  };

  const currentEventName = useMemo(() => {
    if (!selectedEventId || !analyticsData?.events) return '';
    const selectedEv = analyticsData.events.find(e => e.id === selectedEventId);
    return selectedEv ? selectedEv.title : '';
  }, [selectedEventId, analyticsData]);

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-zinc-950 text-white font-sans overflow-hidden">
      
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-24 space-y-8 select-none">
        
        {/* ─── TASK 1: ANALYTICAL VIEWPORT HEADER ─── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-zinc-900/40 pb-6 shrink-0">
          <div className="text-left">
            <Heading level="h1" className="text-3xl sm:text-4xl font-extrabold tracking-tighter text-white font-display uppercase leading-none">
              {selectedEventId ? "Event Performance Telemetry" : "Ecosystem Analytics"}
            </Heading>
            <p className="text-zinc-500 text-xs mt-1.5 flex items-center gap-2 font-medium">
              <Lock className="w-3.5 h-3.5 text-primary-500 shrink-0" />
              <span>
                {selectedEventId 
                  ? `Filtering details for "${currentEventName}"` 
                  : "Gateway active • Payout system synchronized"
                }
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Event selector dropdown */}
            <div className="relative">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="appearance-none bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white px-4 py-2.5 pr-10 rounded-xl text-xs font-semibold font-form transition-all cursor-pointer outline-none shadow-soft"
              >
                <option value="">All Events (Global)</option>
                {analyticsData?.events?.map(e => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* CSV Export Choreography button */}
            <button 
              id="btn-export-csv"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="text-xs font-semibold flex items-center justify-center gap-2 bg-zinc-900/50 hover:bg-zinc-900 disabled:opacity-75 disabled:cursor-not-allowed border border-zinc-800 hover:border-zinc-700 px-4 py-2.5 rounded-xl text-zinc-300 hover:text-white transition-all cursor-pointer outline-none"
            >
              {isExporting ? (
                <>
                  {isExportComplete ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Export Complete</span>
                    </>
                  ) : (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Compiling Data...</span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ─── TEMPORAL SCOPE NAVIGATION ─── */}
        <div className="flex flex-wrap items-center justify-between gap-4 sticky top-16 z-30 bg-zinc-950/95 backdrop-blur-md py-4 border-b border-white/5 shrink-0">
          <div>
            <h3 className="text-xs font-bold text-zinc-550 uppercase tracking-widest leading-none font-accent">
              Telemetry Chassis
            </h3>
          </div>
          
          <div className="flex items-center gap-3 relative">
            <div className="bg-zinc-900/40 border border-zinc-850 p-1 rounded-full flex items-center relative">
              {['7D', '30D', '90D'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setTimePreset(preset)}
                  className={`relative z-10 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-colors outline-none cursor-pointer border-none bg-transparent ${
                    timePreset === preset ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {timePreset === preset && (
                    <motion.div
                      layoutId="presetActivePill"
                      className="absolute inset-0 bg-zinc-800 rounded-full -z-10 shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── TASK 2: MACRO-METRICS SCORECARD CHASSIS ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => <SkeletonMetricCard key={idx} />)
          ) : (
            [
              { title: 'Gross Volume', icon: DollarSign, value: countGross, isCurrency: true, change: '+14.5%', isUp: true },
              { title: 'Net Revenue', icon: DollarSign, value: countNet, isCurrency: true, change: '+12.4%', isUp: true },
              { title: 'Conversion Rate', icon: Activity, value: countConversion, isCurrency: false, suffix: '%', change: 'Check-in rate', isUp: true },
              { title: 'Resource Downloads', icon: Ticket, value: countDownloads, isCurrency: false, change: '+8.3%', isUp: true }
            ].map((kpi, kIdx) => {
              const Icon = kpi.icon;
              return (
                <div 
                  key={kIdx} 
                  className="bg-zinc-900/30 backdrop-blur-xl border border-white/5 hover:border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:-translate-y-0.5 transition-all duration-300 shadow-soft"
                >
                  {/* Top bright gradient border lighting */}
                  <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/20 via-primary-500/5 to-transparent rounded-t-2xl" />
                  
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase block font-accent">
                      {kpi.title}
                    </span>
                    <div className="p-1.5 rounded-lg bg-zinc-950/80 border border-zinc-850 text-zinc-500">
                      <Icon className="w-3.5 h-3.5 text-primary-500" />
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between mt-5 text-left">
                    <h2 className="text-3xl font-semibold text-white tracking-tight tabular-nums font-technical">
                      {kpi.isCurrency ? '$' : ''}
                      {kpi.value.toLocaleString(undefined, { 
                        minimumFractionDigits: kpi.isCurrency ? 2 : 0, 
                        maximumFractionDigits: kpi.isCurrency ? 2 : 0 
                      })}
                      {kpi.suffix || ''}
                    </h2>
                    
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      kpi.isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-400'
                    }`}>
                      {kpi.isUp ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
                      <span>{kpi.change}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─── TASK 3: REST-DRIVEN DATA VISUALIZATION CANVAS ─── */}
        {isLoading ? (
          <SkeletonChart />
        ) : (
          <div className="bg-zinc-900/20 border border-white/5 rounded-3xl p-6 relative shadow-ambient">
            
            {/* Conditional Empty state in case chartData is empty */}
            {(!analyticsData || !analyticsData.chartData || analyticsData.chartData.length === 0) ? (
              // ─── TASK 6: EDITORIAL EMPTY STATE ───
              <div className="h-64 flex flex-col items-center justify-center text-center select-none py-6">
                <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-650 shadow-inner mb-4">
                  <Activity className="w-8 h-8 text-zinc-600 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight font-display uppercase">Telemetry Standing By</h3>
                <p className="text-xs text-zinc-500 font-sans mt-1 leading-relaxed max-w-xs mx-auto">
                  There is currently no registration or financial data to aggregate for this temporal scope.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1 mb-6 text-left">
                  <h3 className="text-sm font-bold text-white tracking-tight font-display uppercase">
                    Revenue Trajectory Map
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-sans">
                    Aggressive CSS overridden Recharts area plot monitoring cumulative Net values.
                  </p>
                </div>

                <div className="h-64 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={analyticsData.chartData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      
                      {/* Visual override gridlines */}
                      <CartesianGrid
                        strokeDasharray="4 4"
                        stroke="#1f1f23"
                        vertical={false}
                      />
                      
                      <XAxis
                        dataKey="label"
                        stroke="#52525b"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}
                      />
                      
                      <YAxis
                        stroke="#52525b"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                        style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500 }}
                        tickFormatter={(v) => `$${v}`}
                      />
                      
                      <Tooltip
                        content={<CustomChartTooltip />}
                        cursor={{ 
                          stroke: 'rgba(124, 58, 237, 0.25)', 
                          strokeDasharray: '4 4', 
                          strokeWidth: 1.5 
                        }}
                      />
                      
                      <Area
                        type="monotone"
                        dataKey="val"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#areaGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── TASK 4: HIGH-FIDELITY FINANCIAL LEDGER ─── */}
        <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-soft">
          
          {/* Header Toolbar */}
          <div className="p-6 border-b border-zinc-900/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
            <div className="text-left">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-accent">
                Detailed Transaction Ledger
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5 font-sans">
                Purchases, refunds, and registrants details dynamically generated.
              </p>
            </div>

            {/* Search Input Box */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search ledger..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 px-9 py-2.5 rounded-xl text-xs text-zinc-300 placeholder-zinc-650 outline-none transition-all font-form"
              />
            </div>
          </div>

          {/* Dynamic Flex Rows table */}
          <div className="flex flex-col w-full text-left">
            
            {/* Header row labels */}
            <div className="hidden md:flex items-center justify-between px-6 py-3 bg-zinc-950/40 border-b border-white/5 select-none text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-accent">
              <div className="w-40 shrink-0">Transaction ID</div>
              <div className="w-40 shrink-0">Date / Time</div>
              <div className="flex-grow">Attendee Details</div>
              <div className="w-56 shrink-0">Event Reference</div>
              <div className="w-28 shrink-0 text-right">Amount</div>
              <div className="w-28 shrink-0 text-right">Status</div>
            </div>

            {/* Table content list */}
            <div className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => <SkeletonRow key={idx} />)
              ) : filteredTransactions.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs font-sans">
                  No records matching the search query.
                </div>
              ) : (
                filteredTransactions.map((txn) => {
                  const isExpanded = expandedRowId === txn.id;
                  const isRefunded = txn.status === 'Refunded';
                  
                  return (
                    <div 
                      key={txn.id} 
                      className="border-b border-white/5 last:border-none hover:bg-zinc-900/10 transition-colors"
                    >
                      {/* Flex row trigger */}
                      <div
                        onClick={() => setExpandedRowId(isExpanded ? null : txn.id)}
                        className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 cursor-pointer gap-4 text-xs font-sans"
                      >
                        <div className="w-40 shrink-0 font-technical text-[10px] text-zinc-400 font-bold select-all tracking-wider">
                          {txn.id}
                        </div>
                        
                        <div className="w-40 shrink-0 text-zinc-500 font-technical">
                          {new Date(txn.date).toLocaleDateString()} {new Date(txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </div>

                        <div className="flex-grow text-left">
                          <span className="font-semibold text-zinc-200 block font-sans">{txn.customerName}</span>
                          <span className="text-[10px] text-zinc-500 block truncate font-sans">{txn.customerEmail}</span>
                        </div>

                        <div className="w-56 shrink-0 text-zinc-300 font-semibold truncate text-left">
                          {txn.eventTitle}
                        </div>

                        <div className={`w-28 shrink-0 text-right font-technical font-bold text-white tabular-nums ${
                          isRefunded ? 'line-through text-zinc-600' : ''
                        }`}>
                          ${txn.amount.toFixed(2)}
                        </div>

                        <div className="w-28 shrink-0 text-right flex items-center justify-end gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none ${
                            txn.status === 'Succeeded' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/10' :
                            txn.status === 'Pending' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/10' :
                            'bg-zinc-800 text-zinc-500'
                          }`}>
                            {txn.status}
                          </span>
                          
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </div>

                      {/* Expandable Details Drawer */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="overflow-hidden bg-zinc-950/40 border-t border-white/5 px-6 py-4 text-xs text-zinc-400 text-left space-y-2 select-none"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-technical">
                                  Routing Telemetry
                                </span>
                                <p className="font-mono text-[10px] text-zinc-400 mt-1">Status Code: HTTP 200 OK</p>
                                <p className="font-mono text-[10px] text-zinc-400">Response Delay: 85ms</p>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-technical">
                                  Cryptographic Signature
                                </span>
                                <p className="font-mono text-[10px] text-zinc-400 mt-1 truncate">
                                  SHA-256: {txn.id.substring(4)}8b9c2d7f5a0e9c
                                </p>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-technical">
                                  Settlement Options
                                </span>
                                <p className="text-zinc-400 mt-1 font-sans">
                                  Payout routing active. Processing fees: ${(txn.amount * 0.029 + 0.30).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
