import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, CheckCircle, AlertTriangle, Play, HelpCircle } from 'lucide-react';
import axios from 'axios';

/**
 * TaskCard represents a single background job.
 * Executes intelligent exponential backoff polling against /api/v1/tasks/:id/status.
 */
function TaskCard({ task: initialTask, onTaskComplete }) {
  const [task, setTask] = useState(initialTask);
  const [pollInterval, setPollInterval] = useState(1000); // starts at 1s
  const lastProgressRef = useRef(initialTask.progress);

  useEffect(() => {
    if (task.status === 'completed' || task.status === 'failed') {
      return;
    }

    let timeoutId = null;

    const runPoll = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`/api/v1/tasks/${task.id}/status`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data && response.data.success) {
          const updatedTask = response.data.data;
          setTask(updatedTask);

          if (updatedTask.status === 'completed' || updatedTask.progress >= 100) {
            onTaskComplete(updatedTask.id);
            return;
          }

          // Exponential backoff logic
          if (updatedTask.progress === lastProgressRef.current) {
            // No progress update: back off exponentially (max 8 seconds)
            setPollInterval(prev => Math.min(prev * 1.5, 8000));
          } else {
            // Progress is active: reset to rapid 1s polling
            lastProgressRef.current = updatedTask.progress;
            setPollInterval(1000);
          }
        }
      } catch (err) {
        console.error(`[Task Status Poll] Failed to fetch task status for ${task.id}:`, err);
        // On error, also back off
        setPollInterval(prev => Math.min(prev * 1.8, 8000));
      }

      timeoutId = setTimeout(runPoll, pollInterval);
    };

    timeoutId = setTimeout(runPoll, pollInterval);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [task.id, task.status, pollInterval]);

  const isCompleted = task.status === 'completed';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`p-4 rounded-xl border transition-all duration-350 select-none relative overflow-hidden ${
        isCompleted
          ? 'border-emerald-500/20 bg-emerald-500/5 shadow-[0_4px_20px_rgba(16,185,129,0.02)]'
          : 'border-white/5 bg-zinc-900/40 hover:bg-zinc-900/60'
      }`}
    >
      {/* Visual background wash for completed state */}
      {isCompleted && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
      )}

      <div className="flex items-center justify-between mb-2">
        <span className="font-accent text-xs font-bold tracking-wider text-zinc-350 uppercase">
          {isCompleted ? 'OPERATION COMPLETE' : task.type}
        </span>
        {isCompleted ? (
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5 text-primary-400 animate-spin shrink-0" />
        )}
      </div>

      <p className="text-xs text-zinc-400 font-sans mb-3 line-clamp-1">
        {task.type === 'CSV LEDGER EXPORT' 
          ? 'Generating financial ledger summary sheets...' 
          : `Dispatching broadcast to selected cohorts...`}
      </p>

      {/* Dynamic Progress Track */}
      <div className="flex items-center gap-3">
        <div className="flex-grow h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isCompleted ? 'bg-emerald-500' : 'bg-primary-500'
            }`}
            style={{ width: `${task.progress}%` }}
          />
        </div>
        <span className="font-technical text-[10px] text-zinc-300 font-semibold w-8 text-right shrink-0">
          {task.progress}%
        </span>
      </div>
    </motion.div>
  );
}

/**
 * BackgroundOperationsLedger persistent flyout panel component.
 */
export default function BackgroundOperationsLedger({ isOpen, onClose, tasks = [], setTasks }) {
  
  const handleTaskComplete = (taskId) => {
    setTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, status: 'completed', progress: 100 } : t)
    );
  };

  // Sort tasks: active on top, completed/failed at bottom
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop mask */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-zinc-950/80 backdrop-blur-sm"
          />

          {/* Persistent Soft-Glass flyout panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-96 z-50 bg-zinc-950/85 backdrop-blur-2xl border-l border-white/5 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)]"
          >
            {/* Header */}
            <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-zinc-950/50">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                <h3 className="font-display font-bold text-sm text-zinc-100 tracking-wider uppercase">
                  Background Queue
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg border border-white/5 bg-zinc-900/30 text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tasks Ledger body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {sortedTasks.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-350 font-accent uppercase">
                    Queue is Idle
                  </h4>
                  <p className="text-xs text-zinc-500 max-w-[200px] mt-2 leading-relaxed">
                    No active or completed operations in cache history.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <AnimatePresence mode="popLayout">
                    {sortedTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onTaskComplete={handleTaskComplete}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-zinc-950/50 text-center shrink-0">
              <span className="text-[10px] text-zinc-500 font-mono">
                Queue Telemetry • Operational
              </span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
