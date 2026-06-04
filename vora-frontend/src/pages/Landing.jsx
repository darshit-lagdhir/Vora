import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Calendar, Users, ArrowRight, Video, FileText } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col justify-between">
      {/* Header / Navigation Bar */}
      <header className="border-b border-brand-slate bg-brand-dark/95 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-accent-violet to-accent-blue flex items-center justify-center font-bold text-xl text-white shadow-md">
              V
            </div>
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">VORA</span>
          </div>
          <nav className="flex space-x-4">
            <Link to="/auth" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200">
              Sign In
            </Link>
            <Link to="/auth?mode=register" className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-accent-violet to-accent-blue text-white rounded-lg hover:opacity-90 shadow-md hover:scale-[1.02] transform transition duration-200">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-brand-slate/80 border border-brand-card text-xs text-slate-300 mb-8 animate-pulse">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success"></span>
          </span>
          <span>Next-Generation Virtual Hosting</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight mb-6">
          Orchestrate Immersive{' '}
          <span className="bg-gradient-to-r from-accent-violet via-fuchsia-400 to-accent-blue bg-clip-text text-transparent">
            Virtual Events
          </span>{' '}
          with Absolute Precision
        </h1>

        <p className="text-lg md:text-xl text-brand-muted max-w-2xl mb-10 leading-relaxed">
          Project Vora offers a robust, highly secure, and performance-tuned infrastructure for hosting web conferences, managing registrations, and sharing post-event resources.
        </p>

        {/* Action Triggers */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
          <Link 
            to="/auth" 
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-accent-violet to-accent-blue hover:from-accent-violetHover hover:to-accent-blueHover text-white font-semibold rounded-xl flex items-center justify-center space-x-2 transition duration-300 shadow-lg shadow-accent-violet/20 hover:scale-[1.03]"
          >
            <span>Enter Auth Gateway</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            to="/organizer" 
            className="w-full sm:w-auto px-8 py-4 bg-brand-slate border border-brand-card hover:bg-brand-card text-white font-semibold rounded-xl flex items-center justify-center space-x-2 transition duration-300 hover:scale-[1.03]"
          >
            <span>Organizer Console</span>
          </Link>
          <Link 
            to="/attendee" 
            className="w-full sm:w-auto px-8 py-4 bg-brand-slate border border-brand-card hover:bg-brand-card text-white font-semibold rounded-xl flex items-center justify-center space-x-2 transition duration-300 hover:scale-[1.03]"
          >
            <span>Attendee Portal</span>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl text-left">
          <div className="bg-brand-slate p-8 rounded-2xl border border-brand-card hover:border-accent-violet/50 transition duration-300">
            <div className="w-12 h-12 bg-accent-violet/10 text-accent-violet rounded-xl flex items-center justify-center mb-6">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Live Streaming & Scheduling</h3>
            <p className="text-brand-muted text-sm leading-relaxed">
              Schedule conferences and webinars seamlessly. Program multiple consecutive tracks and display speaker portfolios effortlessly.
            </p>
          </div>

          <div className="bg-brand-slate p-8 rounded-2xl border border-brand-card hover:border-accent-blue/50 transition duration-300">
            <div className="w-12 h-12 bg-accent-blue/10 text-accent-blue rounded-xl flex items-center justify-center mb-6">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Attendee Management</h3>
            <p className="text-brand-muted text-sm leading-relaxed">
              Robust registration dashboards, role verification hooks, and real-time attendance statistics for organizers.
            </p>
          </div>

          <div className="bg-brand-slate p-8 rounded-2xl border border-brand-card hover:border-status-success/50 transition duration-300">
            <div className="w-12 h-12 bg-status-success/10 text-status-success rounded-xl flex items-center justify-center mb-6">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Resource Sharing</h3>
            <p className="text-brand-muted text-sm leading-relaxed">
              Distribute presentation slides, reference materials, and recording links post-event within a secured access vault.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-slate bg-brand-dark/95 py-8 text-center text-xs text-brand-muted px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Project Vora Ecosystem. Designed for EDUPFSD072 Full Stack Development.</p>
          <div className="flex items-center space-x-2 text-slate-500">
            <Shield className="w-4 h-4 text-accent-blue" />
            <span>PostgreSQL Relational DB (Supabase) + Node ESM + React SPA</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
