import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, Download, ShieldCheck, FileText, ChevronRight } from 'lucide-react';
import Heading from '../ui/Heading.jsx';
import Text from '../ui/Text.jsx';
import Badge from '../ui/Badge.jsx';

/**
 * Bento Grid feature matrix mapped to CRUD and auth specifications.
 * Employs scroll reveals and clean inline UI simulation widgets.
 */
export default function BentoGrid() {

  // Reveal transition variants
  const gridVariants = {
    hidden: { opacity: 0, y: 32 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 26,
        stiffness: 150,
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 24,
        stiffness: 160
      }
    }
  };

  return (
    <div id="features" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 select-none">
      
      {/* ─── Grid Header ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ type: "spring", stiffness: 180, damping: 24 }}
        className="flex flex-col items-center md:items-start text-center md:text-left mb-16 space-y-4"
      >
        <Badge variant="primary">Platform Benefits</Badge>
        <h2 className="text-4xl md:text-6xl font-bold font-elegant text-white tracking-tight leading-tight">
          Meticulously Crafted Event Workspaces
        </h2>
        <Text variant="muted" className="text-zinc-400 text-base md:text-lg max-w-2xl leading-relaxed">
          Discover a beautifully designed ecosystem built for seamless scheduling, simple event registrations, and complete access security.
        </Text>
      </motion.div>

      {/* ─── Bento CSS Grid Matrix ─── */}
      <motion.div
        variants={gridVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        
        {/* Card 1: Event & Webinar Scheduling */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -4, borderColor: "rgba(255, 255, 255, 0.15)", boxShadow: "0 0 30px -5px rgba(139, 92, 246, 0.2)" }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="lg:col-span-2 soft-glass rounded-3xl p-8 md:p-10 flex flex-col justify-between overflow-hidden group transition-all duration-300 min-h-[350px] cursor-pointer"
        >
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/50 border border-white/5 flex items-center justify-center text-zinc-300 mb-6 shrink-0">
              <Calendar className="w-5 h-5 text-primary-400" />
            </div>
            <Heading level="h3" className="text-xl text-white font-bold font-brutalist">
              Effortless Event Organization
            </Heading>
            <Text variant="muted" className="text-zinc-400 leading-relaxed text-sm font-sans">
              Create your events, configure timing options, and launch your landing page in seconds. No complex setups or configurations to manage—just intuitive, seamless orchestration.
            </Text>
          </div>

          {/* Simulated Event List UI widget */}
          <div className="mt-8 bg-zinc-950/80 border border-zinc-855 rounded-2xl p-4 space-y-3 font-sans">
            <div className="flex items-center justify-between text-[10px] text-zinc-550 border-b border-zinc-900 pb-2 font-mono uppercase tracking-wider">
              <span>Upcoming Sessions</span>
              <span>Status</span>
            </div>
            
            <div className="flex items-center justify-between gap-4 py-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[10px] font-mono font-bold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded">09:00 AM</span>
                <span className="text-xs font-semibold text-zinc-300 truncate">Opening Keynote & Masterclass</span>
              </div>
              <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wide">Active</span>
            </div>

            <div className="flex items-center justify-between gap-4 py-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[10px] font-mono font-bold text-zinc-550 bg-zinc-900 px-2 py-0.5 rounded">11:30 AM</span>
                <span className="text-xs font-semibold text-zinc-400 truncate">Webinar Setup & Design Workshop</span>
              </div>
              <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wide">Active</span>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Attendee Management */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -4, borderColor: "rgba(255, 255, 255, 0.15)", boxShadow: "0 0 30px -5px rgba(139, 92, 246, 0.2)" }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="lg:col-span-1 soft-glass rounded-3xl p-8 md:p-10 flex flex-col justify-between overflow-hidden group transition-all duration-300 min-h-[350px] cursor-pointer"
        >
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/50 border border-white/5 flex items-center justify-center text-zinc-300 mb-6 shrink-0">
              <Users className="w-5 h-5 text-primary-400" />
            </div>
            <Heading level="h3" className="text-xl text-white font-bold font-brutalist">
              Real-Time Roster Tracking
            </Heading>
            <Text variant="muted" className="text-zinc-400 leading-relaxed text-sm font-sans">
              Track registrations dynamically as they occur. Monitor audience sizes, check capacity limits, and manage your attendee list in real time with absolute simplicity.
            </Text>
          </div>

          {/* Simulated Capacity progress indicator */}
          <div className="mt-8 bg-zinc-950/40 border border-zinc-850 p-6 rounded-2xl flex flex-col justify-between">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[9px] font-mono font-bold text-zinc-550 uppercase tracking-widest">Registrations</span>
              <span className="text-2xl font-bold font-display text-white tabular-nums tracking-tighter">142 / 250</span>
            </div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary-500 h-full w-[56.8%]" />
            </div>
            <span className="text-[9px] font-mono text-zinc-550 mt-2.5 block uppercase tracking-wider">Capacity limits active</span>
          </div>
        </motion.div>

        {/* Card 3: Post-Event Resource Sharing */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -4, borderColor: "rgba(255, 255, 255, 0.15)", boxShadow: "0 0 30px -5px rgba(139, 92, 246, 0.2)" }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="lg:col-span-1 soft-glass rounded-3xl p-8 md:p-10 flex flex-col justify-between overflow-hidden group transition-all duration-300 min-h-[350px] cursor-pointer"
        >
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/50 border border-white/5 flex items-center justify-center text-zinc-300 mb-6 shrink-0">
              <Download className="w-5 h-5 text-primary-400" />
            </div>
            <Heading level="h3" className="text-xl text-white font-bold font-brutalist">
              Seamless Material Distribution
            </Heading>
            <Text variant="muted" className="text-zinc-400 leading-relaxed text-sm font-sans">
              Share session slides, document links, and video recordings with your audience once the webinar concludes, completing the post-event lifecycle.
            </Text>
          </div>

          {/* Simulated File download widget */}
          <div className="mt-8 bg-zinc-950/60 border border-zinc-850 p-4 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-primary-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-300 truncate">keynote_slides.pdf</p>
                <span className="text-[9px] text-zinc-555 font-mono">2.4 MB</span>
              </div>
            </div>
            <button
              type="button"
              className="text-[10px] font-bold text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700 bg-zinc-900/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Download
            </button>
          </div>
        </motion.div>

        {/* Card 4: JWT authorization */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -4, borderColor: "rgba(255, 255, 255, 0.15)", boxShadow: "0 0 30px -5px rgba(139, 92, 246, 0.2)" }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="lg:col-span-2 soft-glass rounded-3xl p-8 md:p-10 flex flex-col justify-between overflow-hidden group transition-all duration-300 min-h-[350px] cursor-pointer"
        >
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/50 border border-white/5 flex items-center justify-center text-zinc-300 mb-6 shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary-400" />
            </div>
            <Heading level="h3" className="text-xl text-white font-bold font-brutalist">
              Frictionless Authentication & Secure Entry
            </Heading>
            <Text variant="muted" className="text-zinc-400 leading-relaxed text-sm font-sans">
              Your data and attendee records are protected by enterprise-grade security protocols. Log in securely and transition smoothly between hosting and attending without hassle.
            </Text>
          </div>

          {/* Simulated Decodes security representation */}
          <div className="mt-8 bg-zinc-950 border border-zinc-850 rounded-2xl p-6 flex items-center justify-center relative overflow-hidden group/lock font-sans">
            <div className="absolute inset-0 bg-gradient-to-t from-primary-500/5 to-transparent pointer-events-none" />
            <div className="w-12 h-12 rounded-xl bg-primary-600/10 border border-primary-500/20 flex items-center justify-center text-primary-400 shadow-lg shadow-primary-500/5 group-hover/lock:scale-105 transition-transform duration-300">
              <ShieldCheck className="w-6 h-6 text-primary-400 animate-pulse" />
            </div>
            <div className="ml-4 text-left">
              <div className="text-xs font-semibold text-zinc-300">Enterprise-Grade Security</div>
              <div className="text-[10px] text-zinc-555 font-mono mt-0.5">Session Credentials Protected</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

