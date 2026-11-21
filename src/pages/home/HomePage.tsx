import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAppStore } from '@/stores/app.store';
import { useGameStore } from '@/stores/game.store';
import { useTrophyStore } from '@/stores/trophy.store';
import { MOODS, APP_CONFIG } from '@/config/app.config';
import { MoodArtwork } from '@/components/branding/MoodArtwork';
import { AFTERDARK_ASSETS } from '@/assets/afterdark';
import { Button } from '@/components/ui/Button';
import type { PlayMode } from '@/types';

const playModes: { id: PlayMode; label: string; icon: string; available: boolean }[] = [
  { id: 'pass-and-play', label: 'Pass & Play', icon: '◉', available: true },
  { id: 'nearby', label: 'Nearby', icon: '⌁', available: false },
  { id: 'anywhere', label: 'Anywhere', icon: '◎', available: false },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const playerName = useAppStore((state) => state.playerName) || 'You';
  const partnerName = useAppStore((state) => state.partnerName) || 'Partner';
  const roomCode = useAppStore((state) => state.roomCode);
  const playMode = useAppStore((state) => state.playMode);
  const setPlayMode = useAppStore((state) => state.setPlayMode);
  const activeSession = useGameStore((state) => state.activeSession);
  const recentSessions = useGameStore((state) => state.recentSessions);
  const sessionsPlayed = useGameStore((state) => state.sessionsPlayed);
  const unlockedCount = useTrophyStore((state) => state.unlockedTrophies.length);
  const totalTrophies = 14;

  useEffect(() => {
    if (playMode !== 'pass-and-play') setPlayMode('pass-and-play');
  }, [playMode, setPlayMode]);

  return (
    <div className="home-screen">
      <header className="home-masthead">
        <div className="home-brand">
          <span className="home-brand-mark" aria-hidden="true">
            <img src={AFTERDARK_ASSETS.brand.appIcon} alt="" className="h-full w-full rounded-full object-cover p-0.5" />
          </span>
          <span className="home-brand-copy">
            <span className="home-brand-name">{APP_CONFIG.name}</span>
            <span className="home-brand-caption">A PRIVATE ROOM FOR TWO</span>
          </span>
        </div>
        <button
          type="button"
          className="home-settings-button"
          onClick={() => navigate('/settings')}
          aria-label="Open settings"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3.1" />
            <path d="M19.2 13.8a7.5 7.5 0 0 0 0-3.6l1.5-1.1-1.7-3-1.8.7a7.5 7.5 0 0 0-3.1-1.8L13.8 3h-3.6l-.3 2a7.5 7.5 0 0 0-3.1 1.8L5 6.1l-1.7 3 1.5 1.1a7.5 7.5 0 0 0 0 3.6l-1.5 1.1 1.7 3 1.8-.7a7.5 7.5 0 0 0 3.1 1.8l.3 2h3.6l.3-2a7.5 7.5 0 0 0 3.1-1.8l1.8.7 1.7-3-1.5-1.1Z" />
          </svg>
        </button>
      </header>

      <section className="home-hero" aria-labelledby="home-greeting">
        <MoodArtwork mood="romantic" className="home-hero-art" />
        <div className="home-hero-shade" />
        <div className="home-hero-copy">
          <p className="home-eyebrow">YOUR ROOM · YOUR RULES</p>
          <h1 id="home-greeting">Tonight is<br /><em>just for two.</em></h1>
          <p className="home-hero-description">
            A little more connection, one shared moment at a time.
          </p>
          <div className="home-couple-chip">
            <span className="home-connection-dot" />
            <span>{playerName}</span>
            <span className="home-couple-ampersand">&</span>
            <span>{partnerName}</span>
            <span className="home-room-divider" />
            <span className="home-room-code">{roomCode ? `ROOM ${roomCode}` : 'YOUR PRIVATE SPACE'}</span>
          </div>
        </div>
        <div className="home-hero-seal" aria-hidden="true">
          <img src={AFTERDARK_ASSETS.brand.wordmark} alt="" className="home-hero-wordmark" loading="lazy" decoding="async" />
        </div>
      </section>

      <section className="home-mode-section" aria-label="Play mode">
        <div className="home-section-heading">
          <div>
            <p className="home-eyebrow">HOW TO PLAY</p>
            <h2>Choose your setting</h2>
          </div>
          <span className="home-local-label"><span /> ON THIS DEVICE</span>
        </div>
        <div className="home-mode-list">
          {playModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              disabled={!mode.available}
              aria-pressed={mode.available}
              aria-label={mode.available ? `${mode.label}, selected` : `${mode.label}, not available yet`}
              onClick={() => mode.available && setPlayMode(mode.id)}
              className={`home-mode-option ${mode.available ? 'is-selected' : 'is-locked'}`}
            >
              <span className="home-mode-icon" aria-hidden="true">{mode.icon}</span>
              <span className="home-mode-label">{mode.label}</span>
              {mode.available
                ? <span className="home-mode-check" aria-hidden="true">✓</span>
                : (
                  <span className="home-mode-lock" aria-hidden="true">
                    <img src={AFTERDARK_ASSETS.ui.lockedBadge} alt="" className="home-mode-lock-art" loading="lazy" decoding="async" />
                    LOCKED
                  </span>
                )}
            </button>
          ))}
        </div>
        <p className="home-mode-note">
          Separate-device play stays off until secure, server-authoritative sessions are ready.
        </p>
      </section>

      {activeSession && (
        <section className="home-resume-panel" aria-label="Continue your game">
          <div className="home-resume-copy">
            <p className="home-eyebrow">PICK UP WHERE YOU LEFT OFF</p>
            <h2>{activeSession.gameId.replace(/-/g, ' ')}</h2>
            <p>{activeSession.moodId} · Round {activeSession.currentTurn + 1}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate(`/games/${activeSession.moodId}/${activeSession.gameId}/play`)}
          >
            Resume
          </Button>
        </section>
      )}

      <section className="home-moods-section" aria-labelledby="home-moods-heading">
        <div className="home-section-heading">
          <div>
            <p className="home-eyebrow">FOUR WAYS TO CONNECT</p>
            <h2 id="home-moods-heading">Choose your mood</h2>
          </div>
          <button type="button" className="home-text-link" onClick={() => navigate('/games')}>
            All 21 games <span aria-hidden="true">↗</span>
          </button>
        </div>

        <div className="home-mood-grid">
          {MOODS.map((mood, index) => (
            <motion.button
              key={mood.id}
              type="button"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : index * 0.06 }}
              whileHover={reduceMotion ? undefined : { y: -3 }}
              whileTap={reduceMotion ? undefined : { scale: 0.985 }}
              onClick={() => navigate(`/games/${mood.id}`)}
              className={`home-mood-card home-mood-card--${mood.id}`}
              aria-label={`${mood.label}: ${mood.description}, ${mood.games.length} games`}
            >
              <MoodArtwork mood={mood.id} className="home-mood-art" />
              <span className="home-mood-scrim" />
              <span className="home-mood-topline">
                <span className="home-mood-index">0{index + 1}</span>
                <span className="home-mood-count">{String(mood.games.length).padStart(2, '0')} GAMES</span>
              </span>
              <span className="home-mood-bottomline">
                <span className="home-mood-emoji" aria-hidden="true">{mood.emoji}</span>
                <span className="home-mood-name">{mood.label}</span>
                <span className="home-mood-description">{mood.description}</span>
              </span>
              <span className="home-mood-arrow" aria-hidden="true">↗</span>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="home-lower-grid" aria-label="Your shared journey">
        <button type="button" className="home-journey-card" onClick={() => navigate('/trophies')}>
          <span className="home-journey-symbol" aria-hidden="true">✦</span>
          <span className="home-journey-value">{unlockedCount}<span> / {totalTrophies}</span></span>
          <span className="home-journey-label">TROPHIES FOUND</span>
          <span className="home-journey-meter"><span style={{ width: `${Math.min(100, (unlockedCount / totalTrophies) * 100)}%` }} /></span>
        </button>
        <button type="button" className="home-journey-card" onClick={() => navigate('/chat')}>
          <span className="home-journey-symbol" aria-hidden="true">♡</span>
          <span className="home-journey-value">{sessionsPlayed}<span> sessions</span></span>
          <span className="home-journey-label">MOMENTS TOGETHER</span>
          <span className="home-journey-link">Open your chat <span aria-hidden="true">↗</span></span>
        </button>
      </section>

      {recentSessions.length > 0 && (
        <section className="home-recent-section" aria-labelledby="home-recent-heading">
          <div className="home-section-heading">
            <div>
              <p className="home-eyebrow">YOUR SHARED JOURNAL</p>
              <h2 id="home-recent-heading">Recently played</h2>
            </div>
          </div>
          <div className="home-recent-list">
            {recentSessions.slice(0, 3).map((session) => (
              <div key={session.id} className="home-recent-item">
                <span className="home-recent-mark" aria-hidden="true">✦</span>
                <span className="home-recent-copy">
                  <span>{session.gameId.replace(/-/g, ' ')}</span>
                  <span>{session.summary}</span>
                </span>
                <time dateTime={session.completedAt}>
                  {new Date(session.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </time>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="home-footer">
        <span>AFTERDARK</span>
        <span>{APP_CONFIG.tagline}</span>
      </footer>
    </div>
  );
};
