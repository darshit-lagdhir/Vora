import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles,
  Ticket,
  CalendarDays,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

const Auth = () => {
  const { user, login, register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Interface Modes & Progressive Steps State
  const [isRegister, setIsRegister] = useState(false);
  const [registerStep, setRegisterStep] = useState(1); // Step 1 (Credentials), Step 2 (Demographics & Role Cards)
  
  // Controlled Inputs State (Hoisted State Matrix - Task 2)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('attendee'); // 'attendee' vs 'organizer'
  
  // Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Validation & Error States
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // References for Programmatic Focus Shifting (Task 9)
  const emailInputRef = useRef(null);
  const firstNameInputRef = useRef(null);

  // Check if session has expired or requires login
  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setGlobalError('Your session has expired. Please sign in again.');
    }
  }, [searchParams]);

  // Route authenticated user to their target dashboard panel
  useEffect(() => {
    if (user) {
      if (user.role === 'organizer') {
        navigate('/organizer');
      } else {
        navigate('/attendee');
      }
    }
  }, [user, navigate]);

  // Shift focus programmatically when transitioning steps (Task 9)
  useEffect(() => {
    if (isRegister) {
      if (registerStep === 1) {
        emailInputRef.current?.focus();
      } else if (registerStep === 2) {
        // Short timeout to guarantee input node is fully mounted before focusing
        setTimeout(() => {
          firstNameInputRef.current?.focus();
        }, 100);
      }
    }
  }, [registerStep, isRegister]);

  // Real-time input validation checking (Task 3)
  useEffect(() => {
    const newErrors = {};
    
    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    
    // Password length constraints
    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (isRegister) {
      // Password match confirmation check
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Password confirmation is required.';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }

      // Step 2 profile validation checks
      if (registerStep === 2) {
        if (!firstName.trim()) {
          newErrors.firstName = 'First name is required.';
        }
        if (!lastName.trim()) {
          newErrors.lastName = 'Last name is required.';
        }
      }
    }
    
    setErrors(newErrors);
  }, [firstName, lastName, email, password, confirmPassword, isRegister, registerStep]);

  // Calculate Password Strength Entropy (Task 3)
  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score; // Max score 5
  };

  const passwordStrength = calculatePasswordStrength(password);

  // Blur focus event handlers
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Step 1 to Step 2 Forward Transition Handler
  const handleNextStep = (e) => {
    e.preventDefault();
    setGlobalError('');

    // Trigger validation for step 1 fields
    const step1Touched = { email: true, password: true, confirmPassword: true };
    setTouched(prev => ({ ...prev, ...step1Touched }));

    // Stop progression if Step 1 errors exist
    if (errors.email || errors.password || errors.confirmPassword) {
      return;
    }

    setRegisterStep(2);
  };

  // Form submission handler (Task 6)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    
    // Trigger validation on all fields
    const allTouched = { email: true, password: true, confirmPassword: true, firstName: true, lastName: true };
    setTouched(allTouched);

    // Block submission if structural validation has active error flags
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegister) {
        await register(email, password, firstName, lastName, selectedRole);
      } else {
        await login(email, password);
      }
    } catch (err) {
      console.error('[Auth Viewport] Submission failed:', err);
      // If email exists, send user back to Step 1 email input (Task 7)
      if (err.message && (err.message.includes('exists') || err.message.includes('taken') || err.message.includes('unique'))) {
        setRegisterStep(1);
        setGlobalError('An account with this email address already exists. Please sign in or use a different email.');
        // Highlight email border
        setTouched(prev => ({ ...prev, email: true }));
      } else {
        setGlobalError(err.message || 'Authentication failed. Please verify credentials.');
      }
      setIsSubmitting(false);
    }
  };

  // Toggle login vs registration views
  const toggleAuthMode = () => {
    setIsRegister(!isRegister);
    setRegisterStep(1);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setTouched({});
    setGlobalError('');
  };

  return (
    <div className="h-[100dvh] w-full flex overflow-hidden bg-brand-dark text-slate-100 font-sans antialiased relative">
      
      {/* Dynamic Keyframe Animations Block */}
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.15; }
          33% { transform: scale(1.1) translate(30px, -50px); opacity: 0.22; }
          66% { transform: scale(0.9) translate(-20px, 40px); opacity: 0.12; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-bg-shift {
          background-size: 200% 200%;
          animation: gradientShift 15s ease infinite;
        }
        .animate-pulse-glow {
          animation: pulseGlow 12s ease-in-out infinite;
        }
        .animate-slide-in {
          animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .glass-panel {
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(30, 41, 59, 0.6);
        }
      `}</style>

      {/* LEFT COLUMN: BRANDING & MARKET PANEL (Hides on tablet/mobile screens) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-brand-dark via-brand-dark to-accent-violet/20 relative overflow-hidden border-r border-brand-card/30">
        
        {/* Shifting radial lighting accent */}
        <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-accent-violet/25 to-accent-blue/15 rounded-full blur-[140px] pointer-events-none animate-pulse-glow"></div>
        
        {/* Navigation Home Link */}
        <div className="z-10">
          <Link to="/" className="inline-flex items-center space-x-2 text-sm text-brand-muted hover:text-white transition-colors duration-200 group">
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
            <span>Return to Discovery Portal</span>
          </Link>
        </div>

        {/* Branding Slogan Frame */}
        <div className="z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-accent-violet/10 border border-accent-violet/30 text-accent-violet text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Virtual Event Orchestrator</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white leading-tight">
            The Hub for <span className="bg-gradient-to-r from-accent-violet to-accent-blue bg-clip-text text-transparent">Immersive</span> Knowledge Sharing.
          </h1>
          <p className="text-brand-muted text-lg leading-relaxed">
            Experience high-performance live webinars, interactive workspace panels, and curated events built on an ultra-secure relational platform.
          </p>
        </div>

        {/* Safety Indicator Frame */}
        <div className="z-10 flex items-center space-x-2.5 text-xs text-slate-500">
          <ShieldCheck className="w-5 h-5 text-status-success" />
          <span>Stateless Token Verification Secured (Local JWT & PostgreSQL)</span>
        </div>
      </div>

      {/* RIGHT COLUMN: INTERACTIVE AUTHENTICATION VIEWPORT (Mobile-Hardened - Task 10) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 relative bg-brand-dark/95 overflow-y-auto">
        
        {/* Mobile Navigation Header */}
        <div className="flex justify-between items-center lg:hidden flex-shrink-0 mb-6">
          <Link to="/" className="inline-flex items-center space-x-2 text-xs text-brand-muted hover:text-white transition-colors duration-200">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return</span>
          </Link>
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-status-success" />
            <span>JWT Secure</span>
          </div>
        </div>

        {/* Center Container Form */}
        <div className="my-auto w-full max-w-md mx-auto space-y-8 py-4">
          
          {/* Welcoming Text Frame */}
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              {isRegister ? 'Begin Your Journey' : 'Welcome Back'}
            </h2>
            <p className="text-brand-muted text-sm min-h-[40px]">
              {isRegister 
                ? (registerStep === 1 
                    ? 'Step 1: Set up your secure platform access credentials.' 
                    : 'Step 2: Hydrate your profile demographics and role card.')
                : (selectedRole === 'organizer' ? 'Enter credentials to manage active events.' : 'Enter credentials to access seat registrations.')
              }
            </p>
          </div>

          {/* Core Interactive Card */}
          <div className="glass-panel p-8 rounded-2xl shadow-2xl space-y-6">
            
            {/* Global Error Banner (Task 9) */}
            {globalError && (
              <div 
                className="p-4 bg-status-danger/10 border border-status-danger/30 rounded-xl flex items-start space-x-3 text-status-danger text-sm"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{globalError}</span>
              </div>
            )}

            {/* Stepper Component (Task 5) rendered ONLY in Register Mode */}
            {isRegister && (
              <div className="space-y-2 pb-2" aria-label="Registration Progress Stepper">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Progress Funnel</span>
                  <span>Step {registerStep} of 2</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${registerStep >= 1 ? 'bg-accent-violet' : 'bg-brand-card'}`}></div>
                  <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${registerStep >= 2 ? 'bg-accent-blue' : 'bg-brand-card'}`}></div>
                </div>
              </div>
            )}

            {/* Role switch pill selector (Task 4) rendered ONLY in Login Mode */}
            {!isRegister && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Select Persona Role
                </span>
                <div 
                  className="relative w-full flex items-center p-1 bg-brand-dark/80 border border-brand-card rounded-full cursor-pointer h-12"
                  onClick={() => setSelectedRole(selectedRole === 'attendee' ? 'organizer' : 'attendee')}
                  role="radiogroup"
                  aria-label="Platform Persona Role Selector"
                >
                  <div 
                    className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-gradient-to-r from-accent-violet to-accent-blue rounded-full transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    style={{
                      transform: selectedRole === 'organizer' ? 'translateX(100%)' : 'translateX(0%)'
                    }}
                  ></div>
                  
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedRole('attendee'); }}
                    className={`w-1/2 text-center text-xs font-bold z-10 transition-colors duration-200 ${
                      selectedRole === 'attendee' ? 'text-white' : 'text-brand-muted hover:text-slate-200'
                    }`}
                    role="radio"
                    aria-checked={selectedRole === 'attendee'}
                  >
                    Attendee Explorer
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedRole('organizer'); }}
                    className={`w-1/2 text-center text-xs font-bold z-10 transition-colors duration-200 ${
                      selectedRole === 'organizer' ? 'text-white' : 'text-brand-muted hover:text-slate-200'
                    }`}
                    role="radio"
                    aria-checked={selectedRole === 'organizer'}
                  >
                    Event Organizer
                  </button>
                </div>
              </div>
            )}

            {/* Login Viewport Form */}
            {!isRegister && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-1">
                  <label htmlFor="email-login" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="email-login"
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => handleBlur('email')}
                      className={`w-full bg-brand-dark/70 border ${
                        touched.email && errors.email ? 'border-status-danger focus:ring-status-danger/30' : 'border-brand-card focus:border-accent-violet focus:ring-accent-violet/30'
                      } focus:ring-4 focus:outline-none rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 transition`}
                      autoComplete="username"
                    />
                  </div>
                  {touched.email && errors.email && (
                    <p className="text-[11px] text-status-danger mt-1 font-medium">{errors.email}</p>
                  )}
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label htmlFor="password-login" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Password
                    </label>
                    <a href="#forgot" className="text-[10px] text-accent-violet hover:text-accent-violetHover font-semibold transition-colors">
                      Forgot Password?
                    </a>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      id="password-login"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => handleBlur('password')}
                      className={`w-full bg-brand-dark/70 border ${
                        touched.password && errors.password ? 'border-status-danger focus:ring-status-danger/30' : 'border-brand-card focus:border-accent-violet focus:ring-accent-violet/30'
                      } focus:ring-4 focus:outline-none rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-slate-600 transition`}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                      aria-label={showPassword ? "Obfuscate password entry" : "Reveal password entry"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {touched.password && errors.password && (
                    <p className="text-[11px] text-status-danger mt-1 font-medium">{errors.password}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="w-full py-3.5 mt-4 bg-gradient-to-r from-accent-violet to-accent-blue hover:opacity-90 active:opacity-100 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
                  aria-disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </form>
            )}

            {/* Register Wizard Viewports */}
            {isRegister && (
              <div className="space-y-4">
                
                {/* REGISTER STEP 1: Cryptographic Credentials (Task 3) */}
                {registerStep === 1 && (
                  <form onSubmit={handleNextStep} className="space-y-4 animate-slide-in">
                    
                    {/* Email Input */}
                    <div className="space-y-1">
                      <label htmlFor="email-reg" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Email Address
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                          <Mail className="w-4 h-4" />
                        </span>
                        <input
                          id="email-reg"
                          ref={emailInputRef}
                          type="email"
                          required
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => handleBlur('email')}
                          className={`w-full bg-brand-dark/70 border ${
                            touched.email && errors.email ? 'border-status-danger focus:ring-status-danger/30' : 'border-brand-card focus:border-accent-violet focus:ring-accent-violet/30'
                          } focus:ring-4 focus:outline-none rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 transition`}
                          autoComplete="username"
                        />
                      </div>
                      {touched.email && errors.email && (
                        <p className="text-[11px] text-status-danger mt-1 font-medium">{errors.email}</p>
                      )}
                    </div>

                    {/* Master Password Input */}
                    <div className="space-y-1.5">
                      <label htmlFor="password-reg" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Create Password
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input
                          id="password-reg"
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Min. 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={() => handleBlur('password')}
                          className={`w-full bg-brand-dark/70 border ${
                            touched.password && errors.password ? 'border-status-danger focus:ring-status-danger/30' : 'border-brand-card focus:border-accent-violet focus:ring-accent-violet/30'
                          } focus:ring-4 focus:outline-none rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-slate-600 transition`}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                          aria-label={showPassword ? "Obfuscate password" : "Reveal password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Password Strength Indicator Meter (Task 3) */}
                      {password && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[9px] font-semibold">
                            <span className="text-slate-400">Cryptographic Strength:</span>
                            <span className={
                              passwordStrength <= 2 ? 'text-status-danger' :
                              passwordStrength <= 4 ? 'text-status-warning' : 'text-status-success'
                            }>
                              {passwordStrength <= 2 ? 'Weak' :
                               passwordStrength <= 4 ? 'Moderate' : 'Optimal'}
                            </span>
                          </div>
                          <div className="flex space-x-1.5 h-1">
                            {[1, 2, 3, 4].map((segIndex) => {
                              const isActive = passwordStrength >= segIndex + 1 || (passwordStrength > 0 && segIndex === 0);
                              let barColor = 'bg-brand-card';
                              if (isActive) {
                                barColor = passwordStrength <= 2 ? 'bg-status-danger' :
                                           passwordStrength <= 4 ? 'bg-status-warning' : 'bg-status-success';
                              }
                              return (
                                <div key={segIndex} className={`h-full flex-1 rounded-full transition-all duration-300 ${barColor}`} />
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {touched.password && errors.password && (
                        <p className="text-[11px] text-status-danger mt-1 font-medium">{errors.password}</p>
                      )}
                    </div>

                    {/* Confirm Password Input */}
                    <div className="space-y-1">
                      <label htmlFor="confirmPassword-reg" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input
                          id="confirmPassword-reg"
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          placeholder="Match password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onBlur={() => handleBlur('confirmPassword')}
                          className={`w-full bg-brand-dark/70 border ${
                            touched.confirmPassword && errors.confirmPassword ? 'border-status-danger focus:ring-status-danger/30' : 'border-brand-card focus:border-accent-violet focus:ring-accent-violet/30'
                          } focus:ring-4 focus:outline-none rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-slate-600 transition`}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                          aria-label={showConfirmPassword ? "Obfuscate password" : "Reveal password"}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {touched.confirmPassword && errors.confirmPassword && (
                        <p className="text-[11px] text-status-danger mt-1 font-medium">{errors.confirmPassword}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 mt-4 bg-gradient-to-r from-accent-violet to-accent-blue hover:opacity-90 active:opacity-100 text-white font-bold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center space-x-1"
                    >
                      <span>Continue Profile Setup</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </form>
                )}

                {/* REGISTER STEP 2: Demographic Hydration & Role card grid (Task 4) */}
                {registerStep === 2 && (
                  <form onSubmit={handleSubmit} className="space-y-4 animate-slide-in">
                    
                    {/* Demographics row */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* First Name */}
                      <div className="space-y-1">
                        <label htmlFor="firstName" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          First Name
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                            <UserIcon className="w-4 h-4" />
                          </span>
                          <input
                            id="firstName"
                            ref={firstNameInputRef}
                            type="text"
                            required
                            placeholder="Jane"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            onBlur={() => handleBlur('firstName')}
                            className={`w-full bg-brand-dark/70 border ${
                              touched.firstName && errors.firstName ? 'border-status-danger focus:ring-status-danger/30' : 'border-brand-card focus:border-accent-violet focus:ring-accent-violet/30'
                            } focus:ring-4 focus:outline-none rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 transition`}
                            autoComplete="given-name"
                          />
                        </div>
                        {touched.firstName && errors.firstName && (
                          <p className="text-[11px] text-status-danger mt-1 font-medium">{errors.firstName}</p>
                        )}
                      </div>

                      {/* Last Name */}
                      <div className="space-y-1">
                        <label htmlFor="lastName" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Last Name
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                            <UserIcon className="w-4 h-4" />
                          </span>
                          <input
                            id="lastName"
                            type="text"
                            required
                            placeholder="Doe"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            onBlur={() => handleBlur('lastName')}
                            className={`w-full bg-brand-dark/70 border ${
                              touched.lastName && errors.lastName ? 'border-status-danger focus:ring-status-danger/30' : 'border-brand-card focus:border-accent-violet focus:ring-accent-violet/30'
                            } focus:ring-4 focus:outline-none rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 transition`}
                            autoComplete="family-name"
                          />
                        </div>
                        {touched.lastName && errors.lastName && (
                          <p className="text-[11px] text-status-danger mt-1 font-medium">{errors.lastName}</p>
                        )}
                      </div>
                    </div>

                    {/* Role Selection Card Grid (Fitts's Law Target Grid - Task 4) */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Select Platform Role
                      </span>
                      
                      <div className="grid grid-cols-2 gap-4 mt-1">
                        
                        {/* Attendee Card */}
                        <div 
                          onClick={() => setSelectedRole('attendee')}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center text-center space-y-2 select-none h-32 justify-center ${
                            selectedRole === 'attendee'
                              ? 'border-accent-blue bg-accent-blue/10 scale-[1.02] shadow-md'
                              : 'border-brand-card bg-brand-dark/40 opacity-60 hover:opacity-100 hover:border-brand-card/85'
                          }`}
                          role="button"
                          aria-pressed={selectedRole === 'attendee'}
                        >
                          <Ticket className={`w-7 h-7 ${selectedRole === 'attendee' ? 'text-accent-blue' : 'text-slate-500'}`} />
                          <div>
                            <span className="text-xs font-bold text-white block">Attendee Explorer</span>
                            <span className="text-[9px] text-brand-muted mt-1 block leading-tight">Discover and register for webinars.</span>
                          </div>
                        </div>

                        {/* Organizer Card */}
                        <div 
                          onClick={() => setSelectedRole('organizer')}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center text-center space-y-2 select-none h-32 justify-center ${
                            selectedRole === 'organizer'
                              ? 'border-accent-violet bg-accent-violet/10 scale-[1.02] shadow-md'
                              : 'border-brand-card bg-brand-dark/40 opacity-60 hover:opacity-100 hover:border-brand-card/85'
                          }`}
                          role="button"
                          aria-pressed={selectedRole === 'organizer'}
                        >
                          <CalendarDays className={`w-7 h-7 ${selectedRole === 'organizer' ? 'text-accent-violet' : 'text-slate-500'}`} />
                          <div>
                            <span className="text-xs font-bold text-white block">Event Organizer</span>
                            <span className="text-[9px] text-brand-muted mt-1 block leading-tight">Create, host and manage webinar tracks.</span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Step Navigation Controls */}
                    <div className="flex space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setRegisterStep(1)}
                        className="w-1/3 py-3.5 bg-brand-card hover:bg-slate-700 text-white font-bold rounded-xl border border-brand-card transition-colors flex items-center justify-center space-x-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-2/3 py-3.5 bg-gradient-to-r from-accent-violet to-accent-blue hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Creating Account...</span>
                          </>
                        ) : (
                          <>
                            <span>Complete Registration</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

              </div>
            )}

            {/* Gateway Toggle Switch Link */}
            <div className="text-center pt-4 border-t border-brand-card/50 text-sm">
              <span className="text-brand-muted">
                {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              </span>
              <button
                onClick={toggleAuthMode}
                className="font-bold text-accent-violet hover:text-accent-violetHover transition-colors focus:outline-none focus:underline"
              >
                {isRegister ? 'Sign In' : 'Sign Up Free'}
              </button>
            </div>

          </div>

        </div>

        {/* Mobile footer copyright */}
        <div className="mt-8 text-center lg:hidden flex-shrink-0">
          <p className="text-[10px] text-slate-600">
            &copy; 2026 Project Vora. Relational Gateway.
          </p>
        </div>

      </div>

    </div>
  );
};

export default Auth;
