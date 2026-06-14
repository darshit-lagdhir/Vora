import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import apiClient from '../../services/apiClient.js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  User, 
  Lock, 
  Bell, 
  ShieldAlert, 
  Monitor, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Trash2,
  Globe
} from 'lucide-react';

export default function Settings() {
  const { user, setUserData, logout } = useAuth();
  const navigate = useNavigate();

  // Active Category state: 'profile' | 'security' | 'notifications' | 'role'
  const [activeCategory, setActiveCategory] = useState('profile');

  // Toasts
  const [toast, setToast] = useState(null);

  // General Loading overlay (for role transitions, etc.)
  const [screenLoading, setScreenLoading] = useState(false);
  const [screenLoadingText, setScreenLoadingText] = useState('');

  // 1. PROFILE STATE
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || user?.firstName || '',
    last_name: user?.last_name || user?.lastName || '',
    email: user?.email || '',
    avatar_url: user?.avatar_url || user?.avatarUrl || ''
  });
  const [initialProfile, setInitialProfile] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);

  // 2. PASSWORD STATE
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // 3. NOTIFICATIONS STATE
  const [notifyState, setNotifyState] = useState({
    notify_event_start: user?.notify_event_start ?? user?.notifyEventStart ?? true,
    notify_weekly_digest: user?.notify_weekly_digest ?? user?.notifyWeeklyDigest ?? true,
    notify_marketing: user?.notify_marketing ?? user?.notifyMarketing ?? false
  });
  const [savingToggles, setSavingToggles] = useState({});

  // 4. ACTIVE SESSIONS STATE
  const [sessions, setSessions] = useState([
    { id: '1', os: 'macOS / Chrome', ip: '192.168.1.42', lastActive: 'Active Now', current: true },
    { id: '2', os: 'iOS / Safari', ip: '172.56.21.99', lastActive: '2 hours ago', current: false },
    { id: '3', os: 'Windows / Firefox', ip: '84.22.105.14', lastActive: '3 days ago', current: false }
  ]);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);

  // 5. ACCOUNT TERMINATION STATE
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Sync state on user load
  useEffect(() => {
    if (user) {
      const form = {
        first_name: user.first_name || user.firstName || '',
        last_name: user.last_name || user.lastName || '',
        email: user.email || '',
        avatar_url: user.avatar_url || user.avatarUrl || ''
      };
      setProfileForm(form);
      setInitialProfile(form);

      setNotifyState({
        notify_event_start: user.notify_event_start ?? user.notifyEventStart ?? true,
        notify_weekly_digest: user.notify_weekly_digest ?? user.notifyWeeklyDigest ?? true,
        notify_marketing: user.notify_marketing ?? user.notifyMarketing ?? false
      });
    }
  }, [user]);

  // SEO page title update
  useEffect(() => {
    document.title = "Vora — Global Preferences & Identity Console";
  }, []);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Profile Dirty Check
  const isProfileDirty = 
    profileForm.first_name !== initialProfile.first_name ||
    profileForm.last_name !== initialProfile.last_name ||
    profileForm.avatar_url !== initialProfile.avatar_url;

  // Programmatic initials generator
  const getInitials = () => {
    const f = profileForm.first_name?.charAt(0) || '';
    const l = profileForm.last_name?.charAt(0) || '';
    return (f + l).toUpperCase() || 'U';
  };

  // Avatar URL state blur sync
  const [displayAvatarUrl, setDisplayAvatarUrl] = useState(profileForm.avatar_url);
  const handleAvatarBlur = () => {
    setDisplayAvatarUrl(profileForm.avatar_url);
  };

  // Profile submission handler
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!isProfileDirty || profileSaving) return;
    setProfileSaving(true);
    try {
      const res = await apiClient.put('/api/v1/auth/profile', {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        avatar_url: profileForm.avatar_url
      });
      if (res.data?.success) {
        const updated = res.data.data;
        setUserData(updated);
        setInitialProfile({
          first_name: updated.first_name,
          last_name: updated.last_name,
          email: updated.email,
          avatar_url: updated.avatar_url
        });
        triggerToast("Identity updated successfully.", "success");
      }
    } catch (err) {
      triggerToast(err.response?.data?.message || "Failed to update profile.", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  // Password Strength Evaluator
  const getPasswordStrength = () => {
    const pw = passwordForm.new_password;
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    return score;
  };

  const strengthScore = getPasswordStrength();

  // Password submission handler
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.current_password || !passwordForm.new_password) {
      setPasswordError('Please fill out all password fields.');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('Passwords do not match.');
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await apiClient.put('/api/v1/auth/password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });

      if (res.data?.success) {
        setPasswordSuccess('Password successfully updated.');
        setPasswordForm({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
        triggerToast("Password credentials synchronized.", "success");
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to modify password credentials.');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Tactical Notification Switch save routine
  const togglePreference = async (key) => {
    if (savingToggles[key]) return;

    const updatedState = {
      ...notifyState,
      [key]: !notifyState[key]
    };

    // UI Optimistic Toggle
    setNotifyState(updatedState);
    setSavingToggles(prev => ({ ...prev, [key]: true }));

    try {
      const res = await apiClient.put('/api/v1/auth/notifications', updatedState);
      if (res.data?.success) {
        setUserData(res.data.data);
      }
    } catch (err) {
      // Revert state on fail
      setNotifyState(notifyState);
      triggerToast("Failed to sync preference with server.", "error");
    } finally {
      setSavingToggles(prev => ({ ...prev, [key]: false }));
    }
  };

  // Revoke Session ledger call
  const handleRevokeSessions = async () => {
    setRevokingSessions(true);
    try {
      // Simulate remote token revocation call delay
      await new Promise(r => setTimeout(r, 1200));
      setSessions(prev => prev.filter(s => s.current));
      setShowRevokeModal(false);
      triggerToast("All remote sessions revoked successfully.", "success");
    } catch (err) {
      triggerToast("Session termination failed.", "error");
    } finally {
      setRevokingSessions(false);
    }
  };

  // Role switching Bento Matrix caller
  const handleRoleSwitch = async (targetRole) => {
    const currentRole = user?.platform_role || user?.role || 'attendee';
    if (currentRole.toLowerCase() === targetRole.toLowerCase()) return;

    setScreenLoadingText(`Re-orienting platform context to ${targetRole.toUpperCase()}...`);
    setScreenLoading(true);

    try {
      const res = await apiClient.put('/api/v1/auth/role', { role: targetRole });
      if (res.data?.success) {
        const { token, user: updatedUser } = res.data.data;
        setUserData(updatedUser, token);

        // Soft wait for visualization glide
        await new Promise(r => setTimeout(r, 1000));
        setScreenLoading(false);

        // Programmatic glides
        if (targetRole === 'organizer') {
          navigate('/organizer');
        } else {
          navigate('/attendee');
        }
      }
    } catch (err) {
      setScreenLoading(false);
      triggerToast("Role transition request failed.", "error");
    }
  };

  // Destructive deletion cascade confirmation
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'terminate my account') return;
    setDeletingAccount(true);

    try {
      const res = await apiClient.delete('/api/v1/auth/me');
      if (res.data?.success) {
        setShowDeleteModal(false);
        triggerToast("Account purged completely.", "success");
        await new Promise(r => setTimeout(r, 1000));
        await logout();
        navigate('/');
      }
    } catch (err) {
      triggerToast(err.response?.data?.message || "Failed to execute account termination.", "error");
      setDeletingAccount(false);
    }
  };

  const userRole = user?.platform_role || user?.role || 'attendee';

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white font-sans antialiased relative overflow-x-hidden flex flex-col">
      
      {/* ─── DUAL AMBIENT GRADIENTS (TASK 1 CORNER MESH) ─── */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-950/10 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary-950/15 rounded-full blur-[160px] pointer-events-none -z-10" />

      {/* ─── HEADER BAR ─── */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 w-full h-16 flex items-center justify-between px-4 sm:px-6 select-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(userRole === 'organizer' ? '/organizer' : '/attendee')}
            className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors border-none bg-transparent outline-none cursor-pointer flex items-center gap-1.5 font-form text-xs font-semibold uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-display font-extrabold text-white tracking-[-0.04em] text-sm uppercase">vora</span>
          <span className="font-accent text-[9px] font-bold text-zinc-500 tracking-[-0.05em] uppercase border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 rounded-full">
            SETTINGS CONSOLE
          </span>
        </div>
      </header>

      {/* ─── MAIN ASYMMETRICAL GRID LAYOUT (TASK 1 GRID) ─── */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-24 pb-16 flex flex-col lg:flex-row gap-8">
        
        {/* LEFT NAV COLUMN (25% Width / Swipes on Mobile) */}
        <aside className="w-full lg:w-1/4 flex-shrink-0">
          
          {/* Desktop Sidebar menu wrapper */}
          <div className="hidden lg:flex flex-col space-y-1 bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-3 select-none">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-3 py-2 font-technical">Categories</span>
            
            {[
              { id: 'profile', label: 'Identity & Profile', icon: User },
              { id: 'security', label: 'Security & Access', icon: Lock },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'role', label: 'Ecosystem Role', icon: RefreshCw }
            ].map(cat => {
              const Icon = cat.icon;
              const active = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`group relative flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium font-accent transition-all duration-200 outline-none text-left border-none bg-transparent cursor-pointer ${
                    active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200 hover:translate-x-0.5'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeCategoryPill"
                      className="absolute inset-0 bg-zinc-800/80 border border-white/5 rounded-xl shadow-md -z-10"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-primary-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile swipeable pillbar container (Task 1 mobile collapses) */}
          <div className="lg:hidden w-full overflow-x-auto select-none no-scrollbar flex space-x-2 pb-2 border-b border-white/5">
            {[
              { id: 'profile', label: 'Identity', icon: User },
              { id: 'security', label: 'Security', icon: Lock },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'role', label: 'Role Context', icon: RefreshCw }
            ].map(cat => {
              const Icon = cat.icon;
              const active = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-full text-xs font-semibold font-accent transition-all duration-200 border-none outline-none shrink-0 cursor-pointer ${
                    active 
                      ? 'bg-zinc-800 text-white border border-white/5' 
                      : 'bg-zinc-900/30 text-zinc-400 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-primary-400' : 'text-zinc-500'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

        </aside>

        {/* RIGHT EDITING VIEWPORT PANEL (75% Width) */}
        <section className="flex-1 w-full min-w-0">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: IDENTITY & PROFILE */}
            {activeCategory === 'profile' && (
              <motion.div
                key="tab-profile"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                {/* Header */}
                <div className="text-left space-y-1">
                  <h2 className="text-2xl font-extrabold tracking-tight text-white font-display">Personal Identity</h2>
                  <p className="text-zinc-500 text-xs font-sans">
                    Manage your personal details and how your profile appears to other users within the ecosystem.
                  </p>
                </div>

                {/* Main Identity Box */}
                <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8 space-y-8">
                  
                  {/* Avatar upload / External URL Matrix (Task 2 initials & Cover) */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-white/5">
                    
                    {/* Circle Image Wrapper */}
                    <div className="relative w-24 h-24 rounded-full border border-white/10 overflow-hidden flex items-center justify-center bg-zinc-900/60 shadow-lg flex-shrink-0 select-none">
                      <AnimatePresence mode="wait">
                        {displayAvatarUrl ? (
                          <motion.img 
                            key="avatar-image"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            src={displayAvatarUrl} 
                            alt="User Profile Avatar" 
                            className="w-full h-full object-cover"
                            onError={() => setDisplayAvatarUrl('')} // revert back if invalid URL
                          />
                        ) : (
                          <motion.span 
                            key="avatar-initials"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-white font-accent font-extrabold text-3xl tracking-tight"
                          >
                            {getInitials()}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* External input instruction */}
                    <div className="flex-1 w-full text-left space-y-1.5">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-technical">External Avatar URL</span>
                      <input 
                        id="input-external-avatar-url"
                        type="url" 
                        placeholder="https://images.unsplash.com/... or dicebear svg" 
                        value={profileForm.avatar_url}
                        onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                        onBlur={handleAvatarBlur}
                        className="w-full bg-zinc-950/60 border border-white/5 focus:border-primary-500 rounded-xl px-4 py-2.5 text-xs font-form text-white outline-none focus:ring-1 focus:ring-primary-500/20 transition-all placeholder-zinc-700"
                      />
                      <p className="text-[10px] text-zinc-650 leading-relaxed font-sans">
                        Pasting a valid web link updates the graphics canvas dynamically when you exit the field.
                      </p>
                    </div>

                  </div>

                  {/* Form Grid Details */}
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      
                      <div className="text-left space-y-1.5">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-technical">First Name</span>
                        <input 
                          id="input-profile-first-name"
                          type="text" 
                          required
                          value={profileForm.first_name}
                          onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                          className="w-full bg-zinc-950/60 border border-white/5 focus:border-primary-500 rounded-xl px-4 py-2.5 text-xs font-form text-white outline-none focus:ring-1 focus:ring-primary-500/20 transition-all"
                        />
                      </div>

                      <div className="text-left space-y-1.5">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-technical">Last Name</span>
                        <input 
                          id="input-profile-last-name"
                          type="text" 
                          required
                          value={profileForm.last_name}
                          onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                          className="w-full bg-zinc-950/60 border border-white/5 focus:border-primary-500 rounded-xl px-4 py-2.5 text-xs font-form text-white outline-none focus:ring-1 focus:ring-primary-500/20 transition-all"
                        />
                      </div>

                    </div>

                    <div className="text-left space-y-1.5">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-technical">Email Address</span>
                      <input 
                        id="input-profile-email"
                        type="email" 
                        disabled
                        value={profileForm.email}
                        className="w-full bg-zinc-950/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-form text-zinc-500 cursor-not-allowed outline-none select-none"
                      />
                      <p className="text-[10px] text-zinc-650 leading-relaxed font-sans">
                        Registered credentials email address cannot be mutated for authentication integrity audits.
                      </p>
                    </div>

                    {/* Submit actions (Explicit Save dirty-check) */}
                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        id="btn-save-identity"
                        disabled={!isProfileDirty || profileSaving}
                        className={`px-5 py-3 rounded-xl text-xs font-bold font-form uppercase tracking-wider transition-all flex items-center gap-2 border-none outline-none ${
                          isProfileDirty && !profileSaving
                            ? 'bg-primary-600 hover:bg-primary-500 text-white cursor-pointer shadow-lg shadow-primary-600/25 active:scale-[0.98]'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {profileSaving ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Syncing Identity...</span>
                          </>
                        ) : (
                          <span>Update Identity</span>
                        )}
                      </button>
                    </div>

                  </form>

                </div>
              </motion.div>
            )}

            {/* TAB 2: SECURITY & ACCESS */}
            {activeCategory === 'security' && (
              <motion.div
                key="tab-security"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                {/* Header */}
                <div className="text-left space-y-1">
                  <h2 className="text-2xl font-extrabold tracking-tight text-white font-display">Security & Authentication</h2>
                  <p className="text-zinc-500 text-xs font-sans">
                    Manage your cryptographic credentials and active ecosystem sessions.
                  </p>
                </div>

                {/* Password modification form card */}
                <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8 space-y-6">
                  <h3 className="text-sm font-bold text-zinc-300 tracking-wide text-left font-sans">Password Modification Engine</h3>
                  
                  {passwordError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-rose-500 font-sans leading-relaxed text-left">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-emerald-400 font-sans leading-relaxed text-left">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdatePassword} className="space-y-5">
                    
                    <div className="text-left space-y-1.5">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-technical">Current Password</span>
                      <input 
                        id="input-password-current"
                        type="password" 
                        required
                        value={passwordForm.current_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                        className="w-full bg-zinc-950/60 border border-white/5 focus:border-primary-500 rounded-xl px-4 py-2.5 text-xs font-form text-white outline-none focus:ring-1 focus:ring-primary-500/20 transition-all placeholder-zinc-800"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="text-left space-y-1.5 relative">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-technical">New Password</span>
                      <input 
                        id="input-password-new"
                        type="password" 
                        required
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                        className="w-full bg-zinc-950/60 border border-white/5 focus:border-primary-500 rounded-xl px-4 py-2.5 text-xs font-form text-white outline-none focus:ring-1 focus:ring-primary-500/20 transition-all placeholder-zinc-800"
                        placeholder="••••••••"
                      />

                      {/* Password strength segments (Task 3 strength bar) */}
                      {passwordForm.new_password && (
                        <div className="mt-2.5 space-y-1.5 select-none">
                          <div className="flex items-center justify-between text-[9px] font-bold font-technical">
                            <span className="text-zinc-500">PASSWORD SECURITY STRENGTH</span>
                            <span className={
                              strengthScore === 4 ? 'text-emerald-400' :
                              strengthScore >= 2 ? 'text-amber-400' : 'text-red-400'
                            }>
                              {strengthScore === 0 ? 'CRITICAL: WEAK' :
                               strengthScore === 1 ? 'WEAK' :
                               strengthScore === 2 ? 'MODERATE' :
                               strengthScore === 3 ? 'STRONG' : 'STRENGTH: OPTIMAL'}
                            </span>
                          </div>
                          
                          <div className="flex gap-1.5 h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                            {[1, 2, 3, 4].map(idx => {
                              const active = strengthScore >= idx;
                              let colorClass = 'bg-zinc-800';
                              if (active) {
                                if (strengthScore === 4) colorClass = 'bg-emerald-500';
                                else if (strengthScore >= 2) colorClass = 'bg-amber-500';
                                else colorClass = 'bg-red-500';
                              }
                              return (
                                <div 
                                  key={idx} 
                                  className={`flex-1 h-full rounded-full transition-all duration-300 ${colorClass}`} 
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>

                    <div className="text-left space-y-1.5">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-technical">Confirm New Password</span>
                      <input 
                        id="input-password-confirm"
                        type="password" 
                        required
                        value={passwordForm.confirm_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                        className="w-full bg-zinc-950/60 border border-white/5 focus:border-primary-500 rounded-xl px-4 py-2.5 text-xs font-form text-white outline-none focus:ring-1 focus:ring-primary-500/20 transition-all placeholder-zinc-800"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        id="btn-save-password"
                        disabled={passwordSaving}
                        className="px-5 py-3 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-white/5 hover:border-white/10 text-xs font-bold font-form text-zinc-300 hover:text-white uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 outline-none"
                      >
                        {passwordSaving ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Crypting...</span>
                          </>
                        ) : (
                          <span>Update Password</span>
                        )}
                      </button>
                    </div>

                  </form>

                </div>

                {/* Sessions Ledger card */}
                <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8 space-y-6 select-none">
                  <div className="flex items-center justify-between text-left">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-300 tracking-wide font-sans">Active Sessions Ledger</h3>
                      <p className="text-[10px] text-zinc-550 leading-relaxed mt-0.5">
                        These devices are currently logged into your Vora account credentials.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowRevokeModal(true)}
                      id="btn-revoke-sessions-trigger"
                      className="px-3 py-1.5 bg-red-950/30 hover:bg-red-900/40 border border-red-500/20 hover:border-red-500/40 text-[10px] font-bold font-accent text-rose-400 hover:text-rose-300 uppercase tracking-wide rounded-lg transition-all cursor-pointer outline-none"
                    >
                      Revoke Other Sessions
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-technical">
                      <thead>
                        <tr className="border-b border-white/5 text-zinc-500 font-bold">
                          <th className="py-2.5 font-medium">Device Type</th>
                          <th className="py-2.5 font-medium">IP Address</th>
                          <th className="py-2.5 font-medium text-right">Last Sync</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map(sess => (
                          <tr key={sess.id} className="border-b border-white/5 text-zinc-350">
                            <td className="py-3 font-semibold text-white flex items-center gap-2">
                              <Monitor className="w-3.5 h-3.5 text-zinc-500" />
                              <span>{sess.os}</span>
                              {sess.current && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase">
                                  Current
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-zinc-450">{sess.ip}</td>
                            <td className="py-3 text-right text-zinc-500">{sess.lastActive}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>

                {/* Danger zone inside Security (Task 6 danger block) */}
                <div className="bg-red-950/10 border border-red-500/10 rounded-2xl p-6 sm:p-8 space-y-4 text-left">
                  <div className="flex items-center space-x-2 text-rose-500 select-none">
                    <ShieldAlert className="w-5 h-5" />
                    <h3 className="text-sm font-extrabold tracking-wide font-accent">DANGER ZONE</h3>
                  </div>

                  <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                    Once you delete your account, there is no going back. All registrations, event catalogs, media assets, and credentials databases will be permanently scrubbed.
                  </p>

                  <div className="pt-2 flex">
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      id="btn-delete-account-confirm-trigger"
                      className="px-4 py-2.5 bg-red-950/45 hover:bg-red-900 border border-red-500/30 text-rose-400 hover:text-white text-xs font-bold font-form uppercase tracking-wider rounded-xl transition-all cursor-pointer outline-none"
                    >
                      Permanently Delete Account
                    </button>
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 3: NOTIFICATIONS */}
            {activeCategory === 'notifications' && (
              <motion.div
                key="tab-notifications"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-8 animate-fade-in"
              >
                {/* Header */}
                <div className="text-left space-y-1 select-none">
                  <h2 className="text-2xl font-extrabold tracking-tight text-white font-display">Communication Preferences</h2>
                  <p className="text-zinc-500 text-xs font-sans">
                    Configure how the ecosystem updates you regarding registrations, schedules, and analytics direct logs.
                  </p>
                </div>

                {/* Toggles chassis (Task 4 switches) */}
                <div className="bg-zinc-900/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8 space-y-8 text-left">
                  
                  {[
                    {
                      key: 'notify_event_start',
                      title: 'Email Directives',
                      description: 'Receive event lifecycle directives, ticket receipts, and webcast links in your primary inbox.'
                    },
                    {
                      key: 'notify_weekly_digest',
                      title: 'Application Alerts',
                      description: 'Receive announcements, scheduled broadcast prompts, and presenter resource downloads notifications.'
                    },
                    {
                      key: 'notify_marketing',
                      title: 'Marketing Communications',
                      description: 'Opt-in to product enhancement previews, ecosystem feedback telemetry, and newsletters.'
                    }
                  ].map(pref => {
                    const isChecked = notifyState[pref.key];
                    const isSaving = savingToggles[pref.key];

                    return (
                      <div 
                        key={pref.key} 
                        className="flex items-center justify-between gap-6 pb-6 border-b border-white/5 last:border-b-0 last:pb-0 select-none"
                      >
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white font-sans">{pref.title}</h4>
                          <p className="text-[10px] text-zinc-500 leading-relaxed max-w-lg">{pref.description}</p>
                        </div>

                        {/* Interactive toggle switch (Tactile Motion Thumb) */}
                        <button
                          type="button"
                          id={`switch-${pref.key.replace(/_/g, '-')}`}
                          onClick={() => togglePreference(pref.key)}
                          disabled={isSaving}
                          className={`relative w-12 h-6 rounded-full p-1 transition-colors outline-none cursor-pointer border-none flex items-center shrink-0 ${
                            isChecked ? 'bg-primary-600' : 'bg-zinc-800'
                          } ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          <motion.div
                            layout
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-md relative"
                            style={{
                              x: isChecked ? 24 : 0
                            }}
                          >
                            {isSaving && (
                              <svg className="animate-spin h-2.5 w-2.5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            )}
                          </motion.div>
                        </button>

                      </div>
                    );
                  })}

                </div>
              </motion.div>
            )}

            {/* TAB 4: ECOSYSTEM ROLE */}
            {activeCategory === 'role' && (
              <motion.div
                key="tab-role"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                {/* Header */}
                <div className="text-left space-y-1 select-none">
                  <h2 className="text-2xl font-extrabold tracking-tight text-white font-display">Ecosystem Context</h2>
                  <p className="text-zinc-500 text-xs font-sans">
                    Mutate your primary platform environment. Organizer context unlocks host dashboards. Attendee context locks hosting features.
                  </p>
                </div>

                {/* Bento Matrix Bento Cards (Task 5 Bento) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
                  
                  {/* Attendee Bento Card */}
                  <motion.div
                    whileHover={{ y: -3 }}
                    onClick={() => handleRoleSwitch('attendee')}
                    id="card-role-attendee"
                    className={`rounded-[2rem] p-6 border flex flex-col justify-between min-h-[240px] text-left transition-all relative overflow-hidden group outline-none ${
                      userRole === 'attendee'
                        ? 'border-primary-500 bg-primary-600/5 shadow-2xl shadow-primary-500/5 cursor-default'
                        : 'border-white/5 bg-zinc-900/30 hover:border-zinc-800 cursor-pointer'
                    }`}
                  >
                    <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/20 via-transparent to-transparent" />
                    
                    <div className="space-y-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900/60 flex items-center justify-center border border-white/5">
                        <User className={`w-5 h-5 ${userRole === 'attendee' ? 'text-primary-400' : 'text-zinc-500'}`} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white font-accent">Attendee Context</h3>
                        <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                          Acquire tickets, enter broadcast lobbies, interact with live speakers, and pull assets vault files.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-white/5">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-technical">Attendee Area</span>
                      {userRole === 'attendee' ? (
                        <span className="px-2.5 py-1 rounded-full bg-primary-600/10 border border-primary-500/20 text-primary-400 font-bold text-[9px] uppercase tracking-wider font-accent shadow-sm">
                          Active Context
                        </span>
                      ) : (
                        <span className="text-zinc-600 font-accent text-[9px] font-bold uppercase tracking-wider group-hover:text-zinc-400 transition-colors">
                          Switch Role &rarr;
                        </span>
                      )}
                    </div>
                  </motion.div>

                  {/* Organizer Bento Card */}
                  <motion.div
                    whileHover={{ y: -3 }}
                    onClick={() => handleRoleSwitch('organizer')}
                    id="card-role-organizer"
                    className={`rounded-[2rem] p-6 border flex flex-col justify-between min-h-[240px] text-left transition-all relative overflow-hidden group outline-none ${
                      userRole === 'organizer'
                        ? 'border-primary-500 bg-primary-600/5 shadow-2xl shadow-primary-500/5 cursor-default'
                        : 'border-white/5 bg-zinc-900/30 hover:border-zinc-800 cursor-pointer'
                    }`}
                  >
                    <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/20 via-transparent to-transparent" />
                    
                    <div className="space-y-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900/60 flex items-center justify-center border border-white/5">
                        <Globe className={`w-5 h-5 ${userRole === 'organizer' ? 'text-primary-400' : 'text-zinc-500'}`} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white font-accent">Organizer Context</h3>
                        <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                          Deploy webinar channels, schedule webinars sessions, oversee registrants metrics, and compile CSV ledgers.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-white/5">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-technical">Console Hub</span>
                      {userRole === 'organizer' ? (
                        <span className="px-2.5 py-1 rounded-full bg-primary-600/10 border border-primary-500/20 text-primary-400 font-bold text-[9px] uppercase tracking-wider font-accent shadow-sm">
                          Active Context
                        </span>
                      ) : (
                        <span className="text-zinc-600 font-accent text-[9px] font-bold uppercase tracking-wider group-hover:text-zinc-400 transition-colors">
                          Switch Role &rarr;
                        </span>
                      )}
                    </div>
                  </motion.div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </section>

      </main>

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

      {/* ─── REVOCATION SESSIONS MODAL CONFIRMATION ─── */}
      <AnimatePresence>
        {showRevokeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !revokingSessions && setShowRevokeModal(false)}
              className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900/95 border border-white/10 rounded-2xl p-6 sm:p-8 max-w-sm w-full relative z-10 shadow-2xl text-left overflow-hidden select-none"
            >
              <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-red-500/20 via-transparent to-transparent" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white tracking-tight font-display">Revoke Other Sessions?</h3>
                <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                  This will invalidate all current JWT tokens associated with your account on other devices. You will be logged out everywhere else immediately.
                </p>

                <div className="flex gap-3 pt-4 font-semibold text-xs tracking-wider uppercase font-form">
                  <button
                    onClick={handleRevokeSessions}
                    disabled={revokingSessions}
                    id="btn-revoke-sessions-confirm"
                    className="flex-1 bg-red-950/45 hover:bg-red-900 border border-red-500/30 text-rose-400 hover:text-white py-3 rounded-xl transition-all cursor-pointer outline-none flex items-center justify-center gap-1.5"
                  >
                    {revokingSessions ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Revoke Sessions</span>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowRevokeModal(false)}
                    disabled={revokingSessions}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-350 py-3 rounded-xl transition-colors border-none cursor-pointer outline-none"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── DANGER ZONE ACCOUNT TERMINATION MODAL ─── */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deletingAccount && setShowDeleteModal(false)}
              className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900/90 border border-red-500/20 rounded-2xl p-6 sm:p-8 max-w-md w-full relative z-10 shadow-2xl text-left overflow-hidden select-none"
            >
              <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-red-500/40 via-transparent to-transparent" />
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white tracking-tight font-display flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                  <span>Absolute Termination</span>
                </h3>
                
                <p className="text-xs text-zinc-550 leading-relaxed font-sans">
                  You are initiating the complete and irreversible destruction of your Vora account. All orchestrated events, digital tickets, and personal data will be permanently purged from the database. <strong className="text-rose-400 font-semibold">This action cannot be undone.</strong>
                </p>

                {/* Validation challenge input */}
                <div className="space-y-1.5 pt-2">
                  <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-technical">
                    Type 'terminate my account' to confirm
                  </span>
                  <input
                    type="text"
                    id="input-delete-account-confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="terminate my account"
                    disabled={deletingAccount}
                    className="w-full bg-zinc-950/60 border border-red-500/20 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs font-form text-white outline-none focus:ring-1 focus:ring-red-500/20 transition-all placeholder-zinc-800"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 font-semibold text-xs tracking-wider uppercase font-form">
                  <button
                    onClick={handleDeleteAccount}
                    id="btn-delete-account-confirm"
                    disabled={deleteConfirmText !== 'terminate my account' || deletingAccount}
                    className={`py-3.5 rounded-xl border transition-all flex items-center justify-center gap-2 outline-none border-none ${
                      deleteConfirmText === 'terminate my account' && !deletingAccount
                        ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-lg shadow-rose-600/25 active:scale-[0.98]'
                        : 'bg-zinc-850 text-zinc-600 cursor-not-allowed border-none opacity-40'
                    }`}
                  >
                    {deletingAccount ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Execute Deletion</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmText('');
                    }}
                    disabled={deletingAccount}
                    className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 py-3.5 rounded-xl transition-colors border-none cursor-pointer outline-none"
                  >
                    Keep Account
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── FULL-SCREEN TRANSITION BLOCKER OVERLAY (TASK 5 MASK) ─── */}
      <AnimatePresence>
        {screenLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-lg flex flex-col items-center justify-center select-none"
          >
            <div className="flex flex-col items-center space-y-4">
              <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase font-technical">
                {screenLoadingText || 'Transitioning ecosystem environment...'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
