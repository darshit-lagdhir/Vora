import React from 'react';

// Reusable basic loading pulse block
export default function Skeleton({ className = '', ...props }) {
  return (
    <div 
      className={`bg-zinc-800/80 rounded animate-pulse ${className}`} 
      {...props} 
    />
  );
}

// 5-row structured table loading pulse skeleton
export function TableSkeleton({ cols = 4, rows = 5 }) {
  return (
    <div className="w-full border border-white/5 rounded-2xl overflow-hidden bg-zinc-900/10 backdrop-blur-md select-none">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 bg-zinc-900/50">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="p-4">
                <Skeleton className="h-4 w-20 bg-zinc-800" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx} className="border-b border-white/5 last:border-none">
              {Array.from({ length: cols }).map((_, cIdx) => (
                <td key={cIdx} className="p-4">
                  <Skeleton className={`h-4 bg-zinc-850 ${
                    cIdx === 0 ? 'w-32' : cIdx === 1 ? 'w-24' : cIdx === 2 ? 'w-16' : 'w-28'
                  }`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Event ticket block loading pulse skeleton
export function CardSkeleton() {
  return (
    <div className="bg-zinc-900/40 border border-white/10 rounded-[2rem] overflow-hidden flex flex-col h-[280px] p-6 justify-between animate-pulse">
      <div className="space-y-4">
        <Skeleton className="h-4 bg-zinc-800 rounded w-1/4" />
        <Skeleton className="h-8 bg-zinc-800 rounded w-3/4" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 bg-zinc-850 rounded w-2/3" />
        <Skeleton className="h-4 bg-zinc-850 rounded w-1/2" />
      </div>
      <Skeleton className="h-10 bg-zinc-800 rounded w-full mt-4" />
    </div>
  );
}

// ─── HIGH-FIDELITY DISCOVERY LISTING SKELETON ──────────────────────────
export function DiscoverySkeleton() {
  return (
    <div className="space-y-8 animate-pulse text-left py-6 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="h-12 bg-zinc-900/50 border border-white/5 rounded-full w-full max-w-2xl flex items-center px-4">
          <Skeleton className="h-4 w-4 bg-zinc-800 rounded-full" />
          <Skeleton className="h-3 bg-zinc-800 rounded w-48 ml-3" />
        </div>
        <Skeleton className="h-4 bg-zinc-900 rounded w-36" />
      </div>
      
      <div className="flex items-center space-x-3 overflow-x-auto pb-1.5 border-t border-white/5 pt-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 bg-zinc-900/50 rounded-full w-24 border border-white/5" />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[420px]">
            <div className="w-full aspect-[16/9] bg-zinc-850/40 border-b border-zinc-900" />
            <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <Skeleton className="h-3 w-1/3 bg-zinc-850/40 rounded-full" />
                <Skeleton className="h-5 w-5/6 bg-zinc-850/40 rounded-full" />
                <Skeleton className="h-3 w-full bg-zinc-850/40 rounded-lg mt-3" />
              </div>
              <Skeleton className="h-9 w-full bg-zinc-850/40 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── HIGH-FIDELITY DASHBOARD CHASSIS SKELETON ──────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse text-left py-6 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl space-y-3">
            <Skeleton className="h-3 bg-zinc-800 rounded w-1/3" />
            <Skeleton className="h-8 bg-zinc-800 rounded w-2/3" />
          </div>
        ))}
      </div>
      
      <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 h-[320px] flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 bg-zinc-800 rounded w-1/4" />
          <div className="flex gap-2">
            <Skeleton className="h-8 bg-zinc-800 rounded w-16" />
            <Skeleton className="h-8 bg-zinc-800 rounded w-16" />
          </div>
        </div>
        <div className="flex-1 flex items-end gap-3 pt-6 px-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="bg-zinc-850 rounded-t w-full" style={{ height: `${20 + Math.random() * 60}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── HIGH-FIDELITY EVENT DETAIL SKELETON ──────────────────────────────
export function EventDetailSkeleton() {
  return (
    <div className="space-y-8 animate-pulse text-left py-6 w-full max-w-7xl mx-auto">
      <div className="h-[45vh] bg-zinc-900/40 border border-white/5 rounded-3xl relative overflow-hidden flex items-end p-8">
        <div className="space-y-3 w-2/3">
          <Skeleton className="h-4 bg-zinc-800 rounded w-24" />
          <Skeleton className="h-12 bg-zinc-800 rounded-2xl w-3/4" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 w-full">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-4">
            <Skeleton className="h-6 bg-zinc-800 rounded w-48" />
            <Skeleton className="h-4 bg-zinc-800 rounded w-full" />
            <Skeleton className="h-4 bg-zinc-800 rounded w-[90%]" />
            <Skeleton className="h-4 bg-zinc-800 rounded w-2/3" />
          </div>
        </div>
        <div className="lg:col-span-4">
          <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-6">
            <Skeleton className="h-4 bg-zinc-800 rounded w-1/3" />
            <div className="h-10 bg-zinc-950/50 border border-white/5 rounded-xl flex items-center justify-between px-4">
              <Skeleton className="h-4 bg-zinc-800 rounded w-12" />
              <Skeleton className="h-4 bg-zinc-800 rounded w-12" />
            </div>
            <Skeleton className="h-12 bg-zinc-800 rounded-2xl w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GENERAL FORM/BENTO GRID SKELETON ──────────────────────────────────
export function GeneralPageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse text-left py-6 w-full">
      <div className="space-y-2">
        <Skeleton className="h-8 bg-zinc-800 rounded w-48" />
        <Skeleton className="h-4 bg-zinc-850 rounded w-72" />
      </div>
      <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 h-[250px] space-y-4">
        <Skeleton className="h-4 bg-zinc-800 rounded w-32" />
        <Skeleton className="h-4 bg-zinc-800 rounded w-full" />
        <Skeleton className="h-4 bg-zinc-800 rounded w-[95%]" />
        <Skeleton className="h-4 bg-zinc-800 rounded w-3/4" />
      </div>
    </div>
  );
}
