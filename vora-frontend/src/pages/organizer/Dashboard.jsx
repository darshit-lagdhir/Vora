import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Radio, 
  DownloadCloud, 
  PieChart, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  Video,
  Clock,
  ChevronRight,
  TrendingUp,
  FileDown,
  Calendar
} from 'lucide-react';
import apiClient from '../../services/apiClient.js';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [sessions, setSessions] = useState([]);
  
  // Custom SVG Chart States (Task 3 & 4)
  const [animateChart, setAnimateChart] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const svgRef = useRef(null);

  // Time-Series Plotting Raw Data Matrix
  const [rawData, setRawData] = useState([
    { hour: '09:00', value: 120 },
    { hour: '11:00', value: 280 },
    { hour: '13:00', value: 190 },
    { hour: '15:00', value: 450 },
    { hour: '17:00', value: 380 },
    { hour: '19:00', value: 620 },
    { hour: '21:00', value: 580 }
  ]);

  // Dynamically map values to coordinate points in the 500x200 viewbox (Task 3)
  const chartData = rawData.map((d, i) => {
    const x = (i / (rawData.length - 1)) * 500;
    const maxVal = Math.max(...rawData.map(pt => pt.value), 700);
    // Project values to y coordinates (y = 0 is top, y = 200 is bottom)
    const y = 175 - (d.value / maxVal) * 140; // Scale between 35 and 175 y height
    return { ...d, x, y };
  });

  const getBezierPath = (points) => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      d += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${p1.x},${p1.y}`;
    }
    return d;
  };

  const getAreaPath = (points) => {
    const linePath = getBezierPath(points);
    if (!linePath) return '';
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const baselineY = 200; // viewbox baseline height
    return `${linePath} L ${lastPoint.x},${baselineY} L ${firstPoint.x},${baselineY} Z`;
  };

  // Localized Fetch Request for Active Session Streams (Task 8 & 9)
  const fetchActiveSessions = async () => {
    try {
      const response = await apiClient.get('/api/v1/events/active');
      if (response?.data?.success) {
        const mappedEvents = response.data.data.map(event => {
          const startTime = new Date(event.start_timestamp).getTime();
          const endTime = new Date(event.end_timestamp).getTime();
          
          const startLocalStr = new Date(event.start_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          const endLocalStr = new Date(event.end_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          
          return {
            id: event.id,
            title: event.title,
            timeText: `${startLocalStr} - ${endLocalStr} Local`,
            startTime,
            endTime,
            registrants: parseInt(event.registrants, 10) || 0
          };
        });
        setSessions(mappedEvents);
      }
    } catch (err) {
      console.error('[Dashboard] Error polling active event streams:', err);
    }
  };

  // Simulated Asynchronous Data Hydration & Polling (Task 2 & 9)
  useEffect(() => {
    const hydrateData = async () => {
      setStats([
        {
          title: "TOTAL REGISTRATIONS",
          value: 1240,
          variance: 14.5,
          icon: Users,
          label: "Total registered event attendees"
        },
        {
          title: "ACTIVE SESSIONS",
          value: 12,
          variance: 0.0,
          icon: Radio,
          label: "Webinars actively broadcast"
        },
        {
          title: "RESOURCE DOWNLOADS",
          value: 348,
          variance: 22.4,
          icon: DownloadCloud,
          label: "Total event asset downloads"
        },
        {
          title: "TOTAL CAPACITY LIMIT",
          value: 5000,
          variance: -3.2,
          icon: PieChart,
          label: "Total platform seating limits"
        }
      ]);

      await fetchActiveSessions();
      setLoading(false);
      // Trigger SVG draw path transition
      setTimeout(() => setAnimateChart(true), 150);
    };

    hydrateData();

    // Silent background polling configuration (Task 9)
    const pollInterval = setInterval(() => {
      console.log('[Dashboard] Executing background statistics synchronization...');
      fetchActiveSessions();
      
      // Update the chart raw data with simulated jitter to show dynamic updates
      setRawData(prev => {
        return prev.map((item, idx) => {
          if (idx === prev.length - 1) {
            const jitter = Math.floor(Math.random() * 40) - 20;
            return { ...item, value: Math.max(100, item.value + jitter) };
          }
          return item;
        });
      });
    }, 60000);

    return () => clearInterval(pollInterval);
  }, []);

  // Numbers formatting utility (Task 5)
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    if (num < 1000) return num.toString();
    if (num < 1000000) {
      const formatted = (num / 1000).toFixed(1);
      return formatted.endsWith('.0') ? formatted.slice(0, -2) + 'K' : formatted + 'K';
    }
    const formatted = (num / 1000000).toFixed(1);
    return formatted.endsWith('.0') ? formatted.slice(0, -2) + 'M' : formatted + 'M';
  };

  // SVG Chart Scrubbing Coordinate Calculation (Task 6)
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to 500x200 viewbox coordinates
    const svgX = (mouseX / rect.width) * 500;
    
    // Locate the closest data node
    let closestNode = chartData[0];
    let minDiff = Math.abs(chartData[0].x - svgX);
    
    for (let i = 1; i < chartData.length; i++) {
      const diff = Math.abs(chartData[i].x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestNode = chartData[i];
      }
    }
    
    setHoveredNode(closestNode);

    // Calculate tooltip popup coordinates relative to client page positioning
    const tooltipX = (closestNode.x / 500) * rect.width;
    const tooltipY = (closestNode.y / 200) * rect.height - 40;
    setTooltipPos({ x: tooltipX, y: tooltipY });
  };

  const handleMouseLeave = () => {
    setHoveredNode(null);
  };

  // Reconcile Session Node Status (Task 8)
  const getSessionStatus = (session) => {
    const now = Date.now();
    if (now >= session.startTime && now <= session.endTime) {
      return { text: "LIVE NOW", color: "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30 animate-pulse" };
    }
    if (now < session.startTime && (session.startTime - now) <= 60 * 60 * 1000) {
      return { text: "STARTING SOON", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    }
    return { text: "SCHEDULED", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
  };

  // Chronological Sorting Algorithm for Activity Feed Nodes (Task 8)
  const sortedSessions = [...sessions].sort((a, b) => {
    const now = Date.now();
    const aActive = now >= a.startTime && now <= a.endTime;
    const bActive = now >= b.startTime && now <= b.endTime;
    
    const aStartingSoon = !aActive && (a.startTime - now > 0) && (a.startTime - now <= 60 * 60 * 1000);
    const bStartingSoon = !bActive && (b.startTime - now > 0) && (b.startTime - now <= 60 * 60 * 1000);

    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;

    if (aStartingSoon && !bStartingSoon) return -1;
    if (!aStartingSoon && bStartingSoon) return 1;

    return a.startTime - b.startTime;
  });

  return (
    <div className="space-y-8 select-none">
      
      {/* CSS Animations & Layout Parameters Injection */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-card {
          background: linear-gradient(90deg, rgba(30, 41, 59, 0.45) 25%, rgba(51, 65, 85, 0.55) 50%, rgba(30, 41, 59, 0.45) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
          border: 1px solid rgba(30, 41, 59, 0.5);
        }
        .metric-card {
          background: rgba(17, 24, 39, 0.5);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(30, 41, 59, 0.6);
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .metric-card:hover {
          transform: translateY(-4px);
          border-color: rgba(139, 92, 246, 0.8);
          box-shadow: 0 12px 25px -5px rgba(139, 92, 246, 0.25), 0 8px 10px -6px rgba(139, 92, 246, 0.25);
        }
        .dashboard-pane {
          background: linear-gradient(rgba(17, 24, 39, 0.35), rgba(17, 24, 39, 0.35)) padding-box,
                      linear-gradient(to bottom right, rgba(99, 102, 241, 0.35), rgba(6, 182, 212, 0.05)) border-box;
          border: 1px solid transparent;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .tooltip-glass {
          background: rgba(17, 24, 39, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(17, 24, 39, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
        .path-line {
          stroke-dasharray: 1000;
          stroke-dashoffset: ${animateChart ? 0 : 1000};
          transition: stroke-dashoffset 800ms ease-out;
        }
      `}</style>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Organizer Dashboard</h2>
          <p className="text-brand-muted text-sm mt-1">Configure registrations and resources for your virtual sessions.</p>
        </div>
        <button 
          onClick={() => alert('Feature mock-up: Create Event Dialog')}
          className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-accent-violet to-accent-blue text-white font-semibold rounded-xl hover:opacity-90 transition duration-200 shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Event</span>
        </button>
      </div>

      {/* High-Density Analytics Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array(4).fill(0).map((_, idx) => (
            <div key={idx} className="shimmer-card h-32 rounded-2xl p-6 relative overflow-hidden" />
          ))
        ) : (
          stats.map((stat, idx) => {
            const Icon = stat.icon;
            const isPositive = stat.variance > 0;
            
            return (
              <div 
                key={idx} 
                className="metric-card h-32 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between"
                role="group"
                aria-label={stat.label}
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider block">
                    {stat.title}
                  </span>
                  <div className="flex items-baseline space-x-3">
                    <span 
                      className="text-3xl font-extrabold text-white tracking-tight font-mono"
                      aria-live="polite"
                    >
                      {formatNumber(stat.value)}
                    </span>
                    {stat.variance !== 0 && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPositive 
                          ? 'bg-status-success/10 text-status-success' 
                          : 'bg-status-danger/10 text-status-danger'
                      }`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                        {Math.abs(stat.variance)}%
                      </span>
                    )}
                    {stat.variance === 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-card text-brand-muted">
                        Static
                      </span>
                    )}
                  </div>
                </div>
                <div className="absolute top-4 right-4 text-accent-violet/25 bg-accent-violet/5 p-2 rounded-xl border border-accent-violet/10 shadow-[0_0_15px_rgba(139,92,246,0.15)] pointer-events-none">
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DUAL-PANE ASYMMETRIC GRID COMMAND TIER (Task 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* EVENT MONITORING GRID CANVAS (Left Pane - 70% width) */}
        <div className="lg:col-span-7 dashboard-pane p-6 rounded-2xl shadow-xl flex flex-col justify-between min-h-[380px] relative overflow-hidden">
          
          {/* Ambient Lighting Edge separator line */}
          <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-accent-violet/40 via-accent-blue/20 to-transparent"></div>

          {/* Header row */}
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white tracking-tight">
                Network Ingestion and Registration Velocity
              </h3>
              <p className="text-xs text-brand-muted">Real-time attendee registration trends mapped over timezone epochs.</p>
            </div>
            
            <div className="flex bg-brand-dark/50 border border-brand-card rounded-lg p-1 text-[10px] font-bold">
              <span className="px-2.5 py-1 rounded-md bg-accent-violet/15 text-accent-violet cursor-pointer">Last 24 Hours</span>
              <span className="px-2.5 py-1 rounded-md text-brand-muted hover:text-slate-200 cursor-pointer">Last 7 Days</span>
            </div>
          </div>

          {/* SVG Analytics Canvas Workspace (Task 3) */}
          <div className="flex-1 w-full relative flex items-center justify-center min-h-[220px]">
            {loading ? (
              <div className="absolute inset-0 shimmer-card rounded-xl"></div>
            ) : (
              <div className="w-full h-full relative">
                
                {/* SVG Graph rendering node */}
                <svg
                  ref={svgRef}
                  viewBox="0 0 500 200"
                  className="w-full h-full overflow-visible"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Background Grid Lines (Task 3) */}
                  <g className="grid-lines">
                    {/* Horizontal lines */}
                    {[0, 50, 100, 150, 200].map((yVal, i) => (
                      <line 
                        key={i} 
                        x1="0" 
                        y1={yVal} 
                        x2="500" 
                        y2={yVal} 
                        stroke="rgba(255, 255, 255, 0.05)" 
                        strokeWidth="1" 
                      />
                    ))}
                    {/* Vertical lines */}
                    {[0, 83.33, 166.67, 250, 333.33, 416.67, 500].map((xVal, i) => (
                      <line 
                        key={i} 
                        x1={xVal} 
                        y1="0" 
                        x2={xVal} 
                        y2="200" 
                        stroke="rgba(255, 255, 255, 0.05)" 
                        strokeWidth="1" 
                      />
                    ))}
                  </g>

                  {/* Volume Area Gradient Mask (Task 5) */}
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>

                  {/* Shading Area shape */}
                  <path 
                    d={getAreaPath(chartData)} 
                    fill="url(#areaGradient)" 
                    className="transition-opacity duration-300"
                  />

                  {/* Luminous Neon Bezier Wireframe Stroke Line (Task 4) */}
                  <path
                    d={getBezierPath(chartData)}
                    fill="none"
                    stroke="url(#strokeGradient)"
                    strokeWidth="2.5"
                    className="path-line"
                  />

                  {/* Axis typographies (Task 3) */}
                  <g className="axis-labels text-[10px] font-mono fill-slate-500">
                    {/* y-axis labels */}
                    <text x="8" y="45" textAnchor="start">600</text>
                    <text x="8" y="95" textAnchor="start">400</text>
                    <text x="8" y="145" textAnchor="start">200</text>
                    <text x="8" y="185" textAnchor="start">0</text>
                    {/* x-axis labels */}
                    {chartData.map((d, i) => {
                      let anchor = "middle";
                      if (i === 0) anchor = "start";
                      if (i === chartData.length - 1) anchor = "end";
                      return (
                        <text key={i} x={d.x} y="195" textAnchor={anchor}>
                          {d.hour}
                        </text>
                      );
                    })}
                  </g>

                  {/* Hover interactive vertical tracker line (Task 6) */}
                  {hoveredNode && (
                    <g>
                      <line
                        x1={hoveredNode.x}
                        y1="0"
                        x2={hoveredNode.x}
                        y2="200"
                        stroke="rgba(255, 255, 255, 0.10)"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <circle
                        cx={hoveredNode.x}
                        cy={hoveredNode.y}
                        r="5"
                        fill="#10b981"
                        stroke="white"
                        strokeWidth="1.5"
                        className="shadow-lg"
                      />
                    </g>
                  )}
                </svg>

                {/* Floating Scrubbing Tooltip Popup (Task 6) */}
                {hoveredNode && (
                  <div
                    className="absolute tooltip-glass p-3 rounded-xl shadow-2xl pointer-events-none text-xs space-y-1 z-20 transition-all duration-75"
                    style={{
                      left: `${tooltipPos.x}px`,
                      top: `${tooltipPos.y}px`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <div className="flex items-center space-x-2 text-[#9ca3af]">
                      <Clock className="w-3.5 h-3.5 text-accent-blue" />
                      <span className="font-semibold font-mono">{hoveredNode.hour} Epoch</span>
                    </div>
                    <div className="flex items-baseline space-x-1 mt-1">
                      <span className="text-sm font-bold text-white font-mono">{hoveredNode.value}</span>
                      <span className="text-[10px] text-brand-muted font-mono">Registrations</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* UPCOMING WEBINARS ACTIVITY FEED (Right Pane - 30% width) */}
        <div className="lg:col-span-3 dashboard-pane p-6 rounded-2xl shadow-xl flex flex-col justify-between min-h-[380px] relative overflow-hidden">
          
          {/* Ambient Lighting Edge separator line */}
          <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-accent-blue/40 via-status-success/20 to-transparent"></div>

          {/* Header row */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              {/* Pulsing real-time sync dot indicator (Task 7) */}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                Active Event Streams
              </h3>
            </div>
            <TrendingUp className="w-4 h-4 text-brand-muted" />
          </div>

          {/* Scrollable vertical channel / Horizontal carousel on mobile (Task 7 & 10) */}
          <div className="flex-1 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-hidden overflow-y-hidden lg:overflow-y-auto space-x-4 lg:space-x-0 space-y-0 lg:space-y-4 max-h-[140px] lg:max-h-[280px] custom-scrollbar pr-1 py-1">
            {loading ? (
              Array(3).fill(0).map((_, idx) => (
                <div key={idx} className="shimmer-card h-16 w-[280px] lg:w-full flex-shrink-0 rounded-xl overflow-hidden" />
              ))
            ) : (
              sortedSessions.length === 0 ? (
                // Zero-state default fallback graphic (Task 9)
                <div className="w-full h-full flex flex-col items-center justify-center text-center py-6 space-y-2 flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-brand-card flex items-center justify-center text-slate-500 border border-brand-card">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">No active sessions scheduled for this period.</p>
                  </div>
                </div>
              ) : (
                // Chronologically Sorted list nodes (Task 8)
                sortedSessions.map((session) => {
                  const status = getSessionStatus(session);
                  
                  return (
                    <div 
                      key={session.id} 
                      className="bg-brand-dark/45 border border-brand-card/45 p-3.5 rounded-xl flex justify-between items-center gap-3 hover:border-brand-card transition duration-200 flex-shrink-0 w-[280px] lg:w-full"
                    >
                      <div className="space-y-1 min-w-0">
                        <span className="text-xs font-semibold text-white block truncate">
                          {session.title}
                        </span>
                        <div className="flex items-center space-x-1.5 text-[10px] text-brand-muted font-semibold font-mono mt-1">
                          <Clock className="w-3.5 h-3.5 text-accent-blue" />
                          <span>{session.timeText}</span>
                        </div>
                      </div>

                      {/* Dynamic status capsule badge */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border flex-shrink-0 ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                  );
                })
              )
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;
