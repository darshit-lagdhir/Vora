import React, { Component } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { captureFrontendError } from '../../services/telemetry.js';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false,
      recoveryAttempts: 0,
      lastAttemptTime: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught runtime exception:', error, errorInfo);
    try {
      captureFrontendError(error, errorInfo);
    } catch (telemetryErr) {
      console.error('[ErrorBoundary] Telemetry reporting failed:', telemetryErr);
    }
  }

  handleRecovery = () => {
    const now = Date.now();
    const isWithinWindow = now - this.state.lastAttemptTime < 10000; // 10s timeout window

    if (isWithinWindow && this.state.recoveryAttempts >= 1) {
      // Escalated Recovery: wipe corrupted sessions and flush storage caches
      console.warn('[ErrorBoundary] Escalating crash recovery. Wiping local sessions and redirecting...');
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (err) {
        console.error('[ErrorBoundary] Storage flush failed:', err);
      }
      window.location.href = '/';
    } else {
      // Soft State Reset: clear react boundaries and retry render
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false,
        recoveryAttempts: isWithinWindow ? prevState.recoveryAttempts + 1 : 1,
        lastAttemptTime: now
      }));
      
      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen min-h-screen bg-zinc-950 text-slate-100 flex flex-col justify-center items-center relative overflow-hidden select-none z-[9999] font-sans">
          
          {/* Subtle CSS-generated dot matrix background overlay for tactile texture */}
          <div 
            className="absolute inset-0 opacity-[0.02] pointer-events-none select-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }}
          />

          {/* Central Constraints Column */}
          <div className="max-w-xl w-full px-6 text-center space-y-8 z-10 relative flex flex-col items-center">
            
            {/* Visual isolated node SVG illustration */}
            <div className="w-16 h-16 rounded-full bg-primary-500/5 border border-primary-500/10 flex items-center justify-center text-primary-500/40 relative">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <line x1="3" y1="12" x2="21" y2="12" strokeDasharray="3 3" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full border border-primary-500/20 animate-ping opacity-30 pointer-events-none" />
            </div>

            {/* Typography failure header & subhead */}
            <div className="space-y-3">
              <h1 className="font-display font-extrabold text-white text-3xl sm:text-4xl tracking-tighter uppercase leading-none">
                System Interruption
              </h1>
              <p className="font-sans text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
                An unexpected anomaly occurred within the local runtime environment. The application core has safely isolated this process to prevent data corruption.
              </p>
            </div>

            {/* Collapsible Technical Logs section */}
            <div className="w-full space-y-3">
              <button
                id="btn-error-toggle-details"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="text-zinc-550 hover:text-zinc-400 transition-colors flex items-center justify-center space-x-1.5 mx-auto font-form text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                <span>{this.state.showDetails ? 'Hide technical logs' : 'Show technical logs'}</span>
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {this.state.showDetails && (
                <div 
                  className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4 text-left max-h-48 overflow-y-auto no-scrollbar font-technical select-text"
                  style={{ wordBreak: 'break-all' }}
                >
                  <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1.5">
                    {this.state.error ? this.state.error.toString() : 'Unknown Exception'}
                  </div>
                  <pre className="text-[9px] text-zinc-500 leading-relaxed font-technical whitespace-pre-wrap">
                    {this.state.errorInfo ? this.state.errorInfo.componentStack : 'No stack trace resolved.'}
                  </pre>
                </div>
              )}
            </div>

            {/* Action recovery matrix triggers */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm pt-2 select-none">
              
              {/* Dominant session recovery button */}
              <button
                id="btn-error-recovery"
                onClick={this.handleRecovery}
                className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-form text-xs font-bold uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.25)] hover:shadow-[0_0_30px_rgba(124,58,237,0.45)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2 cursor-pointer outline-none border-none"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                <span>
                  {this.state.recoveryAttempts >= 1 ? 'Force Interface Reload' : 'Attempt Session Recovery'}
                </span>
              </button>

            </div>

          </div>

        </div>
      );
    }

    return this.props.children;
  }
}
