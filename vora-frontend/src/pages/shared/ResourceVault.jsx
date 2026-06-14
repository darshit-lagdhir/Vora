import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import apiClient from '../../services/apiClient.js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  ExternalLink, 
  Trash2, 
  FileText, 
  Video, 
  Globe, 
  AlertCircle
} from 'lucide-react';
import Heading from '../../components/ui/Heading.jsx';

/**
 * SkeletonBlock renders a geometric shape with a smooth Framer Motion pulse animation.
 */
function SkeletonBlock({ className }) {
  return (
    <motion.div
      animate={{ backgroundColor: ["#18181b", "#27272a", "#18181b"] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      className={`rounded ${className}`}
    />
  );
}

/**
 * SkeletonCard mirrors the exact footprint of the loaded bento resource stubs.
 */
function SkeletonCard() {
  return (
    <div className="soft-glass rounded-[1.5rem] p-6 h-56 flex flex-col justify-between relative overflow-hidden select-none">
      <div>
        <SkeletonBlock className="w-10 h-10 rounded-xl" />
        <SkeletonBlock className="h-6 w-3/4 rounded-xl mt-4" />
        <SkeletonBlock className="h-3.5 w-1/3 rounded-lg mt-2" />
      </div>
      <SkeletonBlock className="h-10 w-full rounded-lg mt-6" />
    </div>
  );
}

/**
 * SkeletonHeader mirrors the header blocks to avoid layout shift.
 */
function SkeletonHeader() {
  return (
    <div className="space-y-4 select-none">
      <SkeletonBlock className="h-5 w-40 rounded-full" />
      <SkeletonBlock className="h-10 sm:h-12 w-2/3 rounded-xl mt-2" />
      <div className="space-y-2 mt-3">
        <SkeletonBlock className="h-4 w-5/6 rounded-lg" />
        <SkeletonBlock className="h-4 w-2/3 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Custom category select dropdown built using Framer Motion.
 */
function CustomDropdown({ value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative w-full">
      <button
        type="button"
        id="dropdown-resource-type-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-zinc-950 border border-white/5 hover:border-white/10 rounded-xl px-4 py-3.5 text-white font-sans text-sm w-full outline-none flex items-center justify-between cursor-pointer select-none transition-colors"
      >
        <span>{selectedOption.label}</span>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-away overlay */}
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-white/10 rounded-xl p-1.5 shadow-2xl z-20 select-none overflow-hidden"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors font-form block ${
                    opt.value === value
                      ? 'bg-primary-500/10 text-primary-400 font-semibold'
                      : 'text-zinc-350 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ResourceVault() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Role deduction context
  const isOrganizer = user?.role?.toLowerCase() === 'organizer';

  // State Management
  const [event, setEvent] = useState(null);
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Ingestion form state (Organizer only)
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState('Presentation Deck');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Deletion modal state (Organizer only)
  const [resourceToDelete, setResourceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const dropdownOptions = [
    { value: 'Presentation Deck', label: 'Presentation Deck (PDF)' },
    { value: 'Video Recording', label: 'Video Recording (MP4)' },
    { value: 'External Article', label: 'External Article (Link)' }
  ];

  // Set document title dynamically
  useEffect(() => {
    document.title = "Vora — Shared Resource Vault";
  }, []);

  // Lock body scroll when confirmation modal is mounted
  useEffect(() => {
    if (resourceToDelete) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [resourceToDelete]);

  // Hydrate Event and associated Resource deck
  const loadVaultData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      // 1. Fetch event details
      const eventRes = await apiClient.get(`/api/v1/events/${eventId}`);
      if (eventRes.data?.success) {
        setEvent(eventRes.data.data);
      } else {
        throw new Error('Failed to resolve event information.');
      }

      // 2. Fetch resources
      const resourcesRes = await apiClient.get(`/api/v1/events/${eventId}/resources`);
      if (resourcesRes.data?.success) {
        setResources(resourcesRes.data.data || []);
      } else {
        throw new Error('Failed to fetch event resources.');
      }
    } catch (err) {
      console.error('[ResourceVault] Failed to load data:', err);
      setApiError(err.response?.data?.message || err.message || 'Error loading resource vault.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      loadVaultData();
    }
  }, [eventId]);

  // Context-aware back button routing handler
  const handleBack = () => {
    navigate(isOrganizer ? '/organizer/dashboard' : '/attendee');
  };

  // Submit new resource record mutation (Organizer only)
  const handlePublishResource = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) {
      setFormError('Please enter both a title and a valid URL.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        title: newTitle.trim(),
        url: newUrl.trim(),
        type: newType,
        visibility_clearance: 'public_accessible'
      };

      const res = await apiClient.post(`/api/v1/events/${eventId}/resources`, payload);
      if (res.data?.success) {
        // Optimistic UI updates
        setResources(prev => [...prev, res.data.data]);
        setNewTitle('');
        setNewUrl('');
        setNewType('Presentation Deck');
      } else {
        throw new Error('Failed to create resource entry.');
      }
    } catch (err) {
      console.error('[ResourceVault] Publishing failed:', err);
      setFormError(err.response?.data?.message || 'Publishing failed. Check input details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete resource document from database (Organizer only)
  const handleDeleteResource = async () => {
    if (!resourceToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await apiClient.delete(`/api/v1/resources/${resourceToDelete.id}`);
      if (res.data?.success) {
        // Optimistic UI update
        setResources(prev => prev.filter(r => r.id !== resourceToDelete.id));
        setResourceToDelete(null);
      } else {
        throw new Error('Failed to delete resource.');
      }
    } catch (err) {
      console.error('[ResourceVault] Deletion failed:', err);
      setDeleteError(err.response?.data?.message || 'Failed to remove resource.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Extract root domain hostname for clean metadata previews
  const getHostFromUrl = (urlStr) => {
    try {
      const url = new URL(urlStr);
      return url.hostname.toUpperCase();
    } catch {
      return 'EXTERNAL RESOURCE';
    }
  };

  // Render resource-type specific icons
  const renderResourceIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) {
      return <FileText className="w-5 h-5 text-sky-400" />;
    } else if (mimeType?.includes('video') || mimeType?.includes('mp4')) {
      return <Video className="w-5 h-5 text-rose-400" />;
    }
    return <Globe className="w-5 h-5 text-emerald-400" />;
  };

  const getButtonText = (mimeType) => {
    if (mimeType?.includes('pdf')) return 'Download PDF';
    if (mimeType?.includes('video') || mimeType?.includes('mp4')) return 'Access Video';
    return 'Open Resource';
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col w-full text-white font-sans overflow-x-hidden">
      
      {/* ─── STICKY HEADER SECTION (TASK 1) ─── */}
      <header className="sticky top-0 z-40 bg-zinc-900/40 backdrop-blur-xl border-b border-white/5 w-full h-16 flex items-center justify-between px-4 sm:px-6 select-none">
        <button 
          id="btn-vault-back"
          onClick={handleBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium border-none bg-transparent cursor-pointer outline-none font-sans"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isOrganizer ? "Return to Command Center" : "Return to Ticket Wallet"}</span>
        </button>

        <span className="font-display text-white text-sm tracking-tight font-medium">
          vora <span className="text-zinc-500 font-normal">/ Resource Vault</span>
        </span>
      </header>

      {/* ─── CENTRAL ARCHIVE COLUMN (TASK 1) ─── */}
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 flex flex-col gap-8 flex-grow">
        
        {/* ─── CINEMATIC HEADER (TASK 2) ─── */}
        <section className="text-left space-y-3 select-none pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 tracking-[0.25em] uppercase font-accent">
              ARCHIVED EVENT RESOURCES
            </span>

            {/* Organizer dynamic telemetry count badge (Geist) */}
            {isOrganizer && !isLoading && (
              <span className="text-[10px] font-bold text-primary-400 font-technical uppercase border border-primary-500/20 bg-primary-500/5 px-2.5 py-1 rounded-full select-none tracking-widest inline-block">
                {resources.length} {resources.length === 1 ? 'RESOURCE' : 'RESOURCES'}
              </span>
            )}
          </div>

          {isLoading ? (
            <SkeletonHeader />
          ) : (
            <>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-elegant font-bold tracking-tight text-white leading-none">
                {event?.title}
              </h1>
              
              <p className="text-zinc-500 text-xs sm:text-sm font-sans leading-relaxed max-w-[65ch]">
                Access the curated collection of presentation decks, video recordings, and external citations provided by the event organizer.
              </p>
            </>
          )}
        </section>

        {/* ─── INGESTION MATRIX (TASK 3) (ORGANIZER ONLY) ─── */}
        {isOrganizer && !isLoading && (
          <section className="text-left">
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl">
              
              {/* Overhead brand-colored linear gradient boundary */}
              <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/30 via-primary-500/10 to-transparent rounded-t-[2rem]" />
              
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-accent block mb-6">
                Publish New Resource
              </span>

              <form onSubmit={handlePublishResource} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Title */}
                  <div className="sm:col-span-2 flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] font-technical">
                      Resource Title
                    </label>
                    <input 
                      id="input-resource-title"
                      type="text"
                      placeholder="e.g., Keynote Architecture Slides"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="bg-zinc-950 border border-white/5 hover:border-white/10 rounded-xl px-4 py-3.5 text-white font-form text-sm w-full outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                  </div>

                  {/* URL */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] font-technical">
                      Resource URL
                    </label>
                    <input 
                      id="input-resource-url"
                      type="text"
                      placeholder="e.g., https://drive.google.com/..."
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="bg-zinc-950 border border-white/5 hover:border-white/10 rounded-xl px-4 py-3.5 text-white font-form text-sm w-full outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                  </div>

                  {/* Custom Dropdown Selection Category */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] font-technical select-none">
                      Resource Type
                    </label>
                    <CustomDropdown 
                      value={newType} 
                      onChange={setNewType} 
                      options={dropdownOptions} 
                    />
                  </div>

                </div>

                {formError && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    id="btn-publish-submit"
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-primary-600 hover:bg-primary-500 disabled:opacity-75 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-primary-600/20 hover:shadow-primary-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center gap-2 border-none cursor-pointer outline-none text-xs tracking-wider uppercase font-form"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Publish to Vault</span>
                      </>
                    )}
                  </button>
                </div>

              </form>

            </div>

            {/* Subtle Divider Line */}
            <div className="w-full h-px bg-zinc-900 my-8" />
          </section>
        )}

        {/* ─── DIGITAL ARCHIVE LEDGER (TASK 4) ─── */}
        <section className="flex-grow">
          <AnimatePresence mode="wait">
            
            {/* 1. Loading State */}
            {isLoading && (
              <motion.div 
                key="loading-skeletons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {[1, 2, 3, 4].map(idx => (
                  <SkeletonCard key={idx} />
                ))}
              </motion.div>
            )}

            {/* 2. Error State */}
            {!isLoading && apiError && (
              <motion.div 
                key="error-boundary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center max-w-md mx-auto my-12"
              >
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <h4 className="text-white font-semibold font-display">Vault Error Encountered</h4>
                <p className="text-xs text-red-400/80 mt-1 font-sans">{apiError}</p>
                <button 
                  onClick={loadVaultData}
                  className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500 text-white rounded-lg text-xs transition-colors border border-red-500/35 cursor-pointer outline-none font-form uppercase tracking-wider"
                >
                  Retry Request
                </button>
              </motion.div>
            )}

            {/* 3. Role-Differentiated Empty States (TASK 6) */}
            {!isLoading && !apiError && resources.length === 0 && (
              <motion.div 
                key="empty-roster"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-20 px-6 border border-dashed border-white/5 rounded-[2.5rem] bg-zinc-900/10 max-w-md mx-auto relative select-none"
              >
                <div className="absolute inset-0 bg-radial-gradient from-primary-600/5 to-transparent blur-xl pointer-events-none -z-10" />
                
                {isOrganizer ? (
                  <>
                    {/* SVG upload cloud / empty folder */}
                    <svg className="w-12 h-12 text-zinc-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                    <h3 className="text-xl font-bold text-white font-display tracking-tight">
                      Your Vault is Empty
                    </h3>
                    <p className="text-zinc-500 text-xs font-sans max-w-xs mx-auto mt-2 leading-relaxed">
                      You have not published any post-event materials. Use the ingestion interface above to share your first presentation or recording with your attendees.
                    </p>
                  </>
                ) : (
                  <>
                    {/* SVG calendar / closed archive box */}
                    <svg className="w-12 h-12 text-zinc-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                    <h3 className="text-xl font-bold text-white font-display tracking-tight">
                      Archive Pending
                    </h3>
                    <p className="text-zinc-500 text-xs font-sans max-w-xs mx-auto mt-2 leading-relaxed">
                      The event organizer has not yet published any post-event materials to this vault. Please check back later or monitor your communication channels for updates.
                    </p>
                  </>
                )}
              </motion.div>
            )}

            {/* 4. Bento Grid (TASK 4) */}
            {!isLoading && !apiError && resources.length > 0 && (
              <motion.div 
                key="ledger-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <AnimatePresence>
                  {resources.map((resource) => (
                    <motion.div 
                      key={resource.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, height: 0, margin: 0, padding: 0 }}
                      whileHover={{ y: -4, borderColor: "rgba(255, 255, 255, 0.15)", boxShadow: "0 0 30px -5px rgba(139, 92, 246, 0.2)" }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="soft-glass rounded-[1.5rem] p-6 flex flex-col justify-between group relative h-56 text-left cursor-pointer"
                    >
                      {/* Delete Action Trigger (TASK 5) (Organizer Only) */}
                      {isOrganizer && (
                        <button
                          id={`btn-resource-delete-${resource.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setResourceToDelete(resource);
                          }}
                          className="absolute top-4 right-4 text-zinc-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer border-none bg-transparent outline-none z-10"
                          aria-label="Remove Resource"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div>
                        {/* Zone 1: Icon identifier inside light zinc block */}
                        <div className="w-10 h-10 rounded-xl bg-zinc-800/40 flex items-center justify-center text-zinc-400 group-hover:text-primary-400 transition-colors">
                          {renderResourceIcon(resource.mime_type)}
                        </div>
                        
                        {/* Zone 2: Title of resource (Cabinet Grotesk) */}
                        <Heading level="h4" className="text-base font-bold text-white mt-4 font-accent line-clamp-2 leading-tight">
                          {resource.asset_name}
                        </Heading>

                        {/* Zone 3: Domain Metadata indicator (Geist) */}
                        <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase font-technical mt-1.5 block truncate">
                          {getHostFromUrl(resource.file_url)}
                        </span>
                      </div>

                      {/* Zone 4: Full-width action button (Inter) */}
                      <div className="w-full">
                        <motion.a 
                          id={`btn-resource-access-${resource.id}`}
                          href={resource.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-zinc-950/20 hover:bg-zinc-900/40 border border-white/5 hover:border-white/10 text-zinc-300 hover:text-white font-brutalist py-2.5 rounded-xl transition-all mt-6 flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:neon-diffuse decoration-none select-none cursor-pointer block text-center"
                        >
                          <span>{getButtonText(resource.mime_type)}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </motion.a>
                      </div>

                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

          </AnimatePresence>
        </section>

      </main>

      {/* ─── DELETION CONFIRMATION DIALOG (TASK 5) (ORGANIZER ONLY) ─── */}
      <AnimatePresence>
        {resourceToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDeleting) {
                  setResourceToDelete(null);
                  setDeleteError(null);
                }
              }}
              className="fixed inset-0 bg-zinc-950/80 backdrop-blur-24 pointer-events-auto"
            />

            {/* Modal Chassis */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-zinc-900/90 border border-white/10 rounded-2xl p-6 sm:p-8 max-w-md w-full relative z-10 shadow-2xl text-left overflow-hidden select-none"
            >
              {/* Top highlight indicator */}
              <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-red-500/20 via-red-500/10 to-transparent rounded-t-2xl" />

              {/* Close button */}
              <button
                onClick={() => {
                  if (!isDeleting) {
                    setResourceToDelete(null);
                    setDeleteError(null);
                  }
                }}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-350 transition-colors z-20 outline-none border-none bg-transparent cursor-pointer"
                aria-label="Close modal dialog"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white tracking-tight font-display">
                  Permanently Delete Resource?
                </h3>
                
                <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                  You are about to permanently remove <strong className="text-white font-semibold">{resourceToDelete?.asset_name}</strong> from the shared vault. Attendees will instantly lose access to this material. This action cannot be reversed.
                </p>

                {deleteError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2 leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4 font-semibold text-xs tracking-wider uppercase select-none">
                  
                  {/* destructive button */}
                  <button
                    id="btn-modal-confirm-delete"
                    onClick={handleDeleteResource}
                    disabled={isDeleting}
                    className="flex-1 bg-red-950/45 hover:bg-red-900 border border-red-500/30 text-rose-400 hover:text-white py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer outline-none focus:ring-2 focus:ring-red-500/50 font-form"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Confirm Deletion</span>
                      </>
                    ) : (
                      <span>Confirm Deletion</span>
                    )}
                  </button>

                  {/* Cancel Button */}
                  <button
                    id="btn-modal-cancel-delete"
                    onClick={() => setResourceToDelete(null)}
                    disabled={isDeleting}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer outline-none font-form"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
