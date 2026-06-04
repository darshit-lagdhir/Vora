import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Search,
  Download,
  Trash2,
  CheckCircle,
  Loader2,
  Upload,
  Archive,
  File,
  FileSpreadsheet,
  Copy,
  CheckCheck,
  X,
  AlertTriangle,
  BookOpen,
  Scale,
  ExternalLink,
  Plus,
} from 'lucide-react';
import apiClient from '../../services/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';

// ─── Byte Size Formatting Utility ────────────────────────────────────────────
/**
 * Converts raw byte integers into human-readable megabyte/gigabyte strings,
 * rounded strictly to two decimal places.
 */
function formatByteSize(bytes) {
  if (bytes === 0 || bytes === null || bytes === undefined) return '0.00 B';
  const b = Number(bytes);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(2)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── File Extension Parser ───────────────────────────────────────────────────
function getExtension(mimeType, assetName) {
  if (assetName) {
    const ext = assetName.split('.').pop()?.toUpperCase();
    if (ext) return ext;
  }
  const map = {
    'application/pdf': 'PDF',
    'application/zip': 'ZIP',
    'application/gzip': 'GZ',
    'application/x-tar': 'TAR',
    'application/vnd.ms-powerpoint': 'PPT',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'text/plain': 'TXT',
  };
  return map[mimeType] || 'FILE';
}

// ─── File Type Icon Resolver ─────────────────────────────────────────────────
function FileTypeIcon({ mimeType, assetName, className }) {
  const ext = getExtension(mimeType, assetName);
  const iconProps = { className: className || 'w-5 h-5' };

  switch (ext) {
    case 'PDF':
      return <FileText {...iconProps} />;
    case 'ZIP':
    case 'GZ':
    case 'TAR':
      return <Archive {...iconProps} />;
    case 'PPT':
    case 'PPTX':
      return <FileSpreadsheet {...iconProps} />;
    case 'TXT':
    case 'CSV':
    case 'LOG':
    case 'MD':
      return <File {...iconProps} />;
    default:
      return <File {...iconProps} />;
  }
}

// ─── Static Citation Data ────────────────────────────────────────────────────
const CITATION_BLOCKS = [
  {
    id: 'cite-1',
    category: 'Academic Reference',
    text: 'Lamport, L. (2019). "Distributed Systems: Principles and Paradigms." Prentice Hall, 3rd Edition. ISBN: 978-0-13-239227-3. Chapter 8: Consensus Protocols and Fault Tolerance, pp. 284-312.',
  },
  {
    id: 'cite-2',
    category: 'Standards Compliance',
    text: 'IEEE 802.11ax-2021. "Wireless LAN Medium Access Control (MAC) and Physical Layer (PHY) Specifications." Institute of Electrical and Electronics Engineers Standards Association.',
  },
  {
    id: 'cite-3',
    category: 'Legal Disclaimer',
    text: 'All conference materials, slide decks, and presentation recordings distributed through this platform are the intellectual property of their respective authors and speakers. Unauthorized redistribution, commercial use, or derivative work creation is strictly prohibited under applicable copyright law (17 U.S.C. §§ 101-810).',
  },
  {
    id: 'cite-4',
    category: 'Speaker Contact',
    text: 'Dr. Elena Vasquez — Principal Research Scientist, Distributed Systems Lab. Contact: e.vasquez@research.vora.edu | ORCID: 0000-0002-1234-5678 | Office: Building 42, Room 318.',
  },
  {
    id: 'cite-5',
    category: 'Data Privacy Notice',
    text: 'This platform processes personal data in accordance with the General Data Protection Regulation (GDPR) (EU) 2016/679 and the California Consumer Privacy Act (CCPA). Download telemetry is collected for usage analytics. Users may request data deletion by contacting privacy@vora.edu.',
  },
  {
    id: 'cite-6',
    category: 'Academic Reference',
    text: 'Tanenbaum, A. S., & Van Steen, M. (2017). "Distributed Systems: Principles and Paradigms." Pearson Education. DOI: 10.1007/978-3-319-77525-8. Sections 6.3–6.7: Distributed Consensus.',
  },
  {
    id: 'cite-7',
    category: 'License Agreement',
    text: 'Presentation materials are licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0). Full license text available at: https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode',
  },
  {
    id: 'cite-8',
    category: 'Speaker Contact',
    text: 'Prof. Marcus Chen — Chair of Computer Science, Vora Institute of Technology. Contact: m.chen@vora.edu | Google Scholar: scholar.google.com/citations?user=Ab12CdEf | Research Gate: researchgate.net/profile/Marcus-Chen-42',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: Resource Library & Academic Bibliography Matrix
// ═══════════════════════════════════════════════════════════════════════════════

const Resources = ({ eventId: propEventId, viewMode: propViewMode }) => {
  const { user } = useAuth();

  // ─── State Management ────────────────────────────────────────────────────
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(propEventId || '');

  // Download state tracking (keyed by resource ID)
  const [downloadStates, setDownloadStates] = useState({});

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadVisibility, setUploadVisibility] = useState('public_accessible');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Citation copy feedback
  const [copiedAll, setCopiedAll] = useState(false);
  const [hoveredCitation, setHoveredCitation] = useState(null);

  // File input ref
  const fileInputRef = useRef(null);

  // ─── Context-Aware Role Discrimination ───────────────────────────────────
  const isOrganizer = propViewMode === 'organizer' || user?.role === 'organizer';

  // ─── Fetch Organizer Events (for event selector) ─────────────────────────
  useEffect(() => {
    if (!isOrganizer) return;
    const fetchEvents = async () => {
      try {
        const res = await apiClient.get('/api/v1/events');
        if (res?.data?.success && Array.isArray(res.data.data)) {
          setEvents(res.data.data);
          if (!selectedEventId && res.data.data.length > 0) {
            setSelectedEventId(res.data.data[0].id);
          }
        }
      } catch (err) {
        console.error('[Resources] Failed to load events:', err);
      }
    };
    fetchEvents();
  }, [isOrganizer]);

  // ─── Fetch Resources for Selected Event ──────────────────────────────────
  const fetchResources = useCallback(async () => {
    const targetEventId = propEventId || selectedEventId;
    if (!targetEventId) {
      setResources([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/api/v1/resources/event/${targetEventId}`);
      if (res?.data?.success) {
        setResources(res.data.data || []);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load resources.';
      setError(msg);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, propEventId]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // ─── Search Filter Logic ─────────────────────────────────────────────────
  const filteredResources = resources.filter((r) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      r.asset_name?.toLowerCase().includes(q) ||
      r.mime_type?.toLowerCase().includes(q)
    );
  });

  // ─── Asynchronous Download Physics (Task 8) ──────────────────────────────
  const handleDownload = async (resource) => {
    const rid = resource.id;

    // Lock button into spinning state
    setDownloadStates((prev) => ({ ...prev, [rid]: 'loading' }));

    try {
      // 1. Request time-limited signed download token
      const tokenRes = await apiClient.get(`/api/v1/resources/download-token/${rid}`);
      const downloadToken = tokenRes?.data?.data?.download_token;

      if (!downloadToken) {
        throw new Error('Download token was not returned by the server.');
      }

      // 2. Construct the signed download URL
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const downloadUrl = `${baseUrl}/api/v1/resources/download-file?token=${encodeURIComponent(downloadToken)}`;

      // 3. Create invisible anchor, trigger synthetic click, destroy
      const invisibleAnchor = document.createElement('a');
      invisibleAnchor.href = downloadUrl;
      invisibleAnchor.download = resource.asset_name || 'download';
      invisibleAnchor.style.display = 'none';
      document.body.appendChild(invisibleAnchor);
      invisibleAnchor.click();
      document.body.removeChild(invisibleAnchor);

      // 4. Show success checkmark for 2 seconds, then revert
      setDownloadStates((prev) => ({ ...prev, [rid]: 'success' }));
      setTimeout(() => {
        setDownloadStates((prev) => ({ ...prev, [rid]: 'idle' }));
      }, 2000);
    } catch (err) {
      console.error('[Resources] Download failed:', err);
      setDownloadStates((prev) => ({ ...prev, [rid]: 'error' }));
      setTimeout(() => {
        setDownloadStates((prev) => ({ ...prev, [rid]: 'idle' }));
      }, 2000);
    }
  };

  // ─── Delete Resource (Organizer Only) ────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/v1/resources/${deleteTarget.id}`);
      setResources((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('[Resources] Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Upload Resource (Organizer Only) ────────────────────────────────────
  const handleUpload = async () => {
    if (!uploadFile || !selectedEventId) return;
    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('event_id', selectedEventId);
      formData.append('visibility_clearance', uploadVisibility);

      const res = await apiClient.post('/api/v1/resources', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      if (res?.data?.success) {
        setUploadModalOpen(false);
        setUploadFile(null);
        fetchResources();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Upload failed.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  // ─── Copy All Citations ──────────────────────────────────────────────────
  const handleCopyAll = async () => {
    const allText = CITATION_BLOCKS.map(
      (c) => `[${c.category}]\n${c.text}`
    ).join('\n\n');
    try {
      await navigator.clipboard.writeText(allText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error('[Resources] Clipboard write failed:', err);
    }
  };

  // ─── Download Button Renderer ────────────────────────────────────────────
  const renderDownloadButton = (resource) => {
    const state = downloadStates[resource.id] || 'idle';

    const baseClasses =
      'w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ease-out outline-none shrink-0';

    if (state === 'loading') {
      return (
        <button disabled className={`${baseClasses} bg-accent-violet/20 cursor-wait`}>
          <Loader2 className="w-4.5 h-4.5 text-accent-violet animate-spin" />
        </button>
      );
    }

    if (state === 'success') {
      return (
        <button disabled className={`${baseClasses} bg-status-success/20`}>
          <CheckCircle className="w-4.5 h-4.5 text-status-success" />
        </button>
      );
    }

    if (state === 'error') {
      return (
        <button disabled className={`${baseClasses} bg-status-danger/20`}>
          <AlertTriangle className="w-4.5 h-4.5 text-status-danger" />
        </button>
      );
    }

    return (
      <button
        onClick={() => handleDownload(resource)}
        className={`${baseClasses} opacity-50 hover:opacity-100 hover:bg-accent-violet/15 group/dl`}
        title={`Download ${resource.asset_name}`}
        aria-label={`Download ${resource.asset_name}`}
      >
        <Download className="w-4.5 h-4.5 text-slate-300 group-hover/dl:text-white transition-colors duration-300" />
        {/* Gradient border ring on hover */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover/dl:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(59,130,246,0.4))',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'xor',
            WebkitMaskComposite: 'xor',
            padding: '1px',
            borderRadius: '12px',
          }}
        />
      </button>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="resource-library-wrapper h-full flex flex-col overflow-hidden">

      {/* ─── Inline Scoped Styles ───────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap');

        .resource-library-wrapper {
          --glass-bg: rgba(17, 24, 39, 0.4);
          --glass-blur: 24px;
          --card-bg: rgba(3, 7, 18, 0.6);
          --meta-gray: #9ca3af;
          --border-gradient-start: rgba(139, 92, 246, 0.3);
          --border-gradient-end: rgba(59, 130, 246, 0.2);
        }

        .glass-panel-resource {
          background: var(--glass-bg);
          backdrop-filter: blur(var(--glass-blur));
          -webkit-backdrop-filter: blur(var(--glass-blur));
          border: 1px solid transparent;
          border-image: linear-gradient(
            135deg,
            var(--border-gradient-start),
            var(--border-gradient-end)
          ) 1;
        }

        .glass-panel-clip {
          background: var(--glass-bg);
          backdrop-filter: blur(var(--glass-blur));
          -webkit-backdrop-filter: blur(var(--glass-blur));
          border: 1px solid rgba(139, 92, 246, 0.15);
          border-radius: 16px;
        }

        .resource-card {
          background: var(--card-bg);
          border-radius: 16px;
          padding: 24px;
          transition: all 0.25s ease;
          border: 1px solid rgba(30, 41, 59, 0.5);
        }
        .resource-card:hover {
          border-color: rgba(139, 92, 246, 0.25);
          background: rgba(3, 7, 18, 0.75);
        }

        .citation-block {
          padding: 12px 14px;
          border-radius: 8px;
          transition: all 0.15s ease;
          cursor: default;
          border: 1px solid transparent;
        }
        .citation-block:hover {
          background: rgba(139, 92, 246, 0.05);
          color: #ffffff;
          border-color: rgba(139, 92, 246, 0.1);
        }

        .mono-text {
          font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', ui-monospace, monospace;
        }

        .resource-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .resource-scroll::-webkit-scrollbar-track {
          background: rgba(11, 15, 25, 0.4);
        }
        .resource-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.15);
          border-radius: 9999px;
        }
        .resource-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.3);
        }

        .file-type-badge {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(139, 92, 246, 0.08);
          border: 1px solid rgba(139, 92, 246, 0.15);
          flex-shrink: 0;
        }

        .title-clamp {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .delete-trigger {
          opacity: 0.4;
          transition: all 0.2s ease;
        }
        .delete-trigger:hover {
          opacity: 1;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        /* Upload modal overlay */
        .upload-overlay {
          animation: fadeIn 0.2s ease;
        }
        .upload-panel {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Mobile overrides: collapse dual-panel into single column */
        @media (max-width: 767px) {
          .dual-panel-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .citation-panel {
            max-height: none !important;
            overflow-y: visible !important;
          }
          .download-panel {
            max-height: none !important;
            overflow-y: visible !important;
          }
        }
      `}</style>

      {/* ─── Top Header Bar: Event Selector + Upload ────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-blue/10 border border-accent-violet/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-accent-violet" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Resource Library</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">
              {isOrganizer ? 'Manage and distribute conference assets' : 'Download conference materials'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Event Selector Dropdown (organizer only) */}
          {isOrganizer && events.length > 0 && (
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-[#030712]/60 border border-brand-card text-sm text-white rounded-xl px-3 py-2 outline-none focus:border-accent-violet/50 transition-colors max-w-[220px] truncate"
              aria-label="Select event"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          )}

          {/* Upload Button (organizer only) */}
          {isOrganizer && selectedEventId && (
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-violet to-accent-blue text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity duration-200 shadow-lg shadow-accent-violet/10"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Dual-Panel Asymmetric Layout Grid (65% / 35%) ──────────────── */}
      <div
        className="dual-panel-grid flex-1 min-h-0"
        style={{
          display: 'grid',
          gridTemplateColumns: '65fr 35fr',
          gap: '32px',
        }}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            LEFT PANEL: Core Download Asset Grid (65%)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="glass-panel-clip download-panel flex flex-col min-h-0 overflow-hidden">

          {/* Panel Header */}
          <div className="shrink-0 px-6 pt-5 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.04]">
            <h3 className="text-[13px] font-semibold text-white tracking-wide">
              Conference Assets & Presentation Archives
            </h3>
            <div className="relative w-full sm:w-56">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Filter assets..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#030712]/50 border border-white/[0.06] focus:border-accent-violet/30 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-600 outline-none transition-colors duration-200"
                aria-label="Filter resources by name"
              />
            </div>
          </div>

          {/* Scrollable Asset Card Stack */}
          <div className="flex-1 overflow-y-auto resource-scroll px-5 py-4 space-y-4">

            {/* Loading Skeleton */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <Loader2 className="w-7 h-7 text-accent-violet animate-spin" />
                <span className="text-xs text-slate-500 font-semibold tracking-wide">Loading resources...</span>
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
                <AlertTriangle className="w-8 h-8 text-status-danger/60" />
                <p className="text-xs text-slate-400 max-w-xs">{error}</p>
                <button
                  onClick={fetchResources}
                  className="text-[11px] text-accent-violet font-semibold hover:underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredResources.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-accent-violet/8 border border-accent-violet/10 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-accent-violet/40" />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-bold text-white/60">No Resources Found</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    {selectedEventId
                      ? searchFilter
                        ? 'No assets match your search query.'
                        : 'No assets have been uploaded for this event yet.'
                      : 'Select an event to view its resource library.'}
                  </p>
                </div>
              </div>
            )}

            {/* ─── Resource Card Array ──────────────────────────────────── */}
            {!loading &&
              !error &&
              filteredResources.map((resource) => (
                <div key={resource.id} className="resource-card group/card relative">
                  <div className="flex items-start gap-4">
                    {/* File Type Icon Badge */}
                    <div className="file-type-badge mt-0.5">
                      <FileTypeIcon
                        mimeType={resource.mime_type}
                        assetName={resource.asset_name}
                        className="w-4 h-4 text-accent-violet/70"
                      />
                    </div>

                    {/* Text Stack: Title + Metadata */}
                    <div className="flex-1 min-w-0">
                      {/* Primary Asset Name (2-line clamp) */}
                      <h4 className="title-clamp text-sm font-medium text-white leading-snug">
                        {resource.asset_name}
                      </h4>

                      {/* Monospace Metadata Row */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span
                          className="mono-text text-[11px] font-medium px-1.5 py-0.5 rounded bg-accent-violet/8 border border-accent-violet/10"
                          style={{ color: '#9ca3af' }}
                        >
                          {getExtension(resource.mime_type, resource.asset_name)}
                        </span>
                        <span className="mono-text text-[11px]" style={{ color: '#9ca3af' }}>
                          {formatByteSize(resource.file_size_bytes)}
                        </span>
                        <span className="mono-text text-[11px]" style={{ color: '#9ca3af' }}>
                          {resource.download_count ?? 0} download{(resource.download_count ?? 0) !== 1 ? 's' : ''}
                        </span>
                        {resource.visibility_clearance && (
                          <span className="mono-text text-[10px] text-accent-blue/60">
                            {resource.visibility_clearance === 'attendees_only' ? '🔒 Attendees' : '🌐 Public'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Triggers (right side) */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Delete Trigger (Organizer Only — Task 9) */}
                      {isOrganizer && (
                        <button
                          onClick={() => setDeleteTarget(resource)}
                          className="delete-trigger w-9 h-9 flex items-center justify-center rounded-xl outline-none"
                          title="Delete resource"
                          aria-label={`Delete ${resource.asset_name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Download Trigger (Task 5 & 8) */}
                      <div className="relative">
                        {renderDownloadButton(resource)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            RIGHT PANEL: Verbatim Text Citation Matrix (35%)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="glass-panel-clip citation-panel flex flex-col min-h-0 overflow-hidden">

          {/* Citation Panel Header */}
          <div className="shrink-0 px-5 pt-5 pb-4 flex items-center justify-between border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Scale className="w-3.5 h-3.5 text-accent-blue/50" />
              <h3 className="text-[12px] font-semibold text-white tracking-wide">
                Academic Citations & Legal Referrals
              </h3>
            </div>
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 outline-none hover:bg-white/[0.03]"
              style={{ color: copiedAll ? '#10b981' : '#9ca3af' }}
              title="Copy all citations to clipboard"
              aria-label="Copy all citations"
            >
              {copiedAll ? (
                <>
                  <CheckCheck className="w-3 h-3" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy All</span>
                </>
              )}
            </button>
          </div>

          {/* Scrollable Citation Log */}
          <div className="flex-1 overflow-y-auto resource-scroll px-4 py-3 space-y-1">
            {CITATION_BLOCKS.map((cite) => (
              <div
                key={cite.id}
                className="citation-block"
                onMouseEnter={() => setHoveredCitation(cite.id)}
                onMouseLeave={() => setHoveredCitation(null)}
              >
                {/* Category Label */}
                <span
                  className="mono-text block text-[9px] font-medium uppercase tracking-wider mb-1.5"
                  style={{
                    color: hoveredCitation === cite.id ? '#8b5cf6' : 'rgba(156, 163, 175, 0.5)',
                  }}
                >
                  {cite.category}
                </span>

                {/* Citation Body (monospace, 10px, muted gray → glowing white on hover) */}
                <p
                  className="mono-text leading-relaxed transition-colors duration-150"
                  style={{
                    fontSize: '10px',
                    lineHeight: '1.6',
                    color: hoveredCitation === cite.id ? '#ffffff' : '#9ca3af',
                  }}
                >
                  {cite.text}
                </p>
              </div>
            ))}

            {/* Footer attribution */}
            <div className="pt-4 pb-2 px-3 border-t border-white/[0.04] mt-3">
              <p className="mono-text text-[9px] leading-relaxed" style={{ color: 'rgba(148, 163, 184, 0.35)' }}>
                All citations formatted per APA 7th Edition guidelines.
                Contact the conference organizer for additional bibliography
                requests or intellectual property inquiries.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DELETE CONFIRMATION POPOVER (Task 9)
      ═══════════════════════════════════════════════════════════════════ */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center upload-overlay"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="upload-panel w-full max-w-sm mx-4 rounded-2xl p-6 space-y-4"
            style={{
              background: 'rgba(15, 23, 42, 0.97)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-status-danger/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-status-danger" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Confirm Permanent Deletion</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  This action will permanently erase{' '}
                  <span className="text-white font-medium">"{deleteTarget.asset_name}"</span>{' '}
                  from both the storage bucket and the database. This is irreversible.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-brand-card/50 hover:bg-brand-card transition-colors outline-none disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-status-danger hover:bg-red-600 transition-colors outline-none disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{deleting ? 'Purging...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          UPLOAD MODAL (Organizer Only)
      ═══════════════════════════════════════════════════════════════════ */}
      {uploadModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center upload-overlay"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => !uploading && setUploadModalOpen(false)}
        >
          <div
            className="upload-panel w-full max-w-md mx-4 rounded-2xl p-6 space-y-5"
            style={{
              background: 'rgba(15, 23, 42, 0.97)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-blue/10 border border-accent-violet/15 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-accent-violet" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Upload Resource Asset</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">PDF, PPT, PPTX, TXT, ZIP, GZ, TAR — Max 50MB</p>
                </div>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-brand-card/50 transition-colors outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* File Drop Zone */}
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors duration-200"
              style={{
                borderColor: uploadFile ? 'rgba(139, 92, 246, 0.3)' : 'rgba(30, 41, 59, 0.6)',
                background: uploadFile ? 'rgba(139, 92, 246, 0.03)' : 'rgba(3, 7, 18, 0.4)',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.ppt,.pptx,.txt,.zip,.gz,.tar"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              {uploadFile ? (
                <div className="space-y-2">
                  <FileText className="w-8 h-8 text-accent-violet mx-auto" />
                  <p className="text-xs font-semibold text-white truncate">{uploadFile.name}</p>
                  <p className="mono-text text-[10px]" style={{ color: '#9ca3af' }}>
                    {formatByteSize(uploadFile.size)}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500">Click to select a file</p>
                </div>
              )}
            </div>

            {/* Visibility Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Access Level
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setUploadVisibility('public_accessible')}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border outline-none ${
                    uploadVisibility === 'public_accessible'
                      ? 'bg-accent-violet/10 border-accent-violet/30 text-white'
                      : 'bg-transparent border-brand-card/50 text-slate-500 hover:text-white'
                  }`}
                >
                  🌐 Public
                </button>
                <button
                  onClick={() => setUploadVisibility('attendees_only')}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border outline-none ${
                    uploadVisibility === 'attendees_only'
                      ? 'bg-accent-blue/10 border-accent-blue/30 text-white'
                      : 'bg-transparent border-brand-card/50 text-slate-500 hover:text-white'
                  }`}
                >
                  🔒 Attendees Only
                </button>
              </div>
            </div>

            {/* Upload Error */}
            {uploadError && (
              <div className="text-[11px] text-status-danger bg-status-danger/5 border border-status-danger/15 rounded-lg px-3 py-2">
                {uploadError}
              </div>
            )}

            {/* Upload Action */}
            <button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent-violet to-accent-blue hover:opacity-90 transition-opacity duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 outline-none"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload & Catalogue</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;
