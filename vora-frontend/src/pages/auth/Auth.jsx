import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Mail, 
  Lock, 
  User, 
  Calendar, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import Heading from '../../components/ui/Heading.jsx';
import Text from '../../components/ui/Text.jsx';
import BrutalistInput from '../../components/ui/BrutalistInput.jsx';

/**
 * Split-Screen Credentials-Based Authentication Chassis.
 * Strictly adheres to standard credentials verification structures using standard email/password logins and registrations.
 * Features a visual Role Selector (Attendee vs Organizer) and Awwwards-compliant soft-glass layout.
 */
export default function Auth() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');

  // Form states
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('attendee'); // attendee or organizer

  // UI state feedback
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync mode search parameter with form toggle state
  useEffect(() => {
    if (mode === 'register') {
      setIsLogin(false);
    } else {
      setIsLogin(true);
    }
    // Reset inputs on switch
    setFullName('');
    setEmail('');
    setPassword('');
    setErrors({});
    setGlobalError('');
  }, [mode]);

  // Route authenticated user automatically
  useEffect(() => {
    if (user) {
      const redirectPath = searchParams.get('redirect') || (user.role === 'organizer' ? '/organizer' : '/attendee');
      navigate(redirectPath);
    }
  }, [user, navigate, searchParams]);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setGlobalError('');

    // Inline field validation checks
    const newErrors = {};
    if (!email || !email.includes('@')) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!isLogin) {
      if (!fullName.trim()) {
        newErrors.fullName = 'Full name is required';
      } else {
        const nameParts = fullName.trim().split(/\s+/);
        if (nameParts.length < 2 || !nameParts[1]) {
          newErrors.fullName = 'Please enter both your first and last name';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        // Perform credentials login
        const data = await login(email, password);
        // Persist token in alternative storage key as requested in architectural specs
        if (data?.token) {
          localStorage.setItem('vora_jwt_token', data.token);
        }
      } else {
        // Perform credentials registration
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const data = await register(email, password, firstName, lastName, role);
        if (data?.token) {
          localStorage.setItem('vora_jwt_token', data.token);
        }
      }
    } catch (err) {
      setGlobalError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-zinc-950 text-zinc-150 font-sans antialiased overflow-y-auto lg:overflow-hidden relative">
      
      {/* ─── LEFT COLUMN: BRAND CANVAS AREA (Desktop Only) ─── */}
      <div 
        className="hidden lg:flex flex-col justify-between p-12 bg-zinc-950 border-r border-white/5 relative overflow-hidden select-none h-full"
        style={{
          backgroundImage: `radial-gradient(circle at 0% 0%, rgba(39, 39, 42, 0.15), transparent 70%)`
        }}
      >
        {/* Irregular Le Murmure Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
          <span className="font-murmure text-[15vw] text-white/5 leading-none whitespace-nowrap uppercase tracking-widest select-none">
            SECURE GATEWAY
          </span>
        </div>
        {/* Navigation Return Hook */}
        <div className="z-10">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-xs font-medium font-sans text-zinc-500 hover:text-white transition-colors duration-200 group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-0.5 transition-transform text-zinc-500 group-hover:text-white transition-colors duration-200" />
            <span>Back to Website</span>
          </Link>
        </div>

        {/* Master Branding Message */}
        <div className="z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-zinc-900/50 text-[10px] uppercase tracking-widest text-primary-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            <span>Secure Platform Access</span>
          </div>

          <Heading level="h1" className="text-5xl xl:text-6xl font-extrabold tracking-tighter text-white leading-[1.05]">
            Enter the <br />
            Ecosystem.
          </Heading>

          <Text variant="default" className="!text-zinc-400 text-base leading-relaxed max-w-md">
            A premium space to host virtual events, engage audiences, and share post-event resources seamlessly.
          </Text>
        </div>

        {/* Verification Status info */}
        <div className="z-10 flex items-center gap-2 text-xs text-zinc-600 font-technical">
          <ShieldCheck className="w-4 h-4 text-primary-400 shrink-0" />
          <span>Enterprise-Grade Encryption & Secure Session Gateway</span>
        </div>
      </div>

      {/* ─── RIGHT COLUMN: FORM CONSOLE AREA ─── */}
      <div className="w-full flex flex-col justify-between p-6 sm:p-12 lg:p-20 bg-zinc-950 lg:bg-zinc-900 lg:border-l lg:border-white/5 overflow-y-auto z-10 h-full">
        
        {/* Mobile top navigation utility links */}
        <div className="flex justify-between items-center lg:hidden mb-8 flex-shrink-0">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </Link>
          <div className="text-[10px] text-zinc-650 flex items-center gap-1.5 font-technical">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-400" />
            <span>SECURE ENTRY</span>
          </div>
        </div>

        {/* Dynamic Form wrapper */}
        <div className="my-auto w-full max-w-md mx-auto space-y-8 py-4 flex flex-col justify-center">
          
          {/* Header titles */}
          <div className="space-y-2 text-center lg:text-left">
            <Heading level="h2" className="text-3xl font-semibold text-white tracking-tight">
              {isLogin ? 'Sign in to Vora' : 'Create Vora Account'}
            </Heading>
            <Text variant="muted" className="!text-zinc-450 !text-sm">
              {isLogin 
                ? 'Enter your details to access your event dashboard.' 
                : 'Choose your account type and fill in details to join.'
              }
            </Text>
          </div>

          {/* Form card container */}
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
            
            {/* Edge highlights */}
            <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent rounded-t-3xl" />

            {/* Error notifications */}
            <AnimatePresence>
              {globalError && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="overflow-hidden"
                >
                  <div 
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-xs text-rose-500/90 font-technical animate-fade-in" 
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500/90" />
                    <span className="leading-relaxed">{globalError}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              <AnimatePresence initial={false} mode="popLayout">
                {/* Full name box (Register view only) */}
                {!isLogin && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  >
                    <BrutalistInput
                      label="Full Name"
                      type="text"
                      placeholder="Alex Mercer"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      error={errors.fullName}
                      icon={User}
                      required
                      disabled={isSubmitting}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Address */}
              <BrutalistInput
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                icon={Mail}
                required
                disabled={isSubmitting}
              />

              {/* Password */}
              <div className="space-y-1 relative">
                {isLogin && (
                  <div className="flex justify-between items-center absolute right-0 top-0 z-10">
                    <span className="text-[10px] text-primary-400 hover:text-primary-300 font-semibold cursor-pointer select-none">
                      Forgot Password?
                    </span>
                  </div>
                )}
                <BrutalistInput
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  icon={Lock}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Visual Role selectors (Register view only) */}
              <AnimatePresence initial={false} mode="popLayout">
                {!isLogin && (
                  <motion.div
                    key="role-field"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="space-y-2"
                  >
                    <span className="block text-[10px] font-semibold text-zinc-450 uppercase tracking-[0.2em] mb-2 font-technical">
                      Select Account Type
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Attendee option */}
                      <motion.button
                        type="button"
                        onClick={() => setRole('attendee')}
                        disabled={isSubmitting}
                        whileTap={{ scale: 0.98 }}
                        className={`flex flex-col items-center justify-center p-6 rounded-xl border cursor-pointer transition-all duration-200 outline-none
                          ${role === 'attendee' 
                            ? 'border-primary-500 bg-primary-500/10 text-white shadow-lg shadow-primary-500/5' 
                            : 'border-white/5 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/40'
                          }
                        `}
                      >
                        <User className={`w-5 h-5 mb-2 shrink-0 transition-colors duration-200 ${role === 'attendee' ? 'text-white' : 'text-zinc-500'}`} />
                        <span className={`text-xs font-bold font-accent transition-colors duration-200 ${role === 'attendee' ? 'text-white' : 'text-zinc-400'}`}>Attendee</span>
                      </motion.button>

                      {/* Organizer option */}
                      <motion.button
                        type="button"
                        onClick={() => setRole('organizer')}
                        disabled={isSubmitting}
                        whileTap={{ scale: 0.98 }}
                        className={`flex flex-col items-center justify-center p-6 rounded-xl border cursor-pointer transition-all duration-200 outline-none
                          ${role === 'organizer' 
                            ? 'border-primary-500 bg-primary-500/10 text-white shadow-lg shadow-primary-500/5' 
                            : 'border-white/5 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/40'
                          }
                        `}
                      >
                        <Calendar className={`w-5 h-5 mb-2 shrink-0 transition-colors duration-200 ${role === 'organizer' ? 'text-white' : 'text-zinc-500'}`} />
                        <span className={`text-xs font-bold font-accent transition-colors duration-200 ${role === 'organizer' ? 'text-white' : 'text-zinc-400'}`}>Organizer</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit triggers */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-primary-600/80 hover:bg-primary-500/90 border border-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none text-white font-bold font-brutalist py-3.5 rounded-xl transition-all duration-300 neon-diffuse mt-4 relative flex items-center justify-center cursor-pointer outline-none border-none"
              >
                {/* Spinner Overlay */}
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none ${isSubmitting ? 'opacity-100' : 'opacity-0'}`}>
                  <svg 
                    className="animate-spin h-5 w-5 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path 
                      className="opacity-80" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
                    />
                  </svg>
                </div>

                {/* Text Node */}
                <span className={`transition-opacity duration-200 ${isSubmitting ? 'opacity-0' : 'opacity-100'} uppercase tracking-wider`}>
                  {isLogin ? 'Continue with Email' : 'Create Account'}
                </span>
              </motion.button>

            </form>
          </div>

          {/* Toggle footer links */}
          <div className="text-center mt-4 select-none">
            {isLogin ? (
              <Text className="!text-xs !text-zinc-450">
                Don't have an account?{' '}
                <button 
                  type="button"
                  onClick={() => navigate('/auth?mode=register')}
                  className="font-bold text-white hover:text-primary-300 transition-colors bg-transparent border-none p-0 cursor-pointer outline-none"
                >
                  Sign up
                </button>
              </Text>
            ) : (
              <Text className="!text-xs !text-zinc-450">
                Already have an account?{' '}
                <button 
                  type="button"
                  onClick={() => navigate('/auth?mode=login')}
                  className="font-bold text-white hover:text-primary-300 transition-colors bg-transparent border-none p-0 cursor-pointer outline-none"
                >
                  Sign in
                </button>
              </Text>
            )}
          </div>

        </div>

        {/* Footer legal notices */}
        <div className="mt-8 text-center select-none">
          <Text className="!text-[10px] !text-zinc-700 tracking-wider uppercase font-technical">
            © 2026 VORA ECOSYSTEM. All rights reserved.
          </Text>
        </div>

      </div>

    </div>
  );
}
