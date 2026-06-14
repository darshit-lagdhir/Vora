import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import apiClient from '../../services/apiClient.js';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertCircle, Calendar, Users, Clock } from 'lucide-react';
import Heading from '../../components/ui/Heading.jsx';
import Text from '../../components/ui/Text.jsx';
import PremiumInput from '../../components/ui/PremiumInput.jsx';
import { toast } from '../../components/ui/Toast.jsx';

/**
 * Event Creation Wizard (The "Create" in CRUD).
 * Focus-isolated 3-step progressive stepper to orchestrate virtual events.
 * Integrates liquid progress bars, auto-expanding textareas, dark webkit indicators,
 * bento reviews, climax submissions, and soft-lock click animations.
 */
export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Unified Form Payload State
  const [payload, setPayload] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    capacity: '100',
  });

  // Stepper state controllers
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // UI state feedback
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [shakeStep, setShakeStep] = useState(false);

  // Auto-expanding textarea height calculations
  const descRef = useRef(null);
  const adjustDescHeight = () => {
    if (descRef.current) {
      descRef.current.style.height = 'auto';
      descRef.current.style.height = `${descRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (currentStep === 1) {
      adjustDescHeight();
    }
  }, [payload.description, currentStep]);

  // Step validation check (Soft-Lock Helper)
  const isStepValid = (step) => {
    if (step === 1) {
      return payload.title.trim().length >= 5 && payload.description.trim().length >= 10;
    }
    if (step === 2) {
      const cap = parseInt(payload.capacity, 10);
      const hasBasicFields = payload.date !== '' && payload.time !== '' && !isNaN(cap) && cap > 0;
      if (!hasBasicFields) return false;

      // Enforce scheduling in the future
      const selectedDateTime = new Date(`${payload.date}T${payload.time}`);
      return selectedDateTime.getTime() > Date.now();
    }
    return true;
  };

  // Submit Handler: POST data to Node backend (REST integration)
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isLoading || !isStepValid(1) || !isStepValid(2)) return;

    setIsLoading(true);
    setSubmitError(null);

    try {
      // Formulate ISO timestamp sequences for start and end times (Default duration 2 hrs)
      const startTimestamp = new Date(`${payload.date}T${payload.time}`).toISOString();
      const endTimestamp = new Date(
        new Date(`${payload.date}T${payload.time}`).getTime() + 2 * 60 * 60 * 1000
      ).toISOString();

      // Configure default Unsplash banner image to satisfy db constraints
      const defaultBanner = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80';

      const body = {
        title: payload.title.trim(),
        description: payload.description.trim(),
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp,
        maximum_capacity: parseInt(payload.capacity, 10),
        banner_image_url: defaultBanner,
      };

      const response = await apiClient.post('/api/v1/events', body);

      if (response?.data?.success) {
        // Trigger success toast and navigate optimistically
        toast('Event successfully orchestrated and published to the live directory.', 'success');
        navigate('/organizer/dashboard');
      } else {
        throw new Error('Database insertion failed. Invalid API response package.');
      }
    } catch (err) {
      console.error('[Event Creation] Failed to initialize event:', err);
      const serverMsg = err.response?.data?.message || err.message || 'Server connection failed.';
      setSubmitError(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date preview
  const formatReviewDate = () => {
    if (!payload.date || !payload.time) return '';
    const dateObj = new Date(`${payload.date}T${payload.time}`);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
      if (currentStep < totalSteps) {
        if (!isStepValid(currentStep)) {
          setShakeStep(true);
          setTimeout(() => setShakeStep(false), 500);
        } else {
          setCurrentStep(prev => prev + 1);
        }
      }
    }
  };

  return (
    <div className="h-screen w-screen overflow-y-auto lg:overflow-hidden bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 text-white font-sans relative select-none">
      
      {/* Background radial overlays */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary-600/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Escape Hatch Return Button */}
      <button 
        type="button"
        disabled={isLoading}
        onClick={() => navigate('/organizer/dashboard')}
        className="absolute top-6 left-6 text-zinc-500 hover:text-white transition-colors duration-200 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider cursor-pointer outline-none bg-transparent border-none group disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-[2px] transition-transform duration-200 text-zinc-500 group-hover:text-white" />
        <span className="font-sans">Cancel Orchestration</span>
      </button>

      {/* Central Column constraints */}
      <div className="w-full max-w-xl flex flex-col mt-8">
        
        {/* Header Block */}
        <div className="text-center sm:text-left mb-6 select-none">
          <Heading level="h1" className="text-2xl sm:text-3xl font-extrabold tracking-tighter text-white">
            Initialize New Webinar
          </Heading>
          <Text variant="muted" className="!text-zinc-405 mt-2 !text-xs font-sans">
            Configure dynamic schedules, seat allocations, and session information.
          </Text>
        </div>

        {/* ─── HORIZON PROGRESS BAR ─── */}
        <div className="w-full mt-6 mb-10 select-none">
          <div className="flex justify-between items-end mb-2">
            <span></span>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.2em] font-technical">
              {currentStep === 1 && 'STEP 01 — IDENTITY'}
              {currentStep === 2 && 'STEP 02 — LOGISTICS'}
              {currentStep === 3 && 'STEP 03 — REVIEW'}
            </span>
          </div>
          <div className="w-full h-[3px] bg-zinc-950 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              className="h-full bg-primary-500 rounded-full"
              initial={{ width: '33.3%' }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        {/* ─── ACTIVE STEP WRAPPER ─── */}
        <div 
          className={`bg-zinc-900/30 backdrop-blur-md border border-white/5 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col justify-between min-h-[400px] relative transition-opacity duration-200 ${isLoading ? 'opacity-70' : 'opacity-100'}`}
        >
          {/* Edge highlights */}
          <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent rounded-t-3xl" />

          <form 
            onSubmit={(e) => e.preventDefault()} 
            onKeyDown={handleKeyDown}
            className="flex-grow flex flex-col justify-center"
          >
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ x: 15, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -15, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="w-full flex-grow flex flex-col justify-center"
              >
                
                {/* ─── STEP 1: CORE IDENTITY ─── */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="text-left select-none mb-2">
                      <Heading level="h2" className="text-xl font-bold tracking-tight text-white font-display">
                        Define the Event Identity
                      </Heading>
                      <Text variant="muted" className="!text-zinc-450 !text-xs mt-1 font-sans leading-relaxed">
                        Provide a compelling title and a comprehensive overview of the virtual conference to attract your audience.
                      </Text>
                    </div>

                    {/* Webinar Title */}
                    <PremiumInput
                      label="Webinar Title"
                      type="text"
                      placeholder="e.g., Full Stack Architecture Deep Dive"
                      value={payload.title}
                      onChange={(e) => setPayload({ ...payload, title: e.target.value })}
                      required
                    />

                    {/* Auto-Expanding Description */}
                    <div className="space-y-2 text-left">
                      <label className="block text-[10px] font-semibold text-zinc-450 uppercase tracking-[0.2em] mb-2 font-technical">
                        Event Description
                      </label>
                      <textarea
                        ref={descRef}
                        rows="4"
                        placeholder="Write a compelling overview describing target audiences, schedules, or syllabus tracks..."
                        value={payload.description}
                        onChange={(e) => {
                          setPayload({ ...payload, description: e.target.value });
                          adjustDescHeight();
                        }}
                        className="w-full bg-zinc-950 border border-white/5 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 px-4 py-3.5 rounded-xl text-zinc-200 placeholder:text-zinc-600 font-sans text-sm leading-relaxed outline-none transition-all duration-200 ease-linear resize-none overflow-hidden max-h-[300px] overflow-y-auto"
                      />
                    </div>
                  </div>
                )}

                {/* ─── STEP 2: LOGISTICS & TEMPORAL ─── */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="text-left select-none mb-2">
                      <Heading level="h2" className="text-xl font-bold tracking-tight text-white font-display">
                        Temporal and Capacity Logistics
                      </Heading>
                      <Text variant="muted" className="!text-zinc-450 !text-xs mt-1 font-sans leading-relaxed">
                        Define dates, times, and maximum thresholds for your session.
                      </Text>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                      
                      {/* Date Input */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-semibold text-zinc-450 uppercase tracking-[0.2em] mb-2 font-technical">
                          Scheduled Date
                        </label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none w-5 h-5 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-zinc-500" />
                          </div>
                          <input 
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={payload.date}
                            onChange={(e) => setPayload({ ...payload, date: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/5 rounded-xl pl-11 pr-4 py-3.5 text-white font-form text-sm focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all duration-200 ease-linear cursor-pointer [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Time Input */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-semibold text-zinc-450 uppercase tracking-[0.2em] mb-2 font-technical">
                          Start Time
                        </label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none w-5 h-5 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-zinc-500" />
                          </div>
                          <input 
                            type="time"
                            value={payload.time}
                            onChange={(e) => setPayload({ ...payload, time: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/5 rounded-xl pl-11 pr-4 py-3.5 text-white font-form text-sm focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all duration-200 ease-linear cursor-pointer [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Attendee Capacity */}
                      <div className="md:col-span-2 space-y-2">
                        <PremiumInput
                          label="Maximum Attendee Capacity"
                          type="number"
                          placeholder="100"
                          value={payload.capacity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setPayload({ ...payload, capacity: val });
                          }}
                          required
                        />
                        <Text variant="muted" className="!text-[10px] !text-zinc-500 mt-1 select-none font-sans">
                          Registration will automatically close and prevent further access once this threshold is reached.
                        </Text>
                      </div>

                      {/* Past Date validation error */}
                      {payload.date && payload.time && new Date(`${payload.date}T${payload.time}`).getTime() <= Date.now() && (
                        <div className="md:col-span-2 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-rose-500 font-sans mt-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>Event schedule must be set to a future date and time. Past timelines are prohibited.</span>
                        </div>
                      )}

                    </div>
                  </div>
                )}

                {/* ─── STEP 3: REVIEW & SUBMIT ─── */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="text-left select-none mb-2">
                      <Heading level="h2" className="text-xl font-bold tracking-tight text-white font-display">
                        Review Event Architecture
                      </Heading>
                      <Text variant="muted" className="!text-zinc-450 !text-xs mt-1 font-sans leading-relaxed">
                        Confirm details below before publishing your event to the public ecosystem directory.
                      </Text>
                    </div>
                    
                    {/* Error Banner */}
                    <AnimatePresence>
                      {submitError && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-xs text-rose-500/90 font-technical" role="alert">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="leading-normal">{submitError}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Bento Card Summary block */}
                    <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-6 text-left space-y-4">
                      
                      {/* Title display */}
                      <div className="border-b border-white/5 pb-3">
                        <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest font-technical block">
                          Webinar Title
                        </span>
                        <span className="text-lg font-extrabold text-white font-display tracking-tight">
                          {payload.title}
                        </span>
                      </div>

                      {/* Description summary */}
                      <div className="border-b border-white/5 pb-3">
                        <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest font-technical block">
                          Event Overview
                        </span>
                        <p className="text-xs text-zinc-400 font-sans leading-relaxed line-clamp-3 overflow-hidden mt-1">
                          {payload.description}
                        </p>
                      </div>

                      {/* Metadata ribbons */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 select-none pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest font-technical">
                            Schedule
                          </span>
                          <span className="text-xs font-semibold text-white font-technical">
                            {formatReviewDate()}
                          </span>
                        </div>

                        <div className="h-3 w-[1px] bg-white/10 hidden sm:block" />

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest font-technical">
                            Seating limit
                          </span>
                          <span className="text-xs font-semibold text-white font-technical">
                            {payload.capacity} seats max
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Launch Trigger */}
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleSubmit}
                      className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold font-form py-4 rounded-xl shadow-xl shadow-primary-600/35 hover:shadow-primary-600/50 transition-all flex items-center justify-center gap-2 cursor-pointer border-none outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none relative"
                    >
                      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none ${isLoading ? 'opacity-100' : 'opacity-0'}`}>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                      <span className={`transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                        Publish Virtual Event
                      </span>
                    </button>

                  </div>
                )}

              </motion.div>
            </AnimatePresence>

          </form>

          {/* ─── NAVIGATION BUTTON CONTROLS ─── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5 select-none">
            {/* Back Button */}
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={isLoading}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs font-semibold uppercase outline-none bg-transparent border-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Back
                </button>
              )}
            </div>

            {/* Next Step Button (Visual Soft-Lock) */}
            <div>
              {currentStep < totalSteps && (
                <motion.button
                  type="button"
                  disabled={isLoading}
                  animate={shakeStep ? { x: [0, -4, 4, -4, 4, -4, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  onClick={() => {
                    if (!isStepValid(currentStep)) {
                      setShakeStep(true);
                      setTimeout(() => setShakeStep(false), 500);
                    } else {
                      setCurrentStep(prev => prev + 1);
                    }
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold font-form uppercase tracking-wider transition-all duration-200 cursor-pointer outline-none border-none
                    ${isStepValid(currentStep)
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-white hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-zinc-800/10'
                      : 'bg-zinc-900 text-zinc-600 opacity-50 cursor-not-allowed'
                    }
                  `}
                >
                  Next Step
                </motion.button>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
