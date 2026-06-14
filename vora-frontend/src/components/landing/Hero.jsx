import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import Heading from '../ui/Heading.jsx';
import Text from '../ui/Text.jsx';

/**
 * Hero viewport panel incorporating the Satoshi/Clash Display font layout overrides.
 * Renders staggered load reveals and high-end blueprint CSS grids.
 */
export default function Hero() {
  
  // Framer Motion Animation Variants
  const badgeVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut", delay: 0.05 } }
  };

  const titleVariants = {
    hidden: { opacity: 0, y: 24 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: 'spring', 
        damping: 24, 
        stiffness: 180, 
        delay: 0.15 
      } 
    }
  };

  const textVariants = {
    hidden: { opacity: 0 },
    show: { 
      opacity: 1, 
      transition: { 
        duration: 0.5, 
        delay: 0.25 
      } 
    }
  };

  const ctaVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { 
      opacity: 1, 
      scale: 1, 
      transition: { 
        type: 'spring', 
        damping: 20, 
        stiffness: 220, 
        delay: 0.35 
      } 
    }
  };

  return (
    <section 
      className="relative min-h-[95dvh] flex flex-col items-center justify-center pt-32 pb-20 px-4 text-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black"
    >
      
      {/* Background vignette glow mask */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/20 to-zinc-950 pointer-events-none" />
 
      {/* Main staggered text matrix */}
      <div className="max-w-5xl mx-auto flex flex-col items-center relative z-10 w-full">
        
        {/* Micro status indicator badge */}
        <motion.div 
          variants={badgeVariants}
          initial="hidden"
          animate="show"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/5 bg-zinc-900/40 backdrop-blur-sm mb-8 select-none"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
          </span>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] font-sans">
            Next-Generation Virtual Infrastructure
          </span>
        </motion.div>
 
        {/* Master H1 Display Headline */}
        <motion.div 
          variants={titleVariants}
          initial="hidden"
          animate="show"
          className="w-full"
        >
          <Heading level="h1" className="text-6xl sm:text-7xl md:text-8xl lg:text-[7rem] font-bold tracking-tighter leading-none text-white font-display select-none">
            Host gatherings <br />
            <span className="text-primary-500">beautifully.</span>
          </Heading>
        </motion.div>
  
        {/* Satoshi Sub-description */}
        <motion.div 
          variants={textVariants}
          initial="hidden"
          animate="show"
          className="w-full"
        >
          <Text variant="default" className="mt-8 text-base md:text-lg text-zinc-450 max-w-xl mx-auto leading-relaxed font-sans tracking-wide">
            Bring your audience together in a serene, meticulously crafted environment. Vora handles the details seamlessly, allowing you to focus on hosting memorable presentations while your guests enjoy frictionless entry and secure, elegant access.
          </Text>
        </motion.div>
  
        {/* Call to action action row buttons */}
        <motion.div 
          variants={ctaVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 select-none w-full sm:w-auto"
        >
          <Link to="/auth?mode=register" className="w-full sm:w-auto">
            <motion.button
              type="button" 
              whileTap={{ scale: 0.98 }}
              className="group w-full sm:w-auto bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold font-brutalist uppercase tracking-wider px-5 py-2.5 rounded-full flex items-center justify-center gap-2 transition-all neon-diffuse cursor-pointer outline-none border-none"
            >
              <span>START BUILDING FREE</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 shrink-0 text-zinc-950" />
            </motion.button>
          </Link>
          
          <Link to="/organizer" className="w-full sm:w-auto">
            <motion.button
              type="button" 
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto bg-transparent border border-zinc-855 hover:border-zinc-750 text-zinc-400 hover:text-white hover:bg-zinc-900/40 text-xs font-semibold font-sans px-5 py-2.5 rounded-full transition-colors cursor-pointer outline-none"
            >
              Organizer Dashboard
            </motion.button>
          </Link>
        </motion.div>
 
      </div>

      {/* Decorative light grid anchors */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />

    </section>
  );
}
