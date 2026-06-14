import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from '../components/layout/NavBar.jsx';
import Hero from '../components/landing/Hero.jsx';
import BentoGrid from '../components/landing/BentoGrid.jsx';
import Heading from '../components/ui/Heading.jsx';
import Text from '../components/ui/Text.jsx';

/**
 * Public Landing Page of the Vora Platform.
 * Compiles the floating Soft-Glass NavBar, the typographic Hero section with background grid,
 * the asymmetric Bento Grid showcasing curriculum features, and a premium academic footer.
 */
export default function Landing() {
  return (
    <div className="relative min-h-screen bg-zinc-950 overflow-x-hidden flex flex-col justify-between text-white">
      
      {/* Floating Pill Navigation chassis */}
      <NavBar />

      <main className="flex-grow">
        {/* Immersive Typographic Hero section */}
        <Hero />

        {/* Mapped Bento Grid Features container */}
        <BentoGrid />
      </main>

      {/* Global Academic Footer */}
      <footer className="relative z-10 bg-zinc-950 border-t border-white/5 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          
          {/* Brand/Status Column */}
          <div className="flex flex-col space-y-4">
            <Link to="/" className="flex items-center select-none font-display font-extrabold text-2xl tracking-tighter text-white">
              vora
            </Link>
            <Text className="!text-xs !text-zinc-450 leading-relaxed max-w-xs">
              A premium virtual event management ecosystem designed to orchestrate memorable digital gatherings and webinars.
            </Text>
            <Text className="!text-[10px] !text-zinc-500 tracking-wider uppercase">
              © 2026 Vora. All rights reserved.
            </Text>
          </div>

          {/* Product Column */}
          <div className="flex flex-col space-y-4">
            <h4 className="font-brutalist uppercase tracking-[0.2em] text-xs text-zinc-500 text-left">
              Product
            </h4>
            <ul className="space-y-2.5 text-left">
              <li>
                <a href="#features">
                  <motion.span
                    className="inline-block font-clean-sans text-xs text-zinc-300 transition-colors cursor-pointer"
                    whileHover={{ x: 2, color: "#ffffff" }}
                    transition={{ type: "tween", duration: 0.15 }}
                  >
                    Features
                  </motion.span>
                </a>
              </li>
              <li>
                <Link to="/organizer">
                  <motion.span
                    className="inline-block font-clean-sans text-xs text-zinc-300 transition-colors cursor-pointer"
                    whileHover={{ x: 2, color: "#ffffff" }}
                    transition={{ type: "tween", duration: 0.15 }}
                  >
                    Organizer Dashboard
                  </motion.span>
                </Link>
              </li>
              <li>
                <Link to="/attendee">
                  <motion.span
                    className="inline-block font-clean-sans text-xs text-zinc-300 transition-colors cursor-pointer"
                    whileHover={{ x: 2, color: "#ffffff" }}
                    transition={{ type: "tween", duration: 0.15 }}
                  >
                    Attendee Hub
                  </motion.span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="flex flex-col space-y-4">
            <h4 className="font-brutalist uppercase tracking-[0.2em] text-xs text-zinc-500 text-left">
              Company
            </h4>
            <ul className="space-y-2.5 text-left">
              <li>
                <a href="#docs">
                  <motion.span
                    className="inline-block font-clean-sans text-xs text-zinc-300 transition-colors cursor-pointer"
                    whileHover={{ x: 2, color: "#ffffff" }}
                    transition={{ type: "tween", duration: 0.15 }}
                  >
                    Documentation
                  </motion.span>
                </a>
              </li>
              <li>
                <a href="#resources">
                  <motion.span
                    className="inline-block font-clean-sans text-xs text-zinc-300 transition-colors cursor-pointer"
                    whileHover={{ x: 2, color: "#ffffff" }}
                    transition={{ type: "tween", duration: 0.15 }}
                  >
                    Resources
                  </motion.span>
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="flex flex-col space-y-4">
            <h4 className="font-brutalist uppercase tracking-[0.2em] text-xs text-zinc-500 text-left">
              Legal
            </h4>
            <ul className="space-y-2.5 text-left">
              <li>
                <motion.span
                  className="inline-block font-clean-sans text-xs text-zinc-300 transition-colors cursor-pointer"
                  whileHover={{ x: 2, color: "#ffffff" }}
                  transition={{ type: "tween", duration: 0.15 }}
                >
                  Privacy Policy
                </motion.span>
              </li>
              <li>
                <motion.span
                  className="inline-block font-clean-sans text-xs text-zinc-300 transition-colors cursor-pointer"
                  whileHover={{ x: 2, color: "#ffffff" }}
                  transition={{ type: "tween", duration: 0.15 }}
                >
                  Terms of Service
                </motion.span>
              </li>
              <li>
                <motion.span
                  className="inline-block font-clean-sans text-xs text-zinc-300 transition-colors cursor-pointer"
                  whileHover={{ x: 2, color: "#ffffff" }}
                  transition={{ type: "tween", duration: 0.15 }}
                >
                  Security & Trust
                </motion.span>
              </li>
            </ul>
          </div>

        </div>
      </footer>

    </div>
  );
}
