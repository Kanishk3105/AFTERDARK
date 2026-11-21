import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAppStore } from '@/stores/app.store';
import { APP_CONFIG } from '@/config/app.config';
import { AFTERDARK_ASSETS } from '@/assets/afterdark';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export const SplashPage: React.FC = () => {
  const navigate = useNavigate();
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);
  const ageAcknowledged = useAppStore((s) => s.ageAcknowledged);
  const setAgeAcknowledged = useAppStore((s) => s.setAgeAcknowledged);
  const reduceMotion = useReducedMotion();

  const [showAgeModal, setShowAgeModal] = useState(false);
  const [confirmed18, setConfirmed18] = useState(false);

  const handleEnter = () => {
    if (!ageAcknowledged) {
      setShowAgeModal(true);
      return;
    }
    proceed();
  };

  const handleAgeConfirm = () => {
    if (!confirmed18) return;
    setAgeAcknowledged(true);
    setShowAgeModal(false);
    proceed();
  };

  const proceed = () => {
    if (hasCompletedOnboarding) {
      navigate('/home');
    } else {
      navigate('/onboarding');
    }
  };

  return (
    <div className="relative min-h-screen bg-ad-bg flex flex-col justify-between items-center text-center p-6 overflow-hidden select-none">
      <img
        src={AFTERDARK_ASSETS.brand.splash}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center opacity-55"
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
      {/* Background Cinematic Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-ad-burgundy/40 via-ad-bg to-ad-bg pointer-events-none" />

      {/* Subtle Floating Ambient Lights */}
      <motion.div
        animate={reduceMotion ? undefined : {
          scale: [1, 1.25, 1],
          opacity: [0.15, 0.35, 0.15],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-ad-red/20 blur-3xl pointer-events-none"
      />
      <motion.div
        animate={reduceMotion ? undefined : {
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.25, 0.1],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-ad-gold/15 blur-3xl pointer-events-none"
      />

      {/* Top Header Tag */}
      <div className="z-10 pt-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.8 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ad-gold/25 bg-ad-bg-secondary/60 text-[11px] font-medium tracking-widest uppercase text-ad-gold"
        >
          <span>✦</span>
          <span>PRIVATE COUPLES ROOM</span>
          <span>✦</span>
        </motion.div>
      </div>

      {/* Center Cinematic Logo & Tagline */}
      <div className="z-10 flex flex-col items-center max-w-sm">
        {/* Emblem */}
        <motion.div
          initial={reduceMotion ? false : { scale: 0.8, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: reduceMotion ? 0 : 1.2, type: 'spring' }}
          className="relative mb-6"
        >
          <img
            src={AFTERDARK_ASSETS.brand.emblem}
            alt=""
            aria-hidden="true"
            className="h-24 w-36 rounded-xl border border-ad-gold/40 object-cover shadow-2xl shadow-ad-red/40"
            loading="eager"
            decoding="async"
          />
          <div className={`absolute inset-0 rounded-xl border border-ad-gold/20 opacity-30 ${reduceMotion ? '' : 'animate-ping'}`} />
        </motion.div>

        {/* Brand Name */}
        <motion.h1
          initial={reduceMotion ? false : { opacity: 0, letterSpacing: '0.4em' }}
          animate={{ opacity: 1, letterSpacing: '0.25em' }}
          transition={{ duration: reduceMotion ? 0 : 1.2, delay: reduceMotion ? 0 : 0.2 }}
          className="font-display text-4xl sm:text-5xl font-extrabold text-gradient-gold text-shadow-glow tracking-[0.25em] uppercase mb-4"
        >
          {APP_CONFIG.name}
        </motion.h1>

        {/* Divider line */}
        <motion.div
          initial={reduceMotion ? false : { width: 0 }}
          animate={{ width: 64 }}
          transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.6 }}
          className="h-[1.5px] bg-gradient-to-r from-transparent via-ad-gold/60 to-transparent mb-5"
        />

        {/* Tagline */}
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.7 }}
          className="font-display italic text-lg sm:text-xl text-ad-text mb-3"
        >
          "Some moments are just for two."
        </motion.p>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.9 }}
          className="text-xs text-ad-text-secondary tracking-wider uppercase font-light"
        >
          {APP_CONFIG.tagline}
        </motion.p>
      </div>

      {/* Bottom CTA */}
      <div className="z-10 w-full max-w-xs pb-10 space-y-4">
        <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 1 }}
        >
          <Button
            size="lg"
            fullWidth
            onClick={handleEnter}
            className="shadow-2xl shadow-ad-red/50 text-base tracking-wider uppercase font-display"
          >
            {hasCompletedOnboarding ? 'ENTER YOUR ROOM' : 'ENTER YOUR ROOM'}
          </Button>
        </motion.div>

        <p className="text-[11px] text-ad-text-secondary/60 tracking-wider">
          18+ ONLY · NO PUBLIC PROFILES · CONSENT FIRST
        </p>
      </div>

      {/* Age Verification Modal */}
      <Modal
        isOpen={showAgeModal}
        onClose={() => setShowAgeModal(false)}
        title="18+ Adult Gate Verification"
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-ad-text-secondary leading-relaxed">
            AFTERDARK is exclusively crafted for consenting adults aged 18 and older. It contains mature romantic, intimate, and adult themes.
          </p>

          <label className="flex items-start gap-3 p-3 rounded-xl bg-ad-bg-secondary/70 border border-ad-burgundy/40 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed18}
              onChange={(e) => setConfirmed18(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-ad-gold/40 text-ad-red focus:ring-ad-red bg-ad-bg"
            />
            <span className="text-xs text-ad-text font-medium leading-tight">
              I am at least 18 years of age and intend to use this private application with my consenting partner.
            </span>
          </label>

          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAgeModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!confirmed18}
              onClick={handleAgeConfirm}
              className="flex-1"
            >
              Confirm & Enter
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
