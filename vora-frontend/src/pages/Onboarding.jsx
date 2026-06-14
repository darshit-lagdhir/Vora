import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { CheckCircle, AlertCircle, Ticket, Calendar, User, Building } from 'lucide-react';
import BrutalistInput from '../components/BrutalistInput.jsx';
import BrutalistButton from '../components/BrutalistButton.jsx';

/**
 * Onboarding Funnel Page for Project Vora.
 * Collects names, organization tags, role choices, and registers users.
 */
export default function Onboarding() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  // Step state: 1 (Profile Info), 2 (Role Choice), 3 (Success Climax)
  const [step, setStep] = useState(1);

  // Input states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [selectedRole, setSelectedRole] = useState('attendee'); // 'attendee' vs 'organizer'

  // Verification & loading states
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to Auth if no email context is present
  useEffect(() => {
    if (!email) {
      navigate('/auth');
    }
  }, [email, navigate]);

  // Handle Automatic Redirection on Success Step (Step 3)
  useEffect(() => {
    if (step === 3) {
      const redirectTimer = setTimeout(() => {
        if (selectedRole === 'organizer') {
          navigate('/organizer');
        } else {
          navigate('/attendee');
        }
      }, 1500);

      return () => clearTimeout(redirectTimer);
    }
  }, [step, selectedRole, navigate]);

  // Step 1 Validation & Advance
  const handleNextStep = (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please fill in your first and last name.');
      return;
    }
    setError('');
    setStep(2);
  };

  // Onboarding Complete Submission (registers user with default password)
  const handleCompleteOnboarding = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      // Register with the database under the hood using default secure credential
      await register(email, 'password123', firstName.trim(), lastName.trim(), selectedRole);
      setStep(3);
    } catch (err) {
      console.error('[Onboarding] Profile registration failed:', err);
      setError(err.message || 'Onboarding failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100 select-none relative">
      
      {/* Dynamic Slide Transition Keyframes */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-right {
          animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Subtle Top Progress Bar */}
      {step < 3 && (
        <div className="w-full max-w-md mb-8 flex flex-col space-y-2">
          <div className="flex justify-between text-[10px] uppercase font-mono tracking-wider text-zinc-500">
            <span>Setup Funnel</span>
            <span>Step {step} of 2</span>
          </div>
          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-primary-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${step === 1 ? 50 : 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Modal chassis cards */}
      <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-900 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
        <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent rounded-t-2xl" />

        {/* Global Error message box */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          /* STEP 1: PERSONAL INFORMATION */
          <form onSubmit={handleNextStep} className="space-y-5 animate-slide-right">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-white font-display">Let's set up your profile</h3>
              <p className="text-zinc-400 text-xs font-sans">Provide your credentials to register on Vora.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <BrutalistInput
                label="First Name"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <BrutalistInput
                label="Last Name"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <BrutalistInput
              label="Organization Name (Optional)"
              placeholder="Vora Technologies"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />

            <BrutalistButton
              type="submit"
              variant="primary"
              className="w-full py-3.5 mt-2 flex items-center justify-center space-x-2 font-semibold"
            >
              <span>Continue Setup</span>
            </BrutalistButton>
          </form>
        )}

        {step === 2 && (
          /* STEP 2: ROLE SELECTION */
          <div className="space-y-5 animate-slide-right">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-white font-display">Select platform role</h3>
              <p className="text-zinc-400 text-xs font-sans">Choose your primary workspace role card below.</p>
            </div>

            {/* Selectable Soft Glass Role Cards */}
            <div className="grid grid-cols-2 gap-4 select-none">
              
              {/* Attendee Role Card */}
              <div
                onClick={() => setSelectedRole('attendee')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center justify-center text-center space-y-2.5 h-36 ${
                  selectedRole === 'attendee'
                    ? 'border-primary-500 bg-primary-500/5 ring-2 ring-primary-500/25 text-primary-400'
                    : 'border-zinc-800 bg-zinc-900/20 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                <Ticket className="w-6 h-6 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white block">Attendee</span>
                  <span className="text-[9px] text-zinc-500 block leading-tight mt-1">Discover, secure tickets and join webinar tracks.</span>
                </div>
              </div>

              {/* Organizer Role Card */}
              <div
                onClick={() => setSelectedRole('organizer')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center justify-center text-center space-y-2.5 h-36 ${
                  selectedRole === 'organizer'
                    ? 'border-primary-500 bg-primary-500/5 ring-2 ring-primary-500/25 text-primary-400'
                    : 'border-zinc-800 bg-zinc-900/20 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                <Calendar className="w-6 h-6 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white block">Organizer</span>
                  <span className="text-[9px] text-zinc-500 block leading-tight mt-1">Create, stream and manage multi-track summits.</span>
                </div>
              </div>

            </div>

            {/* Footer Navigation CTA */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-xs transition-colors"
              >
                Back
              </button>
              <BrutalistButton
                onClick={handleCompleteOnboarding}
                disabled={isSubmitting}
                className="w-2/3 py-3 flex items-center justify-center space-x-2 font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Finalizing...</span>
                  </>
                ) : (
                  <span>Complete Onboarding</span>
                )}
              </BrutalistButton>
            </div>
          </div>
        )}

        {step === 3 && (
          /* STEP 3: SUCCESS REDIRECT CLIMAX */
          <div className="text-center py-6 space-y-5 animate-slide-right">
            
            {/* Green check anim container */}
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-semibold text-white font-display">You're all set!</h3>
              <p className="text-zinc-400 text-xs font-sans">
                Creating your secure space and redirecting to your dashboard...
              </p>
            </div>

            <div className="flex items-center justify-center space-x-1.5 text-xs text-zinc-500 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Routing secure session...</span>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
