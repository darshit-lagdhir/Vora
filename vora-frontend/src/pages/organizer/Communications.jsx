import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import apiClient from '../../services/apiClient.js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare,
  Clock, 
  Send, 
  Users, 
  Eye, 
  CheckCircle,
  AlertTriangle,
  X,
  Bold,
  Italic,
  Link,
  ChevronDown
} from 'lucide-react';
import Heading from '../../components/ui/Heading.jsx';

// ─── CINEMATIC EMAIL HTML TEMPLATE GENERATOR (TASK 5) ──────────────────────
const generateCinematicEmail = (subject, content, logisticsHtml = '') => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#09090b" style="padding: 40px 16px;">
          <tr>
            <td align="center" valign="top">
              <table width="100%" max-width="600" cellspacing="0" cellpadding="0" bgcolor="#18181b" style="max-width: 600px; width: 100%; border: 1px solid #27272a; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                <!-- Brand logo header -->
                <tr>
                  <td align="center" valign="top" style="padding: 40px 40px 20px 40px; border-bottom: 1px solid #27272a;">
                    <span style="font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.05em; text-transform: lowercase;">vora</span>
                  </td>
                </tr>
                <!-- Message subject -->
                <tr>
                  <td align="left" style="padding: 40px 40px 10px 40px;">
                    <h2 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0; letter-spacing: -0.03em;">${subject}</h2>
                  </td>
                </tr>
                <!-- Primary message content -->
                <tr>
                  <td align="left" style="padding: 0 40px 30px 40px; font-size: 14px; line-height: 1.7; color: #a1a1aa;">
                    ${content.replace(/\n/g, '<br />')}
                  </td>
                </tr>
                <!-- Logistical matrix (used if reminder) -->
                ${logisticsHtml}
                <!-- Action CTA button -->
                <tr>
                  <td align="center" style="padding: 10px 40px 40px 40px;">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" bgcolor="#7c3aed" style="border-radius: 12px;">
                          <a href="https://vora.com" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 11px; font-weight: 700; color: #ffffff; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; font-family: sans-serif;">Access Virtual Space</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 24px; background-color: #09090b; border-top: 1px solid #27272a; font-size: 9px; color: #52525b; text-transform: uppercase; letter-spacing: 0.15em;">
                    © 2026 Vora Ecosystem. Sent on behalf of organizer.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

