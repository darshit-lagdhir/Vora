import React, { useState, useEffect, useRef, useReducer, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import apiClient from '../../services/apiClient.js';
import BrutalistButton from '../../components/BrutalistButton.jsx';
import BrutalistInput from '../../components/BrutalistInput.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import VoraModal from '../../components/VoraModal.jsx';
import VirtualLedger from '../../components/VirtualLedger.jsx';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Globe, 
  Users, 
  TrendingUp, 
  Ticket, 
  Activity, 
  DollarSign, 
  Eye, 
  Copy, 
  Send, 
  DownloadCloud, 
  Settings, 
  GripVertical, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Check, 
  Sparkles,
  Info,
  CalendarDays
} from 'lucide-react';

// ─── LOCAL ERROR BOUNDARY CLASS COMPONENT ───────────────────────────
class LocalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Command Center component crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-zinc-900/40 backdrop-blur-md border border-red-500/10 p-6 rounded-2xl text-center space-y-4 shadow-xl">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto text-red-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white font-display">Unable to load widget telemetry</h4>
            <p className="text-xs text-zinc-550 mt-1">A runtime exception occurred. You can safely retry or sync connection status.</p>
          </div>
          <BrutalistButton 
            variant="secondary" 
            onClick={() => this.setState({ hasError: false })}
            className="text-xs"
          >
            Retry Connection
          </BrutalistButton>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── TICKETING ENGINE REDUCER ACTIONS ───────────────────────────────
const ticketReducer = (state, action) => {
  switch (action.type) {
    case 'SET_TIERS':
      return { ...state, tiers: action.payload };
    case 'UPDATE_TIER':
      return {
        ...state,
        tiers: state.tiers.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t)
      };
    case 'ADD_TIER':
      return { ...state, tiers: [...state.tiers, action.payload] };
    case 'DELETE_TIER':
      return { ...state, tiers: state.tiers.filter(t => t.id !== action.payload) };
    case 'REORDER_TIERS':
      return { ...state, tiers: action.payload };
    default:
      return state;
  }
};

