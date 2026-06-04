import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Check, 
  X, 
  Clock, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  UserCheck,
  UserX,
  Trash2
} from 'lucide-react';
import apiClient from '../../services/apiClient.js';

const Attendees = () => {
  // Primary States
  const [registrations, setRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [meta, setMeta] = useState({ total_items: 0, total_pages: 1, current_page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [selectedEventId, setSelectedEventId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // Bulk Actions Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkMutating, setBulkMutating] = useState(false);

  // Fetch hosted events list (for the dropdown filter)
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await apiClient.get('/api/v1/events');
        if (res?.data?.success) {
          setEvents(res.data.data);
        }
      } catch (err) {
        console.error('[Roster] Failed to load organizer events:', err);
      }
    };
    fetchEvents();
  }, []);

  // Fetch registrations roster with active search/filters/pagination params
  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: 10,
        event_id: selectedEventId || undefined,
        search: searchQuery.trim() || undefined,
        status: statusFilter !== 'All' ? statusFilter.toLowerCase() : undefined
      };
      
      const res = await apiClient.get('/api/v1/registrations', { params });
      if (res?.data?.success) {
        setRegistrations(res.data.data);
        setMeta(res.data.meta);
      }
    } catch (err) {
      console.error('[Roster] Roster fetch failed:', err);
      setError(err.response?.data?.message || 'Error connecting to the administrative data channel.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedEventId, searchQuery, statusFilter]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Reset page parameter when filter criteria mutates
  const handleEventFilterChange = (e) => {
    setSelectedEventId(e.target.value);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  // Status mutation logic for single attendee row (Task 6)
  const handleUpdateStatus = async (id, registration_status, has_checked_in) => {
    try {
      const res = await apiClient.patch(`/api/v1/registrations/${id}`, {
        registration_status,
        has_checked_in
      });

      if (res?.data?.success) {
        const updated = res.data.data;
        // Immediate local state array swap to prevent complete layout re-renders
        setRegistrations(prev => prev.map(reg => {
          if (reg.id === id) {
            return {
              ...reg,
              registration_status: updated.registration_status,
              has_checked_in: updated.has_checked_in,
              updated_at: updated.updated_at
            };
          }
          return reg;
        }));
      }
    } catch (err) {
      console.error('[Roster] Single status update failed:', err);
      alert(err.response?.data?.message || 'Failed to modify registration status.');
    }
  };

  // Bulk mutations dispatcher (Task 8)
  const handleBulkUpdate = async (registration_status, has_checked_in) => {
    if (selectedIds.length === 0 || bulkMutating) return;
    setBulkMutating(true);
    try {
      const res = await apiClient.post('/api/v1/registrations/bulk-update', {
        ids: selectedIds,
        registration_status,
        has_checked_in
      });

      if (res?.data?.success) {
        const updatedItems = res.data.data; // array of updated rows
        setRegistrations(prev => prev.map(reg => {
          const match = updatedItems.find(item => item.id === reg.id);
          if (match) {
            return {
              ...reg,
              registration_status: match.registration_status,
              has_checked_in: match.has_checked_in,
              updated_at: match.updated_at
            };
          }
          return reg;
        }));
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('[Roster] Bulk update failed:', err);
      alert(err.response?.data?.message || 'Failed to execute bulk updates.');
    } finally {
      setBulkMutating(false);
    }
  };

  // Selection Checkbox handlers
  const handleToggleRowSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleToggleAllSelection = () => {
    if (selectedIds.length === registrations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(registrations.map(reg => reg.id));
    }
  };

  // Local helper for initials fallback colors (Task 3)
  const getInitialsColor = (firstName, lastName) => {
    const stringKey = `${firstName || ''} ${lastName || ''}`;
    let hash = 0;
    for (let i = 0; i < stringKey.length; i++) {
      hash = stringKey.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      'bg-indigo-600/30 text-indigo-400 border-indigo-500/30',
      'bg-cyan-600/30 text-cyan-400 border-cyan-500/30',
      'bg-emerald-600/30 text-emerald-400 border-emerald-500/30',
      'bg-amber-600/30 text-amber-400 border-amber-500/30',
      'bg-fuchsia-600/30 text-fuchsia-400 border-fuchsia-500/30',
      'bg-violet-600/30 text-violet-400 border-violet-500/30',
      'bg-rose-600/30 text-rose-400 border-rose-500/30'
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  // Text formatter for alphanumeric ticket hashes (Task 4)
  const formatTicketHash = (hashString) => {
    if (!hashString) return 'N/A';
    // Snip visual hash structure: VORA-XXXX-XXXX to VORA-XXXX
    const parts = hashString.split('-');
    if (parts.length >= 3) {
      return `${parts[0]}-${parts[1]}…`;
    }
    return hashString;
  };

  // Technical monospace timestamp formatter (Task 4)
  const formatTimestampMonospace = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, '0');
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${month} ${day} • ${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
  };

  // Roster CSV Exporter (Task 8)
  const handleExportCSV = () => {
    if (registrations.length === 0) return;
    const headers = ['Attendee Name', 'Email Address', 'Event Name', 'Ticket Hash', 'Registration Status', 'Check-In Status', 'Created At'];
    
    // Determine source array: either selected list or whole current page registrations
    const sourceData = selectedIds.length > 0 
      ? registrations.filter(reg => selectedIds.includes(reg.id))
      : registrations;

    const rows = sourceData.map(reg => [
      `"${reg.first_name} ${reg.last_name}"`,
      `"${reg.email_address}"`,
      `"${reg.event_title}"`,
      `"${reg.ticket_hash || 'N/A'}"`,
      `"${reg.registration_status}"`,
      `"${reg.has_checked_in ? 'Checked In' : 'Pending Check-In'}"`,
      `"${reg.created_at}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Vora_Attendee_Roster_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status mapping to frontend display styles (Task 5)
  const getStatusBadge = (status, hasCheckedIn) => {
    if (status === 'cancelled') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/25">
          <XCircle className="w-3.5 h-3.5" />
          <span>REVOKED</span>
        </span>
      );
    }
    if (status === 'waitlisted') {
      return (
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/25">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>PENDING</span>
        </span>
      );
    }
    if (hasCheckedIn) {
      return (
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>VERIFIED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/25">
        <Clock className="w-3.5 h-3.5" />
        <span>NOT ARRIVED</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 flex flex-col h-full min-h-0">
      
      {/* Tabular custom scrollbars and layout animations styles */}
      <style>{`
        .ledger-wrapper {
          position: relative;
          background: #090d16;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          min-height: 0;
          flex: 1;
          display: flex;
          flex-col: col;
          overflow: hidden;
        }
        .ledger-container {
          width: 100%;
          overflow: auto;
          flex: 1;
        }
        /* Custom scrollbars styling */
        .ledger-container::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .ledger-container::-webkit-scrollbar-track {
          background: rgba(11, 15, 22, 0.4);
        }
        .ledger-container::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.25);
          border-radius: 9999px;
        }
        .ledger-container::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.45);
        }
        /* Dual-axis sticky layout boundaries */
        .sticky-th {
          position: sticky;
          top: 0;
          z-index: 20;
          background: #090d16;
        }
        .sticky-col {
          position: sticky;
          left: 0;
          z-index: 10;
          background: #090d16;
        }
        .sticky-corner {
          position: sticky;
          top: 0;
          left: 0;
          z-index: 30;
          background: #090d16;
        }
        /* Row hovering glow rules */
        .ledger-row {
          background: transparent;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          transition: background 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ledger-row:hover {
          background: rgba(99, 102, 241, 0.05) !important;
          border-bottom-color: rgba(6, 182, 212, 0.4);
        }
        .ledger-row:hover .action-btn {
          opacity: 1;
        }
        .action-btn {
          opacity: 0.5;
          transition: opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        }
        /* Shimmering rows for loading transitions */
        .shimmer-bar {
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.02) 25%, rgba(255, 255, 255, 0.06) 50%, rgba(255, 255, 255, 0.02) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <Users className="w-6 h-6 text-accent-blue" />
            <span>Attendee Ledger</span>
          </h2>
          <p className="text-brand-muted text-xs mt-1">
            Review live check-in vectors, verify waitlists, and manage ticketing credentials.
          </p>
        </div>
      </div>

      {/* Global search, filters, and bulk action toolbar (Task 8) */}
      <div className="bg-[#0b0f19] border border-white/5 p-4 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
        {selectedIds.length > 0 ? (
          /* Bulk actions toolbar layout when rows are checked */
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1.5 animate-slide-in">
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-violet animate-pulse"></span>
              <span className="text-xs font-bold text-white">
                {selectedIds.length} Registrations Selected
              </span>
              <button 
                onClick={() => setSelectedIds([])}
                className="text-slate-500 hover:text-white text-xs underline"
              >
                Clear selection
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                disabled={bulkMutating}
                onClick={() => handleBulkUpdate('confirmed', undefined)}
                className="px-3.5 py-2 text-xs bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-xl font-bold flex items-center space-x-1.5 transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve</span>
              </button>
              <button
                disabled={bulkMutating}
                onClick={() => handleBulkUpdate('cancelled', undefined)}
                className="px-3.5 py-2 text-xs bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white rounded-xl font-bold flex items-center space-x-1.5 transition"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Revoke</span>
              </button>
              <button
                disabled={bulkMutating}
                onClick={() => handleBulkUpdate(undefined, true)}
                className="px-3.5 py-2 text-xs bg-accent-blue/10 hover:bg-accent-blue border border-accent-blue/20 text-accent-blue hover:text-white rounded-xl font-bold flex items-center space-x-1.5 transition"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Verify Check-In</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl font-bold flex items-center space-x-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        ) : (
          /* Default filter toolbar layout */
          <div className="flex-1 flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full md:max-w-xs shrink-0">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search ticket hash, visitor email..."
                className="w-full bg-black/40 border border-white/10 focus:border-accent-blue focus:outline-none rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-600 transition"
              />
            </div>

            {/* Event selector dropdown */}
            <div className="relative w-full md:max-w-xs shrink-0">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                <Calendar className="w-4 h-4 text-slate-500" />
              </span>
              <select
                value={selectedEventId}
                onChange={handleEventFilterChange}
                className="w-full bg-black/40 border border-white/10 focus:border-accent-blue focus:outline-none rounded-xl py-2 pl-9 pr-4 text-xs text-white appearance-none cursor-pointer"
              >
                <option value="">All Hosted Events</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>{event.title}</option>
                ))}
              </select>
            </div>

            {/* Status dropdown */}
            <div className="relative w-full md:max-w-xs shrink-0">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                <Filter className="w-4 h-4 text-slate-500" />
              </span>
              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="w-full bg-black/40 border border-white/10 focus:border-accent-blue focus:outline-none rounded-xl py-2 pl-9 pr-4 text-xs text-white appearance-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Verified">Verified (Checked-In)</option>
                <option value="Pending">Pending (Waitlist)</option>
                <option value="Not_Arrived">Not Arrived (Confirmed)</option>
                <option value="Revoked">Revoked (Cancelled)</option>
              </select>
            </div>

            {/* Export Toolbar Button */}
            {registrations.length > 0 && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="ml-auto w-full md:w-auto px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition duration-200"
              >
                <Download className="w-4 h-4 text-accent-blue" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Roster grid container */}
      <div className="ledger-wrapper">
        
        {/* Error Alert Box */}
        {error && (
          <div className="absolute inset-x-6 top-6 z-40 bg-red-500/10 border border-red-500/25 p-5 rounded-2xl flex items-start space-x-3 text-sm text-red-400">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold">Roster synchronization failure</h5>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Dynamic Outlet Table */}
        <div className="ledger-container custom-scrollbar">
          
          {loading ? (
            /* Shimmering rows during network request updates */
            <table className="w-full text-left border-collapse min-w-[900px] hidden md:table">
              <thead>
                <tr>
                  <th className="sticky-corner p-4 w-12 border-b border-white/5"></th>
                  <th className="sticky-th p-4 border-b border-white/5 text-xs font-bold text-slate-500 uppercase tracking-widest">Attendee</th>
                  <th className="sticky-th p-4 border-b border-white/5 text-xs font-bold text-slate-500 uppercase tracking-widest">Webinar Event</th>
                  <th className="sticky-th p-4 border-b border-white/5 text-xs font-bold text-slate-500 uppercase tracking-widest">Ticket Hash</th>
                  <th className="sticky-th p-4 border-b border-white/5 text-xs font-bold text-slate-500 uppercase tracking-widest">Check-In Status</th>
                  <th className="sticky-th p-4 border-b border-white/5 text-xs font-bold text-slate-500 uppercase tracking-widest">Registered Date</th>
                  <th className="sticky-th p-4 border-b border-white/5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-white/5">
                    <td className="p-4 w-12"><div className="w-4 h-4 shimmer-bar rounded"></div></td>
                    <td className="sticky-col p-4 flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full shimmer-bar shrink-0"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-28 shimmer-bar rounded"></div>
                        <div className="h-3 w-40 shimmer-bar rounded"></div>
                      </div>
                    </td>
                    <td className="p-4"><div className="h-4 w-44 shimmer-bar rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-20 shimmer-bar rounded"></div></td>
                    <td className="p-4"><div className="h-6 w-24 shimmer-bar rounded-full"></div></td>
                    <td className="p-4"><div className="h-4 w-28 shimmer-bar rounded"></div></td>
                    <td className="p-4"><div className="h-6 w-16 shimmer-bar rounded ml-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : registrations.length === 0 ? (
            /* Empty state message container */
            <div className="py-24 text-center space-y-4 max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto border border-white/10 text-slate-400">
                <Users className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">No registrations found</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  No ticket bookings matched your filtering criteria. Check back later or adjust parameters.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* DESKTOP DATA TABLE MATRIX VIEW (Task 2) */}
              <table className="w-full text-left border-collapse min-w-[900px] hidden md:table">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="sticky-corner p-4 w-12 border-b border-white/5">
                      <input 
                        type="checkbox"
                        checked={selectedIds.length === registrations.length && registrations.length > 0}
                        onChange={handleToggleAllSelection}
                        className="rounded border-white/10 bg-black/40 text-accent-blue focus:ring-accent-blue cursor-pointer w-4 h-4"
                      />
                    </th>
                    <th className="sticky-th p-4 border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Attendee
                    </th>
                    <th className="sticky-th p-4 border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Webinar Event
                    </th>
                    <th className="sticky-th p-4 border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Ticket Hash
                    </th>
                    <th className="sticky-th p-4 border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Check-In Status
                    </th>
                    <th className="sticky-th p-4 border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Registered Date
                    </th>
                    <th className="sticky-th p-4 border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => {
                    const isRowSelected = selectedIds.includes(reg.id);
                    
                    return (
                      <tr key={reg.id} className={`ledger-row ${isRowSelected ? 'bg-accent-violet/5' : ''}`}>
                        {/* Checkbox selector column */}
                        <td className="p-4 w-12">
                          <input 
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => handleToggleRowSelection(reg.id)}
                            className="rounded border-white/10 bg-black/40 text-accent-blue focus:ring-accent-blue cursor-pointer w-4 h-4"
                          />
                        </td>
                        
                        {/* Attendee profile spine composite column (Task 3) */}
                        <td className="sticky-col p-4">
                          <div className="flex items-center space-x-3">
                            {reg.avatar_url ? (
                              <img 
                                src={reg.avatar_url} 
                                alt={`${reg.first_name} avatar`} 
                                className="w-9 h-9 rounded-full border border-white/10 object-cover shrink-0"
                              />
                            ) : (
                              <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${getInitialsColor(reg.first_name, reg.last_name)}`}>
                                {(reg.first_name?.[0] || '') + (reg.last_name?.[0] || '')}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate max-w-[160px]">
                                {reg.first_name} {reg.last_name}
                              </p>
                              <p className="text-[10px] font-mono text-slate-500 truncate max-w-[180px] mt-0.5">
                                {reg.email_address}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Event title column */}
                        <td className="p-4">
                          <span className="text-xs font-semibold text-slate-300 line-clamp-1 max-w-[200px]" title={reg.event_title}>
                            {reg.event_title}
                          </span>
                        </td>

                        {/* Ticket reference code column (Task 4) */}
                        <td className="p-4">
                          <span className="text-xs font-mono font-bold text-accent-blue uppercase" title={reg.ticket_hash}>
                            {formatTicketHash(reg.ticket_hash)}
                          </span>
                        </td>

                        {/* Check-In badges column (Task 5) */}
                        <td className="p-4">
                          {getStatusBadge(reg.registration_status, reg.has_checked_in)}
                        </td>

                        {/* Registered date column (Task 4) */}
                        <td className="p-4 text-xs font-mono text-slate-400">
                          {formatTimestampMonospace(reg.created_at)}
                        </td>

                        {/* Inline action controllers grid column (Task 6) */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {reg.registration_status === 'waitlisted' && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(reg.id, 'confirmed', false)}
                                  className="action-btn p-1.5 bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-lg transition"
                                  title="Approve registration"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(reg.id, 'cancelled', false)}
                                  className="action-btn p-1.5 bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white rounded-lg transition"
                                  title="Reject registration"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {reg.registration_status === 'confirmed' && !reg.has_checked_in && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(reg.id, 'confirmed', true)}
                                  className="action-btn p-1.5 bg-accent-blue/10 hover:bg-accent-blue border border-accent-blue/20 text-accent-blue hover:text-white rounded-lg transition"
                                  title="Check In attendee"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(reg.id, 'cancelled', false)}
                                  className="action-btn p-1.5 bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white rounded-lg transition"
                                  title="Revoke access"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {reg.registration_status === 'confirmed' && reg.has_checked_in && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(reg.id, 'confirmed', false)}
                                  className="action-btn p-1.5 bg-slate-600/10 hover:bg-slate-600 border border-slate-500/20 text-slate-400 hover:text-white rounded-lg transition"
                                  title="Cancel check-in state"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(reg.id, 'cancelled', false)}
                                  className="action-btn p-1.5 bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white rounded-lg transition"
                                  title="Revoke access"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {reg.registration_status === 'cancelled' && (
                              <button
                                onClick={() => handleUpdateStatus(reg.id, 'confirmed', false)}
                                className="action-btn p-1.5 bg-slate-600/10 hover:bg-slate-600 border border-slate-500/20 text-slate-400 hover:text-white rounded-lg transition"
                                title="Reinstate ticket"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* MOBILE 1D CARD LIST OVERRIDE VIEW (Task 10) */}
              <div className="md:hidden p-4 space-y-4">
                {registrations.map((reg) => {
                  const isCardSelected = selectedIds.includes(reg.id);
                  return (
                    <div 
                      key={reg.id} 
                      className={`p-4 bg-white/[0.02] border rounded-2xl flex flex-col space-y-3.5 transition duration-200 ${
                        isCardSelected ? 'border-accent-violet bg-accent-violet/5' : 'border-white/5'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2.5">
                          <input 
                            type="checkbox"
                            checked={isCardSelected}
                            onChange={() => handleToggleRowSelection(reg.id)}
                            className="rounded border-white/10 bg-black/40 text-accent-blue focus:ring-accent-blue cursor-pointer w-4.5 h-4.5 shrink-0"
                          />
                          <div>
                            <h4 className="text-sm font-bold text-white">
                              {reg.first_name} {reg.last_name}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-500 block mt-0.5">{reg.email_address}</span>
                          </div>
                        </div>
                        {getStatusBadge(reg.registration_status, reg.has_checked_in)}
                      </div>

                      <div className="bg-black/20 p-3 rounded-xl space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">EVENT:</span>
                          <span className="text-slate-300 font-semibold truncate max-w-[180px]">{reg.event_title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">TICKET HASH:</span>
                          <span className="text-accent-blue font-mono font-bold">{reg.ticket_hash || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">REGISTERED:</span>
                          <span className="text-slate-400 font-mono">{formatTimestampMonospace(reg.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-1.5 border-t border-white/5">
                        {reg.registration_status === 'waitlisted' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(reg.id, 'confirmed', false)}
                              className="px-3.5 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(reg.id, 'cancelled', false)}
                              className="px-3.5 py-1.5 bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {reg.registration_status === 'confirmed' && !reg.has_checked_in && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(reg.id, 'confirmed', true)}
                              className="px-3.5 py-1.5 bg-accent-blue/10 hover:bg-accent-blue border border-accent-blue/20 text-accent-blue hover:text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Check In</span>
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(reg.id, 'cancelled', false)}
                              className="px-3.5 py-1.5 bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          </>
                        )}

                        {reg.registration_status === 'confirmed' && reg.has_checked_in && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(reg.id, 'confirmed', false)}
                              className="px-3.5 py-1.5 bg-slate-600/10 hover:bg-slate-600 border border-slate-500/20 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Undo Check-In</span>
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(reg.id, 'cancelled', false)}
                              className="px-3.5 py-1.5 bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          </>
                        )}

                        {reg.registration_status === 'cancelled' && (
                          <button
                            onClick={() => handleUpdateStatus(reg.id, 'confirmed', false)}
                            className="px-3.5 py-1.5 bg-slate-600/10 hover:bg-slate-600 border border-slate-500/20 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Restore Access</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>

      </div>

      {/* Pagination Footer Controls (Task 9) */}
      {!loading && meta.total_pages > 1 && (
        <div className="bg-[#0b0f19] border border-white/5 px-4 py-3 rounded-2xl flex items-center justify-between shrink-0">
          <div className="hidden sm:flex text-xs text-slate-400">
            Showing page <span className="font-bold text-white mx-1">{meta.current_page}</span> of <span className="font-bold text-white mx-1">{meta.total_pages}</span> ({meta.total_items} entries)
          </div>
          
          <div className="flex items-center space-x-1.5 ml-auto sm:ml-0">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: meta.total_pages }).map((_, i) => {
              const pNum = i + 1;
              const isActive = currentPage === pNum;
              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-8 h-8 rounded-xl font-mono text-xs font-bold border transition ${
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
              disabled={currentPage >= meta.total_pages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, meta.total_pages))}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Attendees;
