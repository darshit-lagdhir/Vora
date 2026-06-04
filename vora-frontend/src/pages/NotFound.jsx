import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center px-6 relative overflow-hidden">
      {/* Background glow circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-status-danger/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="text-center z-10 max-w-md">
        {/* Animated Icon */}
        <div className="w-20 h-20 bg-status-danger/10 text-status-danger rounded-full flex items-center justify-center mx-auto mb-8 border border-status-danger/20 animate-bounce">
          <HelpCircle className="w-10 h-10" />
        </div>

        {/* Error Code */}
        <span className="text-sm font-bold tracking-widest text-status-danger uppercase">Error Code: 404</span>
        
        {/* Error Messaging */}
        <h1 className="text-4xl font-extrabold text-white mt-4 mb-3">Resource Not Found</h1>
        <p className="text-brand-muted text-sm leading-relaxed mb-10">
          The requested browser uniform resource locator address does not map to any active pages or layouts in the Project Vora registry.
        </p>

        {/* Action Triggers */}
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link 
            to="/" 
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-brand-slate hover:bg-brand-card text-white font-semibold rounded-xl border border-brand-card transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </Link>
          <Link 
            to="/" 
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-accent-violet to-accent-blue text-white font-semibold rounded-xl transition duration-200 shadow-lg shadow-accent-violet/10"
          >
            <Home className="w-4 h-4" />
            <span>Return to Landing</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