// ─── INDIVIDUAL TICKET TIER CARD (MEMOIZED FOR 60FPS INPUTS) ───────
const TicketTierCard = React.memo(({ 
  tier, 
  onUpdate, 
  onDelete, 
  isExpanded, 
  onToggleExpand, 
  dragControls 
}) => {
  const [localTitle, setLocalTitle] = useState(tier.title);
  const [localPrice, setLocalPrice] = useState(tier.price);
  const [localCapacity, setLocalCapacity] = useState(tier.capacity);
  const [localStartDate, setLocalStartDate] = useState(tier.startDate || '');
  const [localEndDate, setLocalEndDate] = useState(tier.endDate || '');

  // Synchronize internal state with tier updates
  useEffect(() => {
    setLocalTitle(tier.title);
    setLocalPrice(tier.price);
    setLocalCapacity(tier.capacity);
    setLocalStartDate(tier.startDate || '');
    setLocalEndDate(tier.endDate || '');
  }, [tier]);

  const handleSave = () => {
    onUpdate({
      id: tier.id,
      title: localTitle,
      price: parseFloat(localPrice) || 0,
      capacity: parseInt(localCapacity, 10) || 0,
      startDate: localStartDate,
      endDate: localEndDate
    });
  };

  const soldCount = tier.soldCount || 0;
  const progressPercent = Math.min(100, Math.round((soldCount / (tier.capacity || 1)) * 100));

  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-soft transition-all duration-200">
      {/* Resting Read state */}
      <div className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Draggable Grip Handle */}
          <div 
            onPointerDown={(e) => dragControls.start(e)}
            className="cursor-grab active:cursor-grabbing text-zinc-650 hover:text-zinc-300 transition-colors p-1 shrink-0 select-none"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          <div>
            <h4 className="text-base font-semibold text-white font-display flex items-center gap-2">
              {tier.title}
              {!tier.isVisible && (
                <span className="text-[9px] font-bold text-zinc-550 border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 rounded tracking-widest uppercase">
                  Hidden
                </span>
              )}
            </h4>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-zinc-400">
                Price: <span className="text-primary-400 font-semibold font-mono">${tier.price.toFixed(2)}</span>
              </span>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>{soldCount} / {tier.capacity} Sold</span>
                <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <BrutalistButton variant="secondary" onClick={onToggleExpand} className="text-xs px-3 py-1.5">
            {isExpanded ? 'Collapse' : 'Configure'}
          </BrutalistButton>
          <BrutalistButton variant="ghost" onClick={onDelete} className="text-zinc-500 hover:text-red-400 p-2 rounded-lg">
            <Trash2 className="w-4 h-4" />
          </BrutalistButton>
        </div>
      </div>

      {/* Expanded config form */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-zinc-950 bg-zinc-950/20"
          >
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Tier Designation
                  </label>
                  <input
                    type="text"
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-850 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/25 rounded-xl px-3 py-2 text-white outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Ticket Price ($)
                  </label>
                  <input
                    type="number"
                    value={localPrice}
                    onChange={(e) => setLocalPrice(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-850 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/25 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Maximum Seats
                  </label>
                  <input
                    type="number"
                    value={localCapacity}
                    onChange={(e) => setLocalCapacity(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-850 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/25 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Sales Start Window
                  </label>
                  <input
                    type="datetime-local"
                    value={localStartDate}
                    onChange={(e) => setLocalStartDate(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-850 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/25 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Sales End Window
                  </label>
                  <input
                    type="datetime-local"
                    value={localEndDate}
                    onChange={(e) => setLocalEndDate(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-850 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/25 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                </div>
              </div>

              {/* Visibility custom slider switch */}
              <div className="flex items-center justify-between py-2 border-t border-white/5">
                <div>
                  <h5 className="font-semibold text-white">Tier Visibility Status</h5>
                  <p className="text-[10px] text-zinc-500">Enable or hide ticket availability from public search pages.</p>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdate({ id: tier.id, isVisible: !tier.isVisible })}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none ${
                    tier.isVisible ? 'bg-primary-600' : 'bg-zinc-850 border border-zinc-800'
                  }`}
                  role="switch"
                  aria-checked={tier.isVisible}
                >
                  <div 
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      tier.isVisible ? 'translate-x-4' : 'translate-x-0'
                    }`} 
                  />
                </button>
              </div>

              {/* Actions Save footer */}
              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <BrutalistButton variant="secondary" onClick={onToggleExpand} className="px-3 py-1.5 text-xs">
                  Discard
                </BrutalistButton>
                <BrutalistButton variant="primary" onClick={handleSave} className="px-3.5 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white shadow-soft">
                  Save Changes
                </BrutalistButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─── MASTER EVENT DASHBOARD COMPONENT ────────────────────────────────
export default function EventDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  // Primary states
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, ticketing, attendees, settings
  const [announceMsg, setAnnounceMsg] = useState('');
  const [errorToast, setErrorToast] = useState(null);

  // Reducer for ticketing management
  const [ticketState, dispatchTickets] = useReducer(ticketReducer, { tiers: [] });
  const [expandedTierId, setExpandedTierId] = useState(null);

  // Danger settings state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [dangerAction, setDangerAction] = useState(null); // 'cancel' or 'delete'
  const [typedVerification, setTypedVerification] = useState('');
  const [shouldShakeVerify, setShouldShakeVerify] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clipboard copy state
  const [isCopied, setIsCopied] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Local state verification checks for Zero-Trust Organizer validation
  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate('/auth');
      else if (user.role !== 'organizer') navigate('/attendee');
    }
  }, [user, authLoading, navigate]);

  // Data hydration loaders
  const loadEventDetails = async () => {
    try {
      const res = await apiClient.get(`/api/v1/events/${id}`);
      if (res?.data?.success) {
        setEvent(res.data.data);
        
        // Seed default mock ticket tiers if not stored
        const defaultTiers = [
          { id: 't1', title: 'Early Bird Admission', price: 49.00, capacity: 100, soldCount: 45, isVisible: true, startDate: '2026-06-12T09:00', endDate: '2026-06-25T18:00' },
          { id: 't2', title: 'General Admission Pass', price: 99.00, capacity: 250, soldCount: 120, isVisible: true, startDate: '2026-06-12T09:00', endDate: '2026-07-19T23:59' },
          { id: 't3', title: 'VIP Workshop Access', price: 299.00, capacity: 50, soldCount: 15, isVisible: false, startDate: '2026-06-12T09:00', endDate: '2026-07-19T23:59' }
        ];
        dispatchTickets({ type: 'SET_TIERS', payload: defaultTiers });
      }
    } catch (err) {
      console.error('[CommandCenter] Error fetching event data:', err);
    }
  };

  const loadRegistrations = async () => {
    try {
      const res = await apiClient.get(`/api/v1/registrations?event_id=${id}&limit=50`);
      if (res?.data?.success) {
        setRegistrations(res.data.data || []);
      }
    } catch (err) {
      console.error('[CommandCenter] Error fetching attendee records:', err);
    }
  };

  useEffect(() => {
    if (!id) return;
    const hydrate = async () => {
      setLoading(true);
      await Promise.all([loadEventDetails(), loadRegistrations()]);
      setLoading(false);
    };
    hydrate();
  }, [id]);

  // Tab Keyboard Arrow control navigation
  const handleTabsKeyDown = (e) => {
    const tabKeys = ['overview', 'ticketing', 'attendees', 'settings'];
    const curIdx = tabKeys.indexOf(activeTab);
    
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (curIdx + 1) % tabKeys.length;
      setActiveTab(tabKeys[nextIdx]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextIdx = (curIdx - 1 + tabKeys.length) % tabKeys.length;
      setActiveTab(tabKeys[nextIdx]);
    }
  };

  // Telemetry Calculations
  const metrics = useMemo(() => {
    const sold = ticketState.tiers.reduce((acc, curr) => acc + (curr.soldCount || 0), 0);
    const capacity = ticketState.tiers.reduce((acc, curr) => acc + (curr.capacity || 0), 0);
    const revenue = ticketState.tiers.reduce((acc, curr) => acc + ((curr.soldCount || 0) * curr.price), 0);
    
    return {
      revenue: `$${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      seatsText: `${sold} / ${capacity}`,
      views: '3,420',
      conversion: '12.4%'
    };
  }, [ticketState.tiers]);

  // Clipboard copy link
  const copyCheckoutLink = () => {
    const link = `${window.location.origin}/attendee/${id}`;
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // CSV Manifest exporter
  const exportManifestCSV = () => {
    if (registrations.length === 0) return;
    const headers = ['Attendee Name', 'Email', 'Ticket Hash', 'Status', 'Registered Date'];
    const rows = registrations.map(r => [
      `"${r.first_name} ${r.last_name}"`,
      `"${r.email_address}"`,
      `"${r.ticket_hash}"`,
      `"${r.registration_status}"`,
      `"${new Date(r.created_at).toLocaleDateString()}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${event?.title || 'event'}_attendee_manifest.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Send Broadcast mock
  const handleSendBroadcast = () => {
    setIsBroadcasting(true);
    setTimeout(() => {
      setIsBroadcasting(false);
      setShowBroadcastModal(false);
      setBroadcastMessage('');
      setAnnounceMsg('Broadcast dispatched successfully to all registrants.');
      setTimeout(() => setAnnounceMsg(''), 3000);
    }, 1500);
  };

  // Override Pause Sales Toggles
  const handleToggleSalesPause = async () => {
    if (!event) return;
    const nextStatus = event.status === 'active' ? 'draft' : 'active';
    
    // Optimistic UI mutation updates
    setEvent(prev => ({ ...prev, status: nextStatus }));

    try {
      const response = await apiClient.patch(`/api/v1/events/${id}`, { status: nextStatus });
      if (!response?.data?.success) {
        throw new Error('Mutation transaction aborted on server.');
      }
    } catch (err) {
      // Rollback optimistic update
      setEvent(prev => ({ ...prev, status: event.status }));
      triggerErrorToast('Reverted: Failed to sync sales state with server.');
    }
  };

  // Rollback error toast triggers
  const triggerErrorToast = (msg) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4000);
  };

  // Ticketing state mutations
  const handleUpdateTier = async (updatedTier) => {
    const originalTier = ticketState.tiers.find(t => t.id === updatedTier.id);
    
    // Optimistic UI updates
    dispatchTickets({ 
      type: 'UPDATE_TIER', 
      payload: updatedTier 
    });
    setExpandedTierId(null);
    setAnnounceMsg(`Ticket tier "${updatedTier.title || originalTier.title}" config synchronized.`);

    // Mock API call to simulate network latency
    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate occasional network error on vip toggle
          if (updatedTier.id === 't3' && updatedTier.price < 0) {
            reject(new Error('API failure'));
          } else {
            resolve();
          }
        }, 400);
      });
    } catch (err) {
      // Rollback
      dispatchTickets({ 
        type: 'UPDATE_TIER', 
        payload: originalTier 
      });
      triggerErrorToast('Reverted: Network synchronization failed for ticketing.');
    }
  };

  const handleAddNewTier = () => {
    const newTier = {
      id: `t_${Date.now()}`,
      title: 'New Admission Tier',
      price: 150.00,
      capacity: 100,
      soldCount: 0,
      isVisible: true,
      startDate: new Date().toISOString().split('T')[0] + 'T09:00',
      endDate: new Date().toISOString().split('T')[0] + 'T23:59'
    };
    dispatchTickets({ type: 'ADD_TIER', payload: newTier });
    setExpandedTierId(newTier.id);
    setAnnounceMsg('New ticket tier created.');
  };

  const handleDeleteTier = (tierId) => {
    const matched = ticketState.tiers.find(t => t.id === tierId);
    dispatchTickets({ type: 'DELETE_TIER', payload: tierId });
    setAnnounceMsg(`Ticket tier "${matched?.title}" expunged.`);
  };

  const handleReorder = (newTiers) => {
    dispatchTickets({ type: 'REORDER_TIERS', payload: newTiers });
    setAnnounceMsg('Ticket tiers order updated.');
  };

  // 13. Danger zone security verification submit
  const handleVerifyDangerAction = async () => {
    if (typedVerification !== (event?.title || '')) {
      setShouldShakeVerify(true);
      setTimeout(() => setShouldShakeVerify(false), 300);
      return;
    }

    setIsDeleting(true);

    try {
      if (dangerAction === 'delete') {
        const res = await apiClient.delete(`/api/v1/events/${id}`);
        if (res?.data?.success) {
          setIsConfirmModalOpen(false);
          navigate('/organizer/dashboard');
        } else {
          throw new Error('API delete failed');
        }
      } else if (dangerAction === 'cancel') {
        const res = await apiClient.patch(`/api/v1/events/${id}`, { status: 'cancelled' });
        if (res?.data?.success) {
          setEvent(res.data.data);
          setIsConfirmModalOpen(false);
          loadEventDetails();
        } else {
          throw new Error('API cancel failed');
        }
      }
    } catch (err) {
      console.error('[DangerZone] Mutation failed:', err);
      triggerErrorToast('Purge transaction failed on database server.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Config columns for Attendee Virtual Ledger
  const ledgerColumns = [
    {
      key: 'name',
      header: 'Attendee Name',
      sortable: true,
      sortSelector: (row) => `${row.first_name} ${row.last_name}`,
      render: (row) => (
        <div className="flex items-center space-x-2.5 font-sans">
          <div className="w-6 h-6 rounded-full overflow-hidden border border-white/5 shrink-0 bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-primary-400">
            {row.avatar_url ? (
              <img src={row.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`
            )}
          </div>
          <span className="font-semibold text-white truncate">{row.first_name} {row.last_name}</span>
        </div>
      )
    },
    {
      key: 'email_address',
      header: 'Email Address',
      sortable: true,
      render: (row) => <span className="text-zinc-400 font-sans">{row.email_address}</span>
    },
    {
      key: 'ticket_hash',
      header: 'Ticket Hash',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-primary-400 select-all">{row.ticket_hash}</span>
    },
    {
      key: 'registration_status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <StatusBadge status={row.registration_status === 'confirmed' ? (row.has_checked_in ? 'verified' : 'active') : 'neutral'}>
          {row.registration_status === 'confirmed' ? (row.has_checked_in ? 'Checked In' : 'Confirmed') : 'Waitlisted'}
        </StatusBadge>
      )
    },
    {
      key: 'created_at',
      header: 'Registered Date',
      sortable: true,
      render: (row) => {
        const d = new Date(row.created_at);
        return <span className="text-zinc-550 font-mono text-[11px]">{d.toLocaleDateString()}</span>;
      }
    }
  ];

  // Attendee ledger actions row mapper
  const getLedgerActions = (row) => {
    const actions = [];
    
    // Toggle check-in status
    if (row.registration_status === 'confirmed') {
      actions.push({
        label: row.has_checked_in ? 'Undo Check-In' : 'Mark Check-In',
        onClick: async () => {
          try {
            await apiClient.patch(`/api/v1/registrations/${row.id}`, { has_checked_in: !row.has_checked_in });
            loadRegistrations();
            setAnnounceMsg(`Check-in status updated for ${row.first_name}.`);
          } catch {
            triggerErrorToast('Check-in mutation failed on database server.');
          }
        }
      });
    }

    // Cancel registration
    if (row.registration_status !== 'cancelled') {
      actions.push({
        label: 'Revoke Ticket',
        isDestructive: true,
        onClick: async () => {
          try {
            await apiClient.patch(`/api/v1/registrations/${row.id}`, { registration_status: 'cancelled' });
            loadRegistrations();
            setAnnounceMsg(`Ticket access revoked for ${row.first_name}.`);
          } catch {
            triggerErrorToast('Failed to cancel registration.');
          }
        }
      });
    }

    return actions;
  };

  // loading viewports
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Synchronizing Command Console...</span>
        </div>
      </div>
    );
  }

  const formattedDate = event?.start_timestamp 
    ? new Date(event.start_timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'Date Unspecified';

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-zinc-950 text-white font-sans overflow-hidden">
      
      {/* Dynamic shake styles and glows */}
      <style>{`
        @keyframes shakeInput {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .shake-field {
          animation: shakeInput 0.25s ease-in-out;
          border-color: #ef4444 !important;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.15) !important;
        }
      `}</style>

      {/* Screen reader live announcer region */}
      <div className="sr-only" aria-live="polite">{announceMsg}</div>

      {/* ─── OPTIMISTIC ROLLBACK ERROR TOAST ─── */}
      <AnimatePresence>
        {errorToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 bg-zinc-900 border border-red-500/20 rounded-xl px-4 py-3 shadow-soft flex items-center gap-3 z-50 max-w-sm"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs font-medium text-zinc-200">{errorToast}</span>
            <button onClick={() => setErrorToast(null)} className="text-zinc-600 hover:text-zinc-400 ml-auto shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8">
        
        {/* ─── Sibling Back navigation link ─── */}
        <button 
          onClick={() => navigate('/organizer/dashboard')}
          className="text-zinc-550 hover:text-zinc-350 transition-colors flex items-center gap-2 text-xs font-bold tracking-wider uppercase"
          aria-label="Back to dashboard portal"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-primary-500" />
          <span>Dashboard Portals</span>
        </button>

        {/* ─── HERO HEADER BLOCK & ACTIONS ─── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-900 pb-6 shrink-0">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-white font-display">
                {event?.title || 'Active Event Instance'}
              </h1>
              <StatusBadge status={event?.status === 'active' ? 'success' : 'warning'}>
                {event?.status === 'active' ? 'Published' : 'Draft'}
              </StatusBadge>
            </div>
            
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-zinc-400 text-xs">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary-500" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary-500" />
                <span>{event?.banner_image_url ? 'Custom Brand Banner' : 'System Mock Location'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <BrutalistButton 
              variant="secondary"
              onClick={copyCheckoutLink}
              className="text-xs font-semibold hover:text-white flex items-center space-x-1.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Public Page</span>
                </>
              )}
            </BrutalistButton>

            <BrutalistButton 
              variant="primary"
              onClick={handleToggleSalesPause}
              className={`text-xs font-bold px-4 py-2.5 ${
                event?.status === 'active' 
                  ? 'bg-zinc-800 hover:bg-zinc-750 text-white' 
                  : 'bg-primary-600 hover:bg-primary-500 text-white'
              }`}
            >
              {event?.status === 'active' ? 'Pause Ticket Sales' : 'Publish & Resume'}
            </BrutalistButton>
          </div>
        </div>

        {/* ─── STICKY TAB NAVIGATION BAR ─── */}
        <div className="sticky top-16 z-20 bg-zinc-950/80 backdrop-blur-md pt-4 border-b border-white/10 shrink-0">
          <nav 
            className="flex items-center gap-6 overflow-x-auto select-none" 
            role="tablist"
            onKeyDown={handleTabsKeyDown}
          >
            {['overview', 'ticketing', 'attendees', 'settings'].map((tab) => (
              <button
                key={tab}
                id={`tab-${tab}`}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`tabpanel-${tab}`}
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-bold tracking-widest pb-4 relative uppercase cursor-pointer transition-colors outline-none focus-visible:text-white ${
                  activeTab === tab ? 'text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span>{tab}</span>
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeEventTab" 
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-500"
                    transition={{ type: "spring", stiffness: 400, damping: 26 }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* ─── TAB CONTENTS AREA WITH LOCALIZED ERROR BOUNDARY ─── */}
        <div className="min-h-[400px]">
          <LocalErrorBoundary>
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  {/* Micro-scorecard metrics row (1x4 grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { title: 'Gross Revenue', value: metrics.revenue, change: '+18.4%', label: 'Total transaction logs' },
                      { title: 'Seat Capacity', value: metrics.seatsText, change: '65% Cap', label: 'Roster bookings' },
                      { title: 'Web Page Views', value: metrics.views, change: '+24.1%', label: 'Total analytics traffic' },
                      { title: 'Conversion Rate', value: metrics.conversion, change: '+2.8%', label: 'Visits to purchases ratio' }
                    ].map((card, idx) => (
                      <div key={idx} className="bg-zinc-900/30 backdrop-blur-sm border border-white/5 rounded-xl p-5 shadow-soft hover:border-white/10 transition-all duration-300">
                        <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase block">{card.title}</span>
                        <div className="flex items-baseline justify-between mt-3">
                          <span className="text-2xl font-semibold text-white tracking-tight tabular-nums font-sans">
                            {card.value}
                          </span>
                          <span className="text-[10px] font-bold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">
                            {card.change}
                          </span>
                        </div>
                        <span className="text-[9px] text-zinc-650 block mt-2">{card.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Split column workspace (2/3 and 1/3) */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Inline data telemetry SVG graph (2/3 split) */}
                    <div className="lg:col-span-2 bg-zinc-900/30 backdrop-blur-sm border border-white/5 p-6 rounded-2xl flex flex-col justify-between min-h-[300px] relative overflow-hidden group">
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-tight font-display uppercase">Sales Velocity Curve</h3>
                        <p className="text-[10px] text-zinc-550 mt-0.5">Real-time tickets transaction velocity mapped overtimezone.</p>
                      </div>

                      {/* SVG Bezier path with filter glow */}
                      <div className="flex-grow w-full relative flex items-center justify-center min-h-[160px] mt-4">
                        <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
                          <defs>
                            <filter id="sales-glow" x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="6" result="blur" />
                              <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>
                          
                          {/* Grid Guideline overlays */}
                          <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.02)" strokeDasharray="4 4" />
                          <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.02)" strokeDasharray="4 4" />
                          <line x1="0" y1="10" x2="500" y2="10" stroke="rgba(255,255,255,0.02)" strokeDasharray="4 4" />

                          {/* Velocity Bezier path */}
                          <path 
                            d="M 0,105 C 100,100 80,60 180,45 C 280,30 250,75 350,25 C 450,-10 420,10 500,15" 
                            stroke="#7c3aed" 
                            strokeWidth="2.5" 
                            fill="none" 
                            filter="url(#sales-glow)"
                            className="stroke-primary-500"
                          />
                          
                          {/* Pulsing indicator dots */}
                          <circle cx="350" cy="25" r="4" fill="#7c3aed" />
                          <circle cx="350" cy="25" r="8" stroke="#7c3aed" strokeWidth="1.5" fill="none" className="animate-ping" />
                        </svg>
                      </div>
                    </div>

                    {/* Quick Action Rows Panel (1/3 split) */}
                    <div className="bg-zinc-900/30 backdrop-blur-sm border border-white/5 p-6 rounded-2xl flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-tight font-display uppercase">Administrative Spine</h3>
                        <p className="text-[10px] text-zinc-550 mt-0.5">Quick actions checklist panel.</p>
                      </div>

                      <div className="space-y-3 mt-6">
                        {[
                          { label: 'Copy Ticket Checkout Link', icon: Copy, action: copyCheckoutLink },
                          { label: 'Send Attendee Broadcast', icon: Send, action: () => setShowBroadcastModal(true) },
                          { label: 'Download manifest spreadsheet', icon: DownloadCloud, action: exportManifestCSV },
                          { label: 'Edit Schedule sessions', icon: CalendarDays, action: () => navigate(`/organizer/events/schedule/${id}`) }
                        ].map((row, rIdx) => {
                          const Icon = row.icon;
                          return (
                            <button
                              key={rIdx}
                              onClick={row.action}
                              className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-950/40 hover:bg-zinc-950/80 border border-white/5 hover:border-white/10 transition-all text-left outline-none cursor-pointer shrink-0 select-none"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-500">
                                  <Icon className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                                </div>
                                <span className="text-xs font-semibold text-zinc-300">{row.label}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}

              {activeTab === 'ticketing' && (
                <motion.div
                  key="ticketing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-center shrink-0">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configure Ticket Tiers</h3>
                      <p className="text-[10px] text-zinc-550 mt-0.5">Arrange and customize details for admission tickets.</p>
                    </div>
                    
                    <BrutalistButton 
                      variant="primary" 
                      onClick={handleAddNewTier} 
                      className="text-xs px-3.5 py-2 flex items-center space-x-1.5 bg-primary-600 hover:bg-primary-500 text-white"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Admission Tier</span>
                    </BrutalistButton>
                  </div>

                  {/* Dynamic reordering group list */}
                  <Reorder.Group 
                    axis="y" 
                    values={ticketState.tiers} 
                    onReorder={handleReorder} 
                    className="flex flex-col gap-4 select-none"
                  >
                    {ticketState.tiers.map((tier) => {
                      // Retrieve custom reorder hook controls
                      const dragControls = useDragControls();

                      return (
                        <Reorder.Item 
                          key={tier.id} 
                          value={tier}
                          dragListener={false}
                          dragControls={dragControls}
                          className="relative"
                          style={{ listStyle: 'none' }}
                        >
                          <TicketTierCard 
                            tier={tier}
                            onUpdate={handleUpdateTier}
                            onDelete={() => handleDeleteTier(tier.id)}
                            isExpanded={expandedTierId === tier.id}
                            onToggleExpand={() => setExpandedTierId(expandedTierId === tier.id ? null : tier.id)}
                            dragControls={dragControls}
                          />
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                </motion.div>
              )}

              {activeTab === 'attendees' && (
                <motion.div
                  key="attendees"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Event Attendee Roster</h3>
                    <p className="text-[10px] text-zinc-550 mt-0.5"> Roster logs of confirmed and waitlisted attendees.</p>
                  </div>

                  {/* Virtualized Attendee ledger table */}
                  <div className="h-[480px]">
                    <VirtualLedger 
                      data={registrations}
                      columns={ledgerColumns}
                      rowHeight={56}
                      getRowActions={getLedgerActions}
                      emptyStateTitle="Roster manifest clear"
                      emptyStateDescription="No tickets checked out under this event instance yet."
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  <div className="bg-zinc-900/30 backdrop-blur-sm border border-white/5 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-white tracking-tight font-display uppercase">Event Configurations</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Modify public access permissions, restrict seats limits, or toggle schedule lists.
                    </p>
                  </div>

                  {/* Danger Zone panel container */}
                  <div className="bg-red-950/10 border border-red-900/20 rounded-2xl p-6 space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-red-400 font-display uppercase tracking-wider">Danger Zone Boundary</h4>
                      <p className="text-[10px] text-red-500/70 mt-1">CATACLYSMIC WARNING: These operations purge logs irreversibly.</p>
                    </div>

                    <div className="divide-y divide-red-900/10 border-t border-red-900/10 text-xs">
                      <div className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h5 className="font-semibold text-white">Cancel Event Instance</h5>
                          <p className="text-[10px] text-zinc-550 mt-0.5">Toggle status to cancelled. Disables checkouts and alerts ticket holders.</p>
                        </div>
                        <BrutalistButton 
                          variant="ghost" 
                          onClick={() => { setDangerAction('cancel'); setIsConfirmModalOpen(true); }}
                          className="text-red-400 border border-red-900/30 hover:bg-red-500/10 hover:text-red-300 text-xs px-3.5 py-1.5 shrink-0"
                        >
                          Cancel Event
                        </BrutalistButton>
                      </div>

                      <div className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h5 className="font-semibold text-white">Purge Event Record</h5>
                          <p className="text-[10px] text-zinc-550 mt-0.5">Irreversibly wipe records and registrations. Permitted only if no tickets issued.</p>
                        </div>
                        <BrutalistButton 
                          variant="ghost" 
                          onClick={() => { setDangerAction('delete'); setIsConfirmModalOpen(true); }}
                          className="text-red-400 border border-red-900/30 hover:bg-red-500/10 hover:text-red-300 text-xs px-3.5 py-1.5 shrink-0"
                        >
                          Delete Event
                        </BrutalistButton>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </LocalErrorBoundary>
        </div>

      </main>

      {/* ─── DUST BROADCAST ACTION MODAL ─── */}
      <VoraModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        title="SEND ATTENDEE BROADCAST"
        className="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-zinc-400">
            Dispatch urgent announcement notifications or checkout updates to all ticket holders.
          </p>
          <textarea
            rows="4"
            placeholder="Write broadcast message details..."
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            className="w-full bg-zinc-950/60 border border-zinc-850 hover:border-zinc-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 rounded-xl p-3 text-zinc-300 outline-none resize-none"
          />
          <div className="flex justify-end gap-2">
            <BrutalistButton variant="secondary" onClick={() => setShowBroadcastModal(false)} className="px-3.5 py-2">
              Cancel
            </BrutalistButton>
            <BrutalistButton 
              variant="primary" 
              onClick={handleSendBroadcast} 
              disabled={isBroadcasting || !broadcastMessage.trim()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white flex items-center space-x-1.5 font-semibold"
            >
              {isBroadcasting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Broadcasting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span>Send Broadcast</span>
                </>
              )}
            </BrutalistButton>
          </div>
        </div>
      </VoraModal>

      {/* ─── DANGER ZONE VERIFICATION SECURITY MODAL ─── */}
      <VoraModal
        isOpen={isConfirmModalOpen}
        onClose={() => { setIsConfirmModalOpen(false); setTypedVerification(''); }}
        title="SECURITY SAFETY CHECK"
        className="max-w-md"
      >
        <div className="space-y-5 text-xs">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white uppercase">Critical Irreversible Event Action</p>
              <p className="text-[10px] mt-1 text-red-400/90 leading-relaxed">
                {dangerAction === 'delete' 
                  ? ' Purging this event clears ticket entries and attendee registry sheets. The database entries will be wiped.' 
                  : 'Cancelling will notify attendees immediately, invalidate active checkout gates, and freeze sales.'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Type the exact event title to authorize security clearance:
            </label>
            <p className="font-semibold text-white select-all text-sm mb-2">{event?.title}</p>
            
            {/* Input field with conditional shake CSS */}
            <input
              type="text"
              placeholder="Type matching title here..."
              value={typedVerification}
              onChange={(e) => setTypedVerification(e.target.value)}
              className={`w-full bg-zinc-950/60 border ${
                shouldShakeVerify ? 'shake-field' : 'border-zinc-850 focus:border-red-500/60 focus:ring-red-500/20'
              } rounded-xl px-4 py-2.5 text-zinc-200 outline-none transition-all`}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-zinc-900">
            <BrutalistButton 
              variant="secondary" 
              onClick={() => { setIsConfirmModalOpen(false); setTypedVerification(''); }}
              disabled={isDeleting}
              className="px-3.5 py-2"
            >
              Cancel Action
            </BrutalistButton>
            <BrutalistButton
              variant="primary"
              onClick={handleVerifyDangerAction}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white flex items-center space-x-1.5 font-bold"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Purging...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Confirm Destruction</span>
                </>
              )}
            </BrutalistButton>
          </div>
        </div>
      </VoraModal>

    </div>
  );
}
