import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import TopNav from '../components/TopNav.jsx';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useETagPolling from '../hooks/useETagPolling.js';
import BackgroundOperationsLedger from '../components/BackgroundOperationsLedger.jsx';

/**
 * Organizer Application Layout Shell.
 * Integrates Sidebar, TopNav, Mobile drawer state, and secures the viewports
 * using strict Zero-Trust session validation checks.
 */
const Organizer = () => {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Background tasks queue states
  const [tasks, setTasks] = useState([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  // Poll tasks endpoint using ETag-aware custom hook
  const { data: polledTasksData, refetch } = useETagPolling('/api/v1/tasks', 4000);

  useEffect(() => {
    if (polledTasksData && polledTasksData.success) {
      setTasks(polledTasksData.data);
    }
  }, [polledTasksData]);

  // Listen for manual queue refresh requests
  useEffect(() => {
    const handleRefresh = () => {
      refetch();
    };
    window.addEventListener('vora-refresh-tasks', handleRefresh);
    return () => window.removeEventListener('vora-refresh-tasks', handleRefresh);
  }, [refetch]);

  // 1. Zero-Trust Access Session Verification
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (user.role !== 'organizer') {
        navigate('/attendee');
      }
    }
  }, [user, authLoading, navigate]);

  // Prevent layout flashing during session check
  if (authLoading || !user || user.role !== 'organizer') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background-root text-zinc-400">
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Securing Dashboard Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white font-sans antialiased">
      
      {/* 1. Desktop Sidebar Navigation spine */}
      <Sidebar 
        logout={logout} 
        user={user} 
        className="hidden lg:flex" 
      />

      {/* 2. Mobile Drawer Navigation Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Frosted Backdrop Dismissal overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Sliding Drawer Container */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 max-w-xs bg-zinc-950/95 border-r border-white/5 backdrop-blur-md h-full flex flex-col z-50 p-4 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="text-[10px] font-semibold text-zinc-450 tracking-[0.2em] font-technical uppercase">WORKSPACE DRAWER</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900/50 transition-colors outline-none"
                  aria-label="Close drawer navigation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Embedded sidebar within mobile layout drawer */}
              <div className="flex-1 overflow-y-auto mt-4 -mx-4">
                <Sidebar 
                  logout={logout} 
                  user={user} 
                  className="w-full border-r-0 bg-transparent backdrop-blur-none" 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Main content column container */}
      <div className="flex flex-1 flex-col overflow-hidden bg-zinc-950">
        
        {/* Sticky top contextual header */}
        <TopNav 
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)} 
          user={user}
          tasks={tasks}
          onOpenQueue={() => setIsQueueOpen(true)}
        />

        {/* Scrollable page content dashboard area */}
        <main className="flex-grow overflow-y-auto focus:outline-none">
          <div className="py-8 px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>

      </div>

      {/* Global Background Operations Ledger Flyout */}
      <BackgroundOperationsLedger
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        tasks={tasks}
        setTasks={setTasks}
      />

    </div>
  );
};

export default Organizer;
