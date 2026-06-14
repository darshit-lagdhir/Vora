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
  UserCheck,
  UserX
} from 'lucide-react';
import apiClient from '../../services/apiClient.js';
import VirtualLedger from '../../components/VirtualLedger.jsx';

const Attendees = () => {
  // Primary States
  const [registrations, setRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [meta, setMeta] = useState({ total_items: 0, total_pages: 1, current_page: 1, limit: 50 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [selectedEventId, setSelectedEventId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // Bulk Actions Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkMutating, setBulkMutating] = useState(false);

  // Debounce search input changes by 300ms to reduce database queries load
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
      setSelectedIds([]);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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
        limit: 50, // Increase default page size to 50 for virtualized viewport scrolling
        event_id: selectedEventId || undefined,
        search: debouncedSearch.trim() || undefined,
        status: (statusFilter && statusFilter !== 'All') ? statusFilter.toLowerCase() : undefined
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
  }, [currentPage, selectedEventId, debouncedSearch, statusFilter]);

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
  };

  // Status mutation logic for single attendee row
  const handleUpdateStatus = async (id, registration_status, has_checked_in) => {
    try {
      const res = await apiClient.patch(`/api/v1/registrations/${id}`, {
        registration_status,
        has_checked_in
      });

      if (res?.data?.success) {
        const updated = res.data.data;
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

  // Bulk mutations dispatcher
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
        const updatedItems = res.data.data;
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

  // Local helper for initials fallback colors
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

  // Text formatter for alphanumeric ticket hashes
  const formatTicketHash = (hashString) => {
    if (!hashString) return 'N/A';
    const parts = hashString.split('-');
    if (parts.length >= 3) {
      return `${parts[0]}-${parts[1]}…`;
    }
    return hashString;
  };

  // Technical monospace timestamp formatter
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

  // Roster CSV Exporter
  const handleExportCSV = () => {
    if (registrations.length === 0) return;
    const headers = ['Attendee Name', 'Email Address', 'Event Name', 'Ticket Hash', 'Registration Status', 'Check-In Status', 'Created At'];
    
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

  // Status mapping to frontend display styles
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
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>VERIFIED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/25">
        <Clock className="w-3.5 h-3.5" />
        <span>NOT ARRIVED</span>
      </span>
    );
  };

  // Row context menu action map configuration
  const getRowActions = (reg) => {
    const actions = [];
    if (reg.registration_status === 'waitlisted') {
      actions.push({
        label: 'Approve Registration',
        icon: Check,
        onClick: () => handleUpdateStatus(reg.id, 'confirmed', false)
      });
      actions.push({
        label: 'Reject Registration',
        icon: X,
        isDestructive: true,
        onClick: () => handleUpdateStatus(reg.id, 'cancelled', false)
      });
    } else if (reg.registration_status === 'confirmed' && !reg.has_checked_in) {
      actions.push({
        label: 'Check In Attendee',
        icon: UserCheck,
        onClick: () => handleUpdateStatus(reg.id, 'confirmed', true)
      });
      actions.push({
        label: 'Revoke Ticket',
        icon: UserX,
        isDestructive: true,
        onClick: () => handleUpdateStatus(reg.id, 'cancelled', false)
      });
    } else if (reg.registration_status === 'confirmed' && reg.has_checked_in) {
      actions.push({
        label: 'Undo Check-In',
        icon: Clock,
        onClick: () => handleUpdateStatus(reg.id, 'confirmed', false)
      });
      actions.push({
        label: 'Revoke Ticket',
        icon: UserX,
        isDestructive: true,
        onClick: () => handleUpdateStatus(reg.id, 'cancelled', false)
      });
    } else if (reg.registration_status === 'cancelled') {
      actions.push({
        label: 'Restore Access',
        icon: Check,
        onClick: () => handleUpdateStatus(reg.id, 'confirmed', false)
      });
    }
    return actions;
  };

  // Define columns structure for the high-performance VirtualLedger
  const columnsConfig = [
    {
      key: 'attendee',
      header: 'Attendee',
      width: '2.5fr',
      sortable: true,
      sortSelector: (row) => `${row?.first_name || ''} ${row?.last_name || ''}`.toLowerCase(),
      render: (reg) => (
        <div className="flex items-center space-x-3 py-1">
          {reg.avatar_url ? (
            <img 
              src={reg.avatar_url} 
              alt={`${reg.first_name} avatar`} 
              className="w-8 h-8 rounded-full border border-white/10 object-cover shrink-0"
            />
          ) : (
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${getInitialsColor(reg.first_name, reg.last_name)}`}>
              {(reg.first_name?.[0] || '') + (reg.last_name?.[0] || '')}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-100 truncate max-w-[150px]">
              {reg.first_name} {reg.last_name}
            </p>
            <p className="text-[9px] font-mono text-zinc-500 truncate max-w-[170px] mt-0.5">
              {reg.email_address}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'event_title',
      header: 'Webinar Event',
      width: '2fr',
      sortable: true,
      render: (reg) => (
        <span className="text-xs font-medium text-zinc-300 line-clamp-1 max-w-[200px]" title={reg.event_title}>
          {reg.event_title}
        </span>
      )
    },
    {
      key: 'ticket_hash',
      header: 'Ticket Hash',
      width: '1.5fr',
      sortable: true,
      render: (reg) => (
        <span className="text-xs font-mono font-bold text-primary-400 uppercase" title={reg.ticket_hash}>
          {formatTicketHash(reg.ticket_hash)}
        </span>
      )
    },
    {
      key: 'has_checked_in',
      header: 'Check-In Status',
      width: '1.5fr',
      sortable: true,
      sortSelector: (row) => `${row.registration_status}_${row.has_checked_in}`,
      render: (reg) => getStatusBadge(reg.registration_status, reg.has_checked_in)
    },
    {
      key: 'created_at',
      header: 'Registered Date',
      width: '1.8fr',
      sortable: true,
      render: (reg) => (
        <span className="text-xs font-mono text-zinc-400">
          {formatTimestampMonospace(reg.created_at)}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-full min-h-0">
      
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5 font-display">
            <Users className="w-6 h-6 text-primary-500" />
            <span>Attendee Ledger</span>
          </h2>
          <p className="text-zinc-400 text-xs mt-1 font-sans">
            Review live check-in vectors, verify waitlists, and manage ticketing credentials.
          </p>
        </div>
      </div>

      {/* Global search, filters, and bulk action toolbar */}
      <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 relative">
        <div className="absolute left-0 right-0 top-0 h-[0.5px] bg-gradient-to-r from-primary-500/10 to-transparent" />
        
        {selectedIds.length > 0 ? (
          /* Bulk actions toolbar layout when rows are checked */
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1.5">
            <div className="flex items-center space-x-3">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-white font-sans">
                {selectedIds.length} Registrations Selected
              </span>
              <button 
                onClick={() => setSelectedIds([])}
                className="text-zinc-500 hover:text-zinc-300 text-xs underline font-medium"
              >
                Clear selection
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                disabled={bulkMutating}
                onClick={() => handleBulkUpdate('confirmed', undefined)}
                className="px-3 py-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-lg font-bold flex items-center space-x-1.5 transition duration-200"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve</span>
              </button>
              <button
                disabled={bulkMutating}
                onClick={() => handleBulkUpdate('cancelled', undefined)}
                className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white rounded-lg font-bold flex items-center space-x-1.5 transition duration-200"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Revoke</span>
              </button>
              <button
                disabled={bulkMutating}
                onClick={() => handleBulkUpdate(undefined, true)}
                className="px-3 py-1.5 text-xs bg-primary-500/10 hover:bg-primary-500 border border-primary-500/20 text-primary-400 hover:text-white rounded-lg font-bold flex items-center space-x-1.5 transition duration-200"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Verify Check-In</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-lg font-bold flex items-center space-x-1.5 transition duration-200"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        ) : (
          /* Default filter toolbar layout */
          <div className="flex-1 flex flex-col md:flex-row items-center gap-3">
            {/* Debounced Search Input */}
            <div className="relative w-full md:max-w-xs shrink-0">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search ticket hash, visitor email..."
                className="w-full bg-zinc-950/40 border border-white/5 focus:border-primary-500 focus:outline-none rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-zinc-600 transition duration-200 focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Event selector dropdown */}
            <div className="relative w-full md:max-w-xs shrink-0">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
                <Calendar className="w-4 h-4 text-zinc-500" />
              </span>
              <select
                value={selectedEventId}
                onChange={handleEventFilterChange}
                className="w-full bg-zinc-950/40 border border-white/5 focus:border-primary-500 focus:outline-none rounded-xl py-2 pl-9 pr-4 text-xs text-white appearance-none cursor-pointer"
              >
                <option value="">All Hosted Events</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>{event.title}</option>
                ))}
              </select>
            </div>

            {/* Status dropdown */}
            <div className="relative w-full md:max-w-xs shrink-0">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
                <Filter className="w-4 h-4 text-zinc-500" />
              </span>
              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="w-full bg-zinc-950/40 border border-white/5 focus:border-primary-500 focus:outline-none rounded-xl py-2 pl-9 pr-4 text-xs text-white appearance-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Verified">Verified (Checked-In)</option>
                <option value="Pending">Pending (Waitlist)</option>
                <option value="Not_Arrived">Not Arrived (Confirmed)</option>
                <option value="Revoked">Revoked (Cancelled)</option>
              </select>
            </div>

            {/* Export CSV Button */}
            {registrations.length > 0 && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="ml-auto w-full md:w-auto px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition duration-200"
              >
                <Download className="w-4 h-4 text-primary-400 animate-pulse" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Roster Grid Container using High-Performance VirtualLedger */}
      <div className="flex-grow min-h-0 relative">
        {error && (
          <div className="absolute inset-x-6 top-6 z-40 bg-red-500/10 border border-red-500/25 p-4 rounded-xl flex items-start space-x-3 text-xs text-red-400">
            <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold">Roster synchronization failure</h5>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        <VirtualLedger
          data={registrations}
          columns={columnsConfig}
          rowHeight={56}
          isLoading={loading}
          enableSelection={true}
          selectedIds={selectedIds}
          onToggleRowSelection={handleToggleRowSelection}
          onToggleAllSelection={handleToggleAllSelection}
          getRowActions={getRowActions}
          emptyStateTitle="No registrations found"
          emptyStateDescription="No ticket bookings matched your filtering criteria. Check back later or adjust parameters."
        />
      </div>

      {/* Pagination Footer Controls */}
      {!loading && meta.total_pages > 1 && (
        <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 px-4 py-3 rounded-2xl flex items-center justify-between shrink-0 relative">
          <div className="absolute left-0 right-0 top-0 h-[0.5px] bg-gradient-to-r from-primary-500/10 to-transparent" />
          <div className="hidden sm:flex text-xs text-zinc-400">
            Showing page <span className="font-bold text-white mx-1">{meta.current_page}</span> of <span className="font-bold text-white mx-1">{meta.total_pages}</span> ({meta.total_items} entries)
          </div>
          
          <div className="flex items-center space-x-1.5 ml-auto sm:ml-0">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition duration-200"
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
                  className={`w-8 h-8 rounded-xl font-mono text-xs font-bold border transition duration-200 ${
                    isActive 
                      ? 'bg-primary-600 border-primary-600 text-white' 
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              disabled={currentPage >= meta.total_pages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, meta.total_pages))}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition duration-200"
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
