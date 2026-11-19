import React from 'react';
import { motion } from 'framer-motion';

export const LoadingScreen: React.FC<{ message?: string }> = ({
  message = 'Entering your private room...',
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ad-bg text-ad-text p-6">
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative flex items-center justify-center"
      >
        <div className="w-24 h-24 rounded-full border border-ad-gold/30 bg-gradient-to-br from-ad-red/20 to-ad-burgundy/40 flex items-center justify-center shadow-2xl shadow-ad-red/40">
          <span className="text-4xl select-none">🌹</span>
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="font-display text-2xl font-bold tracking-[0.25em] text-ad-text mt-6 uppercase"
      >
        AFTERDARK
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-xs text-ad-text-secondary/70 mt-2 tracking-widest uppercase italic"
      >
        {message}
      </motion.p>
    </div>
  );
};