export default function Communications() {
  const { user } = useAuth();
  
  // Segmented Mode Toggle: 'automated' | 'manual'
  const [mode, setMode] = useState('automated');

  // Event Selection lists
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventsLoading, setEventsLoading] = useState(true);

  // Automated trigger configuration
  const [triggers, setTriggers] = useState({
    trigger_registration_confirmation: true,
    trigger_t_minus_24h: true,
    trigger_t_minus_1h: true,
    trigger_t_plus_24h: true
  });
  const [triggersLoading, setTriggersLoading] = useState(false);

  // Email payload preview modal
  const [previewPayload, setPreviewPayload] = useState(null);

  // Manual Compose form state
  const [composeSubject, setComposeSubject] = useState('');
  const [composeContent, setComposeContent] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('All Registered Attendees'); // cohort name
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selection tooltip state
  const [selectionBox, setSelectionBox] = useState(null);
  const editorRef = useRef(null);

  // Broadcast historical ledger logs
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch organizer events list on mount
  useEffect(() => {
    const fetchEvents = async () => {
      setEventsLoading(true);
      try {
        const res = await apiClient.get('/api/v1/events');
        if (res.data?.success) {
          const list = res.data.data || [];
          setEvents(list);
          if (list.length > 0) {
            setSelectedEventId(list[0].id);
          }
        }
      } catch (err) {
        triggerToast("Failed to fetch events dropdown catalog.", "error");
      } finally {
        setEventsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Fetch triggers and broadcasts history whenever event changes
  useEffect(() => {
    if (!selectedEventId) return;

    const fetchTriggers = async () => {
      setTriggersLoading(true);
      try {
        const res = await apiClient.get(`/api/v1/events/${selectedEventId}/broadcasts/triggers`);
        if (res.data?.success) {
          setTriggers(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load automated triggers configuration.");
      } finally {
        setTriggersLoading(false);
      }
    };

    const fetchLedger = async () => {
      setLedgerLoading(true);
      try {
        const res = await apiClient.get(`/api/v1/events/${selectedEventId}/broadcasts`);
        if (res.data?.success) {
          setLedger(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to retrieve manual broadcasts ledger.");
      } finally {
        setLedgerLoading(false);
      }
    };

    fetchTriggers();
    fetchLedger();
  }, [selectedEventId]);

  // Polling mechanism: Poll manual broadcasts ledger logs every 10 seconds (Task 6)
  useEffect(() => {
    if (!selectedEventId || mode !== 'manual') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/api/v1/events/${selectedEventId}/broadcasts`);
        if (res.data?.success) {
          setLedger(res.data.data || []);
        }
      } catch (err) {
        console.error("Ledger status poll validation failed.");
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [selectedEventId, mode]);

  // Toggle Automated Triggers (Task 2 Activation Switch)
  const handleToggleTrigger = async (key) => {
    const updated = {
      ...triggers,
      [key]: !triggers[key]
    };
    setTriggers(updated); // optimistic local toggle

    try {
      await apiClient.put(`/api/v1/events/${selectedEventId}/broadcasts/triggers`, updated);
    } catch (err) {
      setTriggers(triggers); // revert state
      triggerToast("Trigger sync request rejected by host database.", "error");
    }
  };

  // Selection highlighting tooltip helper (Task 3 inline helper)
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setSelectionBox(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const parentRect = editorRef.current.getBoundingClientRect();

    // Ensure range intersects the actual textbox container
    if (
      rect.top >= parentRect.top &&
      rect.bottom <= parentRect.bottom &&
      rect.left >= parentRect.left &&
      rect.right <= parentRect.right
    ) {
      setSelectionBox({
        x: rect.left - parentRect.left + (rect.width / 2) - 40,
        y: rect.top - parentRect.top - 44
      });
    } else {
      setSelectionBox(null);
    }
  };

  // Format selection utility
  const formatSelection = (type) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString();
    let formattedText = '';
    if (type === 'bold') formattedText = `**${text}**`;
    else if (type === 'italic') formattedText = `*${text}*`;
    else if (type === 'link') formattedText = `[${text}](https://)`;

    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;

    const val = composeContent;
    setComposeContent(val.substring(0, start) + formattedText + val.substring(end));
    setSelectionBox(null);
  };

  // Submit manual broadcast dispatch
  const handleDispatchBroadcast = async (e) => {
    e.preventDefault();
    if (isFormLocked) {
      // Trigger microscopic horizontal shake interaction on lock click
      const btn = document.getElementById('btn-dispatch-broadcast');
      if (btn) {
        btn.classList.add('animate-shake');
        setTimeout(() => btn.classList.remove('animate-shake'), 400);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/api/v1/events/${selectedEventId}/broadcasts`, {
        subject: composeSubject,
        content: composeContent,
        audience_cohort: selectedCohort
      });

      if (res.data?.success) {
        const newLog = res.data.data;
        // Optimistic UI update
        setLedger(prev => [newLog, ...prev]);
        setComposeSubject('');
        setComposeContent('');
        triggerToast("Broadcast dispatch queue engaged.", "success");
      }
    } catch (err) {
      triggerToast("Broadcast transmission pool rejected payload.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form lock logic: Subject >=5 chars, body >=20 chars, and 1 cohort selected
  const isFormLocked = 
    composeSubject.length < 5 || 
    composeContent.length < 20 || 
    !selectedCohort;

  const currentEvent = events.find(e => e.id === selectedEventId);

  // Pre-compiled automated notification nodes list mapping details
  const automatedNodes = [
    {
      key: 'trigger_registration_confirmation',
      time: 'Immediate',
      title: 'Registration Confirmation',
      description: 'Dispatched immediately upon event registration. Delivers access keys and invoice sheets.',
      mockSubject: 'Registration Confirmed: Vora Broadcast Portal',
      mockContent: 'Thank you for reserving your seat! Below you will find your secure digital token to enter the live webcast dashboard lobby once broadcasting goes operational.',
      logistics: `
        <tr>
          <td align="center" style="padding: 0 40px 30px 40px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 20px;">
              <tr>
                <td style="font-size: 11px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 4px;">Logistics</td>
              </tr>
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #ffffff;">Digital Ticket Claimed</td>
              </tr>
            </table>
          </td>
        </tr>
      `
    },
    {
      key: 'trigger_t_minus_24h',
      time: '-24:00:00',
      title: 'Day-Before Reminder',
      description: 'Dispatched 24 hours prior to end_timestamp. Confirms calendar allocations.',
      mockSubject: 'T-Minus 24 Hours: Vora Webcast Access Check',
      mockContent: 'This is a system directive confirming that our event schedule is locked and starts in exactly 24 hours. Ensure your edge device is synchronized.',
      logistics: `
        <tr>
          <td align="center" style="padding: 0 40px 30px 40px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 20px;">
              <tr>
                <td style="font-size: 11px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 4px;">Start Time</td>
              </tr>
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #ffffff;">Tomorrow, Scheduled Hours</td>
              </tr>
            </table>
          </td>
        </tr>
      `
    },
    {
      key: 'trigger_t_minus_1h',
      time: '-01:00:00',
      title: 'Lobby Entry Signal',
      description: 'Dispatched 1 hour prior to start_timestamp. Unlocks entry gates.',
      mockSubject: 'Urgent: Vora Event Webcast Lobby Open',
      mockContent: 'The live stream gates are now operational! Click the access action link below to verify hardware codecs and secure your place.',
      logistics: `
        <tr>
          <td align="center" style="padding: 0 40px 30px 40px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 20px;">
              <tr>
                <td style="font-size: 11px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 4px;">Webcast Status</td>
              </tr>
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #ffffff;">Lobby Active & Standby</td>
              </tr>
            </table>
          </td>
        </tr>
      `
    },
    {
      key: 'trigger_t_plus_24h',
      time: '+24:00:00',
      title: 'Post-Event Digest',
      description: 'Dispatched 24 hours post event. Shares resource vaults and follow-up directives.',
      mockSubject: 'Vault Unlocked: Event Presentations & Directives',
      mockContent: 'We thank you for participating! The shared files vault has been populated by the organizer. Access slide sheets and notes logs immediately.',
      logistics: `
        <tr>
          <td align="center" style="padding: 0 40px 30px 40px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 20px;">
              <tr>
                <td style="font-size: 11px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.1em; padding-bottom: 4px;">Resource Vault</td>
              </tr>
              <tr>
                <td style="font-size: 14px; font-weight: 600; color: #ffffff;">Slides & Downloads Available</td>
              </tr>
            </table>
          </td>
        </tr>
      `
    }
  ];

  return (
    <div className="space-y-8 min-h-screen pb-16">
      
      {/* ─── COMMUNICATIONS HEADER BLOCK ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-zinc-800/50">
        <div className="text-left space-y-1">
          <Heading level="h1" className="text-3xl font-extrabold tracking-tighter text-white font-display uppercase">
            Communications Console
          </Heading>
          <p className="text-zinc-500 text-xs font-sans">
            Orchestrate automated triggers and dispatch manual broadcasts to attendees.
          </p>
        </div>

        {/* Dropdown Selector */}
        {!eventsLoading && events.length > 0 && (
          <div className="relative flex items-center bg-zinc-900/40 border border-white/5 rounded-xl px-4 py-2.5 group hover:border-zinc-700/80 transition-all select-none">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-2.5 font-technical">Event Scope:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-transparent text-xs font-semibold font-form text-white outline-none border-none pr-8 cursor-pointer appearance-none relative z-10"
            >
              {events.map(ev => (
                <option key={ev.id} value={ev.id} className="bg-zinc-950 text-white">
                  {ev.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-4 pointer-events-none group-hover:text-zinc-350 transition-colors" />
          </div>
        )}
      </div>

      {/* Edge Empty State for Events Checklist */}
      {!eventsLoading && events.length === 0 && (
        <div className="py-20 text-center border border-dashed border-white/5 rounded-[2.5rem] bg-zinc-900/10 max-w-md mx-auto select-none">
          <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white font-display tracking-tight">No Events Hosted</h3>
          <p className="text-zinc-500 text-xs font-sans max-w-xs mx-auto mt-2 leading-relaxed">
            You must register at least one virtual event in the organizer console before enabling dispatch engines.
          </p>
        </div>
      )}

      {events.length > 0 && (
        <div className="space-y-8">
          
          {/* ─── SEGMENTED STRATEGIC MODE TOGGLE (TASK 1 TOGGLE) ─── */}
          <div className="flex justify-start select-none">
            <div className="inline-flex bg-zinc-900/50 p-1.5 rounded-full border border-white/5 relative">
              
              {/* Option A: Automated */}
              <button
                onClick={() => setMode('automated')}
                className={`relative z-10 px-6 py-2.5 text-xs font-bold font-form uppercase tracking-wider rounded-full transition-colors cursor-pointer outline-none border-none bg-transparent ${
                  mode === 'automated' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {mode === 'automated' && (
                  <motion.div 
                    layoutId="commModeIndicator"
                    className="absolute inset-0 bg-zinc-800 rounded-full shadow-md -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                Automated Triggers
              </button>

              {/* Option B: Manual */}
              <button
                onClick={() => setMode('manual')}
                className={`relative z-10 px-6 py-2.5 text-xs font-bold font-form uppercase tracking-wider rounded-full transition-colors cursor-pointer outline-none border-none bg-transparent ${
                  mode === 'manual' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {mode === 'manual' && (
                  <motion.div 
                    layoutId="commModeIndicator"
                    className="absolute inset-0 bg-zinc-800 rounded-full shadow-md -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                Manual Broadcasts
              </button>

            </div>
          </div>

          <AnimatePresence mode="wait">
            
            {/* VIEW A: AUTOMATED TIMELINE MATRIX */}
            {mode === 'automated' && (
              <motion.div
                key="view-automated"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 max-w-4xl mx-auto text-left relative"
              >
                {/* Center vertical track line */}
                <div className="absolute left-[34px] sm:left-1/2 top-4 bottom-4 w-[2px] bg-zinc-900 -translate-x-[1px] pointer-events-none -z-10" />

                {/* Nodes stack */}
                <div className="space-y-12">
                  {automatedNodes.map((node, index) => {
                    const isChecked = triggers[node.key];
                    const isEven = index % 2 === 0;

                    return (
                      <div 
                        key={node.key}
                        className={`flex flex-col sm:flex-row items-start justify-between gap-6 sm:gap-12 relative ${
                          isEven ? 'sm:flex-row-reverse' : ''
                        }`}
                      >
                        {/* Central Dot indicator */}
                        <div className="absolute left-8 sm:left-1/2 top-8 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 bg-zinc-800 -translate-x-[7px] pointer-events-none z-10 transition-colors duration-300" 
                          style={{
                            backgroundColor: isChecked ? '#7c3aed' : '#27272a',
                            boxShadow: isChecked ? '0 0 10px rgba(124, 58, 237, 0.5)' : 'none'
                          }}
                        />

                        {/* Bento Card intersecting track (Task 2 Bento) */}
                        <div className={`w-full sm:w-[45%] bg-zinc-900/30 backdrop-blur-md border rounded-3xl p-6 relative transition-all duration-300 ${
                          isChecked 
                            ? 'border-primary-500/20 bg-primary-600/5 shadow-2xl shadow-primary-500/5' 
                            : 'border-white/5'
                        }`}>
                          <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/10 via-transparent to-transparent rounded-t-3xl" />
                          
                          {/* Inner grid layout */}
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest font-technical">
                                {node.time}
                              </span>
                              
                              {/* Trigger Switch button (Task 2 switch) */}
                              <button
                                type="button"
                                onClick={() => handleToggleTrigger(node.key)}
                                className={`relative w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer border-none flex items-center shrink-0 ${
                                  isChecked ? 'bg-primary-600' : 'bg-zinc-850'
                                }`}
                              >
                                <motion.div
                                  layout
                                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                  className="w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-md relative"
                                  style={{
                                    x: isChecked ? 20 : 0
                                  }}
                                />
                              </button>
                            </div>

                            <div className="space-y-1 text-left">
                              <h3 className="text-sm font-bold text-white font-accent">{node.title}</h3>
                              <p className="text-[10px] text-zinc-550 leading-relaxed font-sans">{node.description}</p>
                            </div>

                            {/* Preview trigger */}
                            <div className="pt-2 flex justify-start">
                              <button
                                onClick={() => setPreviewPayload({
                                  subject: node.mockSubject,
                                  content: node.mockContent,
                                  logistics: node.logistics
                                })}
                                className="px-3 py-1.5 bg-zinc-900/50 hover:bg-zinc-800/80 border border-white/5 hover:border-zinc-700/80 text-[10px] font-bold font-accent text-zinc-350 hover:text-white uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer outline-none"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview Template</span>
                              </button>
                            </div>

                          </div>
                        </div>

                        {/* Invisible spacer for center grid layout balance */}
                        <div className="hidden sm:block w-[45%]" />

                      </div>
                    );
                  })}
                </div>

              </motion.div>
            )}

            {/* VIEW B: MANUAL BROADCASTS & COMPOSER */}
            {mode === 'manual' && (
              <motion.div
                key="view-manual"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-8 max-w-4xl mx-auto text-left"
              >
                
                {/* Composers Matrix Chassis (Task 3 Compose Grid) */}
                <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 relative">
                  <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/10 via-transparent to-transparent rounded-t-3xl" />
                  
                  <form onSubmit={handleDispatchBroadcast} className="space-y-6">
                    
                    {/* Subject Line input */}
                    <div className="space-y-1 text-left relative">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-technical">Broadcast Subject</span>
                      <input 
                        id="input-broadcast-subject"
                        type="text"
                        required
                        disabled={isSubmitting}
                        placeholder="Urgent reminder or announcement summary"
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                        className="w-full bg-transparent border-b border-white/5 focus:border-primary-500 text-lg font-display font-semibold text-white py-2 outline-none transition-all placeholder-zinc-800"
                      />
                    </div>

                    {/* Master Prose Editor Area */}
                    <div className="space-y-1.5 text-left relative">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-technical">Broadcast Content</span>
                      
                      <div className="relative" onMouseUp={handleTextSelection}>
                        
                        {/* Auto-expanding text area (no inner scrollbars) */}
                        <textarea
                          ref={editorRef}
                          id="input-broadcast-content"
                          required
                          disabled={isSubmitting}
                          rows={6}
                          placeholder="Type your markdown-supported message here..."
                          value={composeContent}
                          onChange={(e) => setComposeContent(e.target.value)}
                          className="w-full bg-transparent border-none text-sm font-sans text-zinc-200 py-2 outline-none resize-none leading-[1.7] focus:ring-0 placeholder-zinc-800 max-w-[70ch]"
                          style={{
                            minHeight: '120px'
                          }}
                        />

                        {/* Floating Selection Tooltip Helper (Task 3 Bold/Italic) */}
                        <AnimatePresence>
                          {selectionBox && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 10 }}
                              className="absolute bg-zinc-900 border border-white/10 rounded-lg p-1.5 flex items-center space-x-1.5 shadow-xl backdrop-blur-md z-30 pointer-events-auto select-none"
                              style={{
                                left: selectionBox.x,
                                top: selectionBox.y
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => formatSelection('bold')}
                                className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors border-none bg-transparent cursor-pointer"
                              >
                                <Bold className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => formatSelection('italic')}
                                className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors border-none bg-transparent cursor-pointer"
                              >
                                <Italic className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => formatSelection('link')}
                                className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors border-none bg-transparent cursor-pointer"
                              >
                                <Link className="w-3.5 h-3.5" />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Character Telemetry length tracker */}
                      <div className="flex justify-end text-[9px] font-bold font-technical text-zinc-650 tracking-wider pt-2 border-t border-white/5">
                        <span>LENGTH: {composeContent.length} CHARS</span>
                      </div>

                    </div>

                    {/* Audience Cohort selector pills (Task 4 pills) */}
                    <div className="space-y-3 pt-2">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-technical">Define Recipient Matrix</span>
                      <div className="flex flex-wrap gap-2.5 select-none">
                        {[
                          'All Registered Attendees',
                          'Waitlisted Users',
                          'Pending Confirmations'
                        ].map(cohort => {
                          const active = selectedCohort === cohort;
                          return (
                            <button
                              key={cohort}
                              type="button"
                              onClick={() => !isSubmitting && setSelectedCohort(cohort)}
                              className={`px-4 py-2 rounded-full text-xs font-semibold font-accent transition-all duration-200 border outline-none cursor-pointer ${
                                active
                                  ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-500/10'
                                  : 'bg-zinc-950 border-white/5 text-zinc-450 hover:border-zinc-800 hover:text-zinc-300'
                              }`}
                            >
                              {cohort}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Empathetic soft-locked button trigger */}
                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        id="btn-dispatch-broadcast"
                        disabled={isSubmitting}
                        className={`px-6 py-3.5 rounded-xl text-xs font-bold font-form uppercase tracking-wider transition-all flex items-center gap-2 border-none outline-none relative ${
                          isFormLocked
                            ? 'bg-zinc-850 text-zinc-650 opacity-40 cursor-not-allowed'
                            : 'bg-primary-600 hover:bg-primary-500 text-white cursor-pointer shadow-lg shadow-primary-600/25 active:scale-[0.98]'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Dispatch Broadcast</span>
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                </div>

                {/* Dispatch historical ledger logs section (Task 6 ledger) */}
                <div className="space-y-4">
                  <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-technical select-none">Manual Dispatch History Ledger</span>
                  
                  {ledgerLoading && (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      Loading broadcast records...
                    </div>
                  )}

                  {!ledgerLoading && ledger.length === 0 && (
                    <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-white/5 rounded-2xl bg-zinc-950/20">
                      No manual broadcasts have been dispatched for this event.
                    </div>
                  )}

                  {!ledgerLoading && ledger.length > 0 && (
                    <div className="grid grid-cols-1 gap-4">
                      {ledger.map((log) => {
                        const sending = log.status === 'sending';
                        return (
                          <div 
                            key={log.id}
                            className={`bg-zinc-900/40 backdrop-blur-md border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                              sending ? 'border-primary-500/20 shadow-lg shadow-primary-500/5' : 'border-white/5'
                            }`}
                          >
                            <div className="space-y-1 text-left min-w-0 flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-[9px] font-bold text-zinc-500 font-technical uppercase">
                                  {new Date(log.created_at).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </span>
                                <span className="text-[10px] text-zinc-650 font-technical">•</span>
                                <span className="text-[9px] font-bold text-primary-400 uppercase tracking-wider font-accent">
                                  {log.audience_cohort}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-white tracking-tight font-accent truncate">
                                {log.subject}
                              </h4>
                              <p className="text-[10px] text-zinc-500 leading-relaxed font-sans line-clamp-1 max-w-[70ch]">
                                {log.content}
                              </p>
                            </div>

                            {/* Status badge pill indicator */}
                            <div className="shrink-0 self-start sm:self-center">
                              <span className={`px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider font-accent flex items-center gap-1.5 shadow-sm transition-all duration-300 ${
                                sending
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.08)]'
                                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
                              }`}>
                                {sending ? (
                                  <>
                                    <svg className="animate-spin h-3 w-3 text-amber-400 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Sending...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span>Delivered</span>
                                  </>
                                )}
                              </span>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </div>
      )}

      {/* ─── TOAST NOTIFICATION POPUP ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 bg-zinc-900/90 border border-white/10 rounded-xl p-4 shadow-2xl backdrop-blur-md select-none text-xs font-semibold"
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span className="text-zinc-200">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PAYLOAD TEMPLATE SIMULATION PREVIEW MODAL ─── */}
      <AnimatePresence>
        {previewPayload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewPayload(null)}
              className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl max-w-2xl w-full relative z-10 shadow-2xl text-left overflow-hidden flex flex-col h-[85vh] select-none"
            >
              <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/20 via-transparent to-transparent rounded-t-3xl" />
              
              {/* Modal header bar */}
              <div className="flex justify-between items-center p-4 border-b border-white/5 flex-shrink-0">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-technical">Cinematic Payload Preview</span>
                <button
                  onClick={() => setPreviewPayload(null)}
                  className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-350 transition-colors border-none bg-transparent cursor-pointer outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Simulation iframe container */}
              <div className="flex-1 w-full bg-zinc-950 p-2 overflow-hidden">
                <iframe
                  title="Cinematic Email Preview Layout"
                  srcDoc={generateCinematicEmail(previewPayload.subject, previewPayload.content, previewPayload.logistics)}
                  className="w-full h-full border-none rounded-2xl bg-[#09090b]"
                />
              </div>

              {/* Modal footer controls */}
              <div className="p-4 border-t border-white/5 flex justify-end flex-shrink-0">
                <button
                  onClick={() => setPreviewPayload(null)}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-bold font-form uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none outline-none"
                >
                  Close Preview
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
