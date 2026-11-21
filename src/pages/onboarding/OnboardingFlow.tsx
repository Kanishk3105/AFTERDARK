import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useAppStore } from '@/stores/app.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';
import {
  createInvitationCode,
  createRoomCode,
  createRoomId,
  inviteLink,
  encodeInvite,
} from '@/services/pairing';
import { noteRoomCreated } from '@/games/awards';
import { CoupleConfig, IntensityLevel } from '@/types';
import { createRemoteRoom } from '@/services/sync';
import { registerStoredPushToken } from '@/services/notifications';
import { AFTERDARK_ASSETS } from '@/assets/afterdark';

export const OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const playerName = useAppStore((s) => s.playerName);
  const partnerName = useAppStore((s) => s.partnerName);
  const preferences = useAppStore((s) => s.preferences);
  const roomCode = useAppStore((s) => s.roomCode);

  const setPlayerName = useAppStore((s) => s.setPlayerName);
  const setPartnerName = useAppStore((s) => s.setPartnerName);
  const updatePreferences = useAppStore((s) => s.updatePreferences);
  const ensureDeviceId = useAppStore((s) => s.ensureDeviceId);
  const setRoomId = useAppStore((s) => s.setRoomId);
  const setInvite = useAppStore((s) => s.setInvite);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0); // 0 to 5
  const totalSteps = 6;

  // Local state for setup
  const [nick, setNick] = useState(playerName || '');
  const [partnerNick, setPartnerNick] = useState(partnerName || '');
  const [config, setConfig] = useState<CoupleConfig>(preferences.coupleConfig || 'mf');
  const [intensity, setIntensity] = useState<IntensityLevel>(preferences.intensity || 'spicy');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    preferences.interests || ['Romance', 'Deep Questions', 'Challenges']
  );
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState('');
  const [isGeneratingRoom, setIsGeneratingRoom] = useState(false);

  const availableInterests = [
    'Romance & Affection',
    'Deep Questions',
    'Playful Challenges',
    'Intimate Desires',
    'Sensual Exploration',
    'Fantasy Scenarios',
    'Memory Lane',
  ];

  const handleNextFromIdentity = () => {
    if (!nick.trim()) {
      showToast('Please enter your nickname', 'warning');
      return;
    }
    setPlayerName(nick.trim());
    setStep(1);
  };

  const handleNextFromPartner = () => {
    if (!partnerNick.trim()) {
      showToast("Please enter your partner's nickname", 'warning');
      return;
    }
    setPartnerName(partnerNick.trim());
    setStep(2);
  };

  const handleNextFromPreferences = async () => {
    updatePreferences({
      coupleConfig: config,
      intensity,
      interests: selectedInterests,
    });

    // Step 3: generate private room
    setIsGeneratingRoom(true);
    setStep(3);

    try {
      ensureDeviceId();
      const code = createRoomCode(6);
      const invitationCode = createInvitationCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
      const remoteRoomId = await createRemoteRoom(code, invitationCode, expiresAt);
      const newRoomId = remoteRoomId ?? createRoomId();

      setRoomId(newRoomId, code);
      void registerStoredPushToken().catch((error: unknown) => {
        console.error('Push token registration after room creation failed', error);
      });
      setInvite(code, expiresAt);
      noteRoomCreated();

      if (remoteRoomId) {
        const token = encodeInvite({
          v: 2,
          code: invitationCode,
          roomCode: code,
          exp: Date.parse(expiresAt),
        });
        setGeneratedInviteUrl(inviteLink(token, Capacitor.isNativePlatform()));
      } else {
        setGeneratedInviteUrl('');
        showToast('Online pairing requires a configured Supabase project.', 'warning');
      }
    } catch (err) {
      console.error('Room generation error', err);
      showToast('Could not create a remote invitation. The room remains local.', 'warning');
    } finally {
      setIsGeneratingRoom(false);
    }
  };

  const copyInvite = () => {
    if (navigator.clipboard && generatedInviteUrl) {
      navigator.clipboard.writeText(generatedInviteUrl);
      showToast('Invitation link copied to clipboard', 'success');
    } else {
      showToast('Online pairing is unavailable until Supabase is configured.', 'warning');
    }
  };

  const shareWhatsApp = () => {
    if (!generatedInviteUrl) {
      showToast('Online pairing is unavailable until Supabase is configured.', 'warning');
      return;
    }
    const text = encodeURIComponent(
      `Join me in our AFTERDARK room. Tap this single-use invitation to pair: ${generatedInviteUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const finishOnboarding = () => {
    completeOnboarding();
    showToast('Welcome to AFTERDARK', 'success');
    navigate('/home');
  };

  const toggleInterest = (item: string) => {
    if (selectedInterests.includes(item)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== item));
    } else {
      setSelectedInterests([...selectedInterests, item]);
    }
  };

  return (
    <div className="min-h-screen bg-ad-bg text-ad-text flex flex-col justify-between p-6 max-w-md mx-auto relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-ad-burgundy/25 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Step Indicator */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <span className="font-display tracking-[0.2em] text-xs font-bold text-ad-gold uppercase">
            AFTERDARK ONBOARDING
          </span>
          <span className="text-xs text-ad-text-secondary font-mono">
            STEP {step + 1} OF {totalSteps}
          </span>
        </div>
        <div className="relative">
          <img
            src={AFTERDARK_ASSETS.ui.progressTrack}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full rounded-full object-cover opacity-[0.12]"
            loading="lazy"
            decoding="async"
          />
          <ProgressBar value={((step + 1) / totalSteps) * 100} size="sm" />
        </div>
      </div>

      {/* Main Step Content Carousel */}
      <div className="flex-1 flex flex-col justify-center py-6">
        <img
          key={step}
          src={AFTERDARK_ASSETS.onboarding[step]}
          alt=""
          aria-hidden="true"
          className="mb-5 h-32 w-full rounded-2xl border border-ad-gold/20 object-cover shadow-lg shadow-ad-red/10"
          loading={step === 0 ? 'eager' : 'lazy'}
          decoding="async"
        />
        <AnimatePresence mode="wait">
          {/* STEP 0: Your Identity */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-3xl select-none">🌹</span>
                <h2 className="font-display text-2xl font-bold text-ad-text">
                  What should we call you?
                </h2>
                <p className="text-xs text-ad-text-secondary leading-relaxed">
                  Choose a private nickname for this room. No real name, phone number, or email required.
                </p>
              </div>

              <Input
                label="Your Nickname"
                placeholder="e.g. Alex, Darling, Shadow..."
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleNextFromIdentity()}
              />
            </motion.div>
          )}

          {/* STEP 1: Partner Identity */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="text-3xl select-none">💞</span>
                <h2 className="font-display text-2xl font-bold text-ad-text">
                  What should we call your partner?
                </h2>
                <p className="text-xs text-ad-text-secondary leading-relaxed">
                  How your partner will be addressed during games, predictions, and challenges.
                </p>
              </div>

              <Input
                label="Partner Nickname"
                placeholder="e.g. Sam, Babe, Siren..."
                value={partnerNick}
                onChange={(e) => setPartnerNick(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleNextFromPartner()}
              />
            </motion.div>
          )}

          {/* STEP 2: Couple Preferences */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5 overflow-y-auto max-h-[60vh] pr-1"
            >
              <div>
                <h2 className="font-display text-xl font-bold text-ad-text">
                  Room Preferences
                </h2>
                <p className="text-xs text-ad-text-secondary">
                  Tailor your private experience together.
                </p>
              </div>

              {/* Couple configuration */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-medium text-ad-text-secondary uppercase tracking-wider">
                  Couple Dynamic
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'mf', label: 'M & F' },
                    { id: 'mm', label: 'M & M' },
                    { id: 'ff', label: 'F & F' },
                    { id: 'other', label: 'Other' },
                  ].map((dyn) => (
                    <button
                      key={dyn.id}
                      type="button"
                      onClick={() => setConfig(dyn.id as CoupleConfig)}
                      className={`py-2 text-xs rounded-xl border transition-all ${
                        config === dyn.id
                          ? 'border-ad-gold bg-ad-red/20 text-ad-gold font-bold shadow-md shadow-ad-red/20'
                          : 'border-ad-burgundy/40 bg-ad-bg-secondary/40 text-ad-text-secondary'
                      }`}
                    >
                      {dyn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Intensity */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-medium text-ad-text-secondary uppercase tracking-wider">
                  Content Intensity
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'mild', label: 'Mild 🌿', desc: 'Gentle & conversational' },
                    { id: 'moderate', label: 'Moderate 🌹', desc: 'Warm & flirtatious' },
                    { id: 'spicy', label: 'Spicy 🔥', desc: 'Bold & sensual' },
                    { id: 'extreme', label: 'Extreme 😈', desc: 'Unfiltered adventure' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setIntensity(lvl.id as IntensityLevel)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        intensity === lvl.id
                          ? 'border-ad-gold bg-ad-burgundy/40 text-ad-gold shadow-md'
                          : 'border-ad-burgundy/30 bg-ad-bg-secondary/30 text-ad-text-secondary'
                      }`}
                    >
                      <div className="text-xs font-semibold text-ad-text">{lvl.label}</div>
                      <div className="text-[10px] text-ad-text-secondary/70">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-medium text-ad-text-secondary uppercase tracking-wider">
                  Preferred Themes
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableInterests.map((interest) => {
                    const isSelected = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          isSelected
                            ? 'border-ad-gold/60 bg-ad-gold/15 text-ad-gold font-medium'
                            : 'border-ad-burgundy/30 bg-ad-bg-secondary/40 text-ad-text-secondary/70'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Private Room Creation */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 text-center"
            >
              <div className="space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full border border-ad-gold/40 bg-ad-burgundy/40 flex items-center justify-center shadow-lg shadow-ad-red/20">
                  <span className="text-3xl select-none">🗝️</span>
                </div>
                <h2 className="font-display text-2xl font-bold text-ad-text">
                  Your Room is Ready
                </h2>
                <p className="text-xs text-ad-text-secondary max-w-xs mx-auto">
                  A private room configured for {nick} & {partnerNick}. Online pairing requires the configured Supabase service.
                </p>
              </div>

              <Card variant="glass" className="space-y-3 border-ad-gold/30">
                <div className="text-[11px] text-ad-text-secondary uppercase tracking-widest">
                  PAIRING CODE
                </div>
                <div className="font-mono text-3xl font-extrabold tracking-[0.3em] text-ad-gold select-all">
                  {roomCode || 'AD6X9Y'}
                </div>
                <div className="text-[10px] text-ad-text-secondary/70">
                  Room code · Invitations are single-use and expire after 24 hours
                </div>
              </Card>
            </motion.div>
          )}

          {/* STEP 4: Invite Partner */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5 text-center"
            >
              <div className="space-y-1">
                <h2 className="font-display text-xl font-bold text-ad-text">
                  Invite {partnerNick}
                </h2>
                <p className="text-xs text-ad-text-secondary">
                  Share this invite so your partner can pair instantly.
                </p>
              </div>

              {/* QR Code Container */}
              {generatedInviteUrl ? (
                <div className="p-4 rounded-2xl bg-white/95 inline-block shadow-2xl border-4 border-ad-burgundy/50 mx-auto">
                  <QRCodeSVG
                    value={generatedInviteUrl}
                    size={150}
                    bgColor="#ffffff"
                    fgColor="#0B0508"
                    level="M"
                  />
                </div>
              ) : (
                <p className="text-xs text-ad-text-secondary">
                  Remote pairing is unavailable until Supabase is configured.
                </p>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button variant="secondary" size="sm" onClick={copyInvite}>
                  📋 Copy Link
                </Button>
                <Button variant="primary" size="sm" onClick={shareWhatsApp}>
                  💬 WhatsApp
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Verification & Ready */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 text-center"
            >
              <div className="w-20 h-20 mx-auto rounded-full border-2 border-ad-gold/50 bg-gradient-to-br from-ad-burgundy to-ad-red/40 flex items-center justify-center shadow-xl shadow-ad-red/30">
                <span className="text-4xl select-none">✨</span>
              </div>

              <div className="space-y-2">
                <h2 className="font-display text-2xl font-bold text-ad-text">
                  Welcome to Your Room
                </h2>
                <p className="text-xs text-ad-text-secondary leading-relaxed max-w-xs mx-auto">
                  {nick} & {partnerNick}'s private sanctum. Four moods, games, interactive Truth or Dare, and a dedicated couples camera await.
                </p>
              </div>

              <Card variant="solid" className="p-4 space-y-2 text-left text-xs text-ad-text-secondary">
                <div className="flex items-center gap-2 text-ad-gold font-medium">
                  <span>🔒</span>
                  <span>Privacy Notice</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Local content is stored on this device. Remote messages, games and media remain disabled until an audited end-to-end encryption protocol is integrated. Camera use requires explicit permission.
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons Footer */}
      <div className="flex gap-3 pt-4 border-t border-ad-burgundy/30">
        {step > 0 && step < 5 && (
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            className="flex-1"
          >
            Back
          </Button>
        )}

        {step === 0 && (
          <Button
            variant="primary"
            fullWidth
            onClick={handleNextFromIdentity}
          >
            Continue
          </Button>
        )}

        {step === 1 && (
          <Button
            variant="primary"
            fullWidth
            onClick={handleNextFromPartner}
          >
            Continue
          </Button>
        )}

        {step === 2 && (
          <Button
            variant="primary"
            fullWidth
            loading={isGeneratingRoom}
            onClick={handleNextFromPreferences}
          >
            Create Private Room
          </Button>
        )}

        {step === 3 && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => setStep(4)}
          >
            Invite Partner
          </Button>
        )}

        {step === 4 && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => setStep(5)}
          >
            Next
          </Button>
        )}

        {step === 5 && (
          <Button
            variant="primary"
            fullWidth
            onClick={finishOnboarding}
            className="shadow-xl shadow-ad-red/40"
          >
            Enter AFTERDARK
          </Button>
        )}
      </div>
    </div>
  );
};
