import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Play, ExternalLink } from 'lucide-react';
import ProgressiveImage from './ui/ProgressiveImage.jsx';

/**
 * BentoMediaProxy extracts and visualizes external URLs (YouTube, Drive, PDFs).
 * Integrates procedural mesh gradients and metadata scraper simulations.
 */
export default function BentoMediaProxy({ url, title: initialTitle, mimeType, className = '' }) {
  const [mediaInfo, setMediaInfo] = useState({
    type: 'generic',
    videoId: '',
    thumbnail: '',
    title: initialTitle || 'External Resource',
    description: 'Shared URL resource linked to the event.',
  });

  useEffect(() => {
    if (!url) return;

    // 1. YouTube link parsing
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(ytRegex);

    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      setMediaInfo({
        type: 'youtube',
        videoId,
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        title: initialTitle || 'Video Broadcast Recording',
        description: 'External video stream from YouTube.',
      });
      return;
    }

    // 2. Google Drive / PDF / Generic documents parsing
    const isDrive = url.includes('drive.google.com');
    const isPdf = url.toLowerCase().endsWith('.pdf') || (mimeType && mimeType.includes('pdf'));

    if (isDrive || isPdf) {
      setMediaInfo({
        type: 'document',
        videoId: '',
        thumbnail: '',
        title: initialTitle || (isPdf ? 'PDF Documentation' : 'Google Drive Workspace'),
        description: isPdf
          ? 'Secure external PDF file linked for session guidelines.'
          : 'Google Drive shared workspace folder.',
      });
      return;
    }

    // 3. Generic website parsing (scraping title/domain)
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      setMediaInfo({
        type: 'generic',
        videoId: '',
        thumbnail: '',
        title: initialTitle || `Resources on ${hostname}`,
        description: `External reference material hosted at ${hostname}`,
      });
    } catch {
      setMediaInfo({
        type: 'generic',
        videoId: '',
        thumbnail: '',
        title: initialTitle || 'Web Reference',
        description: 'Resource links mapping to external platforms.',
      });
    }
  }, [url, initialTitle, mimeType]);

  const handleOpen = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (mediaInfo.type === 'youtube') {
    return (
      <div 
        onClick={handleOpen}
        className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 cursor-pointer shadow-soft hover:border-primary-500/30 transition-all duration-300 flex flex-col ${className}`}
      >
        {/* Aspect Ratio Lock for Video Thumbnail */}
        <div className="relative w-full aspect-video overflow-hidden">
          <ProgressiveImage 
            src={mediaInfo.thumbnail}
            alt={mediaInfo.title}
            aspectClass="aspect-video"
            fallbackType="banner"
          />
          {/* Semi-transparent dark overlay */}
          <div className="absolute inset-0 bg-zinc-950/40 group-hover:bg-zinc-950/20 transition-colors duration-300" />
          
          {/* Glowing Play Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              whileHover={{ scale: 1.15 }}
              className="w-10 h-10 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-glow shadow-primary-500/20"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </motion.div>
          </div>
        </div>

        {/* Video metadata row */}
        <div className="p-4 flex-grow flex flex-col justify-between">
          <div>
            <span className="text-[10px] tracking-widest font-accent font-bold text-primary-400 uppercase">
              VIDEO RECORDING
            </span>
            <h4 className="text-sm font-semibold text-zinc-100 font-display mt-1 tracking-tight truncate line-clamp-1">
              {mediaInfo.title}
            </h4>
          </div>
          <p className="text-xs text-zinc-400 font-sans mt-2 line-clamp-2 leading-relaxed">
            {mediaInfo.description}
          </p>
        </div>
      </div>
    );
  }

  // Google Drive/PDF Mesh Gradient Bento Card
  return (
    <div 
      onClick={handleOpen}
      className={`group relative overflow-hidden rounded-2xl border border-white/5 cursor-pointer shadow-soft hover:border-primary-500/30 transition-all duration-300 flex flex-col min-h-[160px] ${className}`}
      style={{
        backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.12) 0%, transparent 60%), radial-gradient(circle at 90% 80%, rgba(24, 24, 27, 0.9) 0%, #09090b 100%)',
        backgroundColor: '#09090b'
      }}
    >
      <div className="p-5 flex-grow flex flex-col justify-between relative z-10">
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-primary-400 group-hover:text-primary-300 transition-colors">
            <FileText className="w-5 h-5" />
          </div>
          <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        </div>

        <div className="mt-6">
          <span className="text-[9px] tracking-widest font-accent font-bold text-zinc-450 uppercase">
            {mediaInfo.type === 'document' ? 'EXTERNAL DOCUMENT' : 'LINKED REFERENCE'}
          </span>
          <h4 className="text-sm font-semibold text-zinc-100 font-display mt-1 tracking-tight truncate line-clamp-1">
            {mediaInfo.title}
          </h4>
          <p className="text-xs text-zinc-400 font-sans mt-2 line-clamp-2 leading-relaxed">
            {mediaInfo.description}
          </p>
        </div>
      </div>
    </div>
  );
}
