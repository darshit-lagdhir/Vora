import React from 'react';
import { motion } from 'framer-motion';

/**
 * PageWrapper wraps top-level routing page leaf elements in an animated viewport transition.
 * Utilizes a custom premium easing curve [0.22, 1, 0.36, 1] to crossfade and glide y-offset 
 * content mathematically, conforming to the "5/10 Awwwards" interaction specification.
 */
export default function PageWrapper({ children }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="w-full flex-grow flex flex-col"
    >
      {children}
    </motion.main>
  );
}
