import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '@/stores/app.store';
import { useGameStore } from '@/stores/game.store';
import { useTrophyStore } from '@/stores/trophy.store';
import { MOODS, APP_CONFIG } from '@/config/app.config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PlayMode } from '@/types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const playerName = useAppStore((s) => s.playerName) || 'You';
  const partnerName = useAppStore((s) => s.partnerName) || 'Partner';
  const roomCode = useAppStore((s) => s.roomCode);
  const playMode = useAppStore((s) => s.playMode);
  const setPlayMode = useAppStore((s) => s.setPlayMode);

  const activeSession = useGameStore((s) => s.activeSession);
  const recentSessions = useGameStore((s) => s.recentSessions);
  const sessionsPlayed = useGameStore((s) => s.sessionsPlayed);

  const unlockedCount = useTrophyStore((s) => s.unlockedTrophies.length);
  const totalTrophies = 14;

  const playModes: { id: PlayMode; label: string; icon: string }[] = [
    { id: 'pass-and-play', label: 'Pass & Play', icon: '📱' },
    { id: 'nearby', label: 'Nearby', icon: '📶' },
    { id: 'anywhere', label: 'Anywhere', icon: '🌐' },
  ];

  return (
    <div className="space-y-6 px-4 pt-6 pb-4">
      {/* Top Bar: Brand, Initials, Connection */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🌹</span>
            <h1 className="font-display text-2xl font-extrabold tracking-[0.2em] text-gradient-gold uppercase">
              {APP_CONFIG.name}
            </h1>
          </div>
          <p className="text-[11px] text-ad-text-secondary tracking-widest font-light">
            ROOM {roomCode ? `#${roomCode}` : 'PRIVATE'}
          </p>
        </div>

        {/* Couple Avatars */}
        <div className="flex items-center -space-x-2">
          <div className="w-9 h-9 rounded-full border-2 border-ad-gold/60 bg-ad-burgundy flex items-center justify-center text-xs font-bold text-ad-gold shadow-md">
            {playerName.charAt(0).toUpperCase()}
          </div>
          <div className="w-9 h-9 rounded-full border-2 border-ad-red/60 bg-ad-bg-secondary flex items-center justify-center text-xs font-bold text-ad-text shadow-md">
            {partnerName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Mode Selector Pill Bar */}
      <div className="flex p-1 bg-ad-bg-secondary/70 backdrop-blur-md border border-ad-burgundy/40 rounded-xl">
        {playModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setPlayMode(mode.id)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
              playMode === mode.id
                ? 'bg-ad-red text-white shadow-md shadow-ad-red/30 font-semibold'
                : 'text-ad-text-secondary hover:text-ad-text'
            }`}
          >
            <span>{mode.icon}</span>
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Continue Active Session Banner (if present) */}
      {activeSession && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-ad-burgundy/80 via-ad-red/40 to-ad-burgundy/80 border border-ad-gold/40 shadow-xl flex items-center justify-between"
        >
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-ad-gold">
              SESSION IN PROGRESS
            </span>
            <div className="font-display text-sm font-bold capitalize text-white">
              {activeSession.gameId.replace(/-/g, ' ')}
            </div>
            <div className="text-[11px] text-ad-text-secondary">
              Turn {activeSession.currentTurn + 1} · {activeSession.moodId}
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              navigate(`/games/${activeSession.moodId}/${activeSession.gameId}/play`)
            }
          >
            Resume ➔
          </Button>
        </motion.div>
      )}

      {/* FOUR LARGE MOOD CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold tracking-wider text-ad-text uppercase">
            Four Moods
          </h2>
          <span className="text-[11px] text-ad-text-secondary">
            Select an atmosphere
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {MOODS.map((mood, idx) => (
            <motion.div
              key={mood.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/games/${mood.id}`)}
              className={`relative overflow-hidden rounded-2xl p-4.5 cursor-pointer border ${mood.borderColor} bg-gradient-to-br ${mood.gradient} shadow-lg ${mood.glowColor} transition-all duration-300 min-h-[140px] flex flex-col justify-between`}
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl filter drop-shadow select-none">
                  {mood.emoji}
                </span>
                <span className="text-[10px] font-mono text-ad-text-secondary/70">
                  {mood.games.length} GAMES
                </span>
              </div>

              <div>
                <h3 className="font-display text-lg font-extrabold tracking-wider text-white">
                  {mood.label}
                </h3>
                <p className="text-[10px] text-ad-text-secondary line-clamp-2 mt-0.5 leading-snug">
                  {mood.description}
                </p>
              </div>

              {/* Ambient Accent Glint */}
              <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-white/5 blur-xl pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Featured / Signature Game: Truth or Dare */}
      <Card
        variant="glass"
        className="p-4 border-ad-red/40 bg-gradient-to-r from-ad-burgundy/60 via-ad-red/25 to-ad-bg cursor-pointer hover:border-ad-red/70 transition-all"
        onClick={() => navigate('/games/sexual/truth-or-dare')}
      >
        <div className="flex items-center justify-between mb-2">
          <Badge variant="red" size="sm">
            SIGNATURE GAME
          </Badge>
          <span className="text-xs text-ad-gold font-mono">3-LEVEL TWIST</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-3xl select-none">🎲</div>
          <div>
            <h3 className="font-display text-base font-bold text-ad-text">
              Truth or Dare
            </h3>
            <p className="text-xs text-ad-text-secondary leading-snug">
              Three-level twist ladder, Five-Step Challenge Terminal & strike progression.
            </p>
          </div>
        </div>
      </Card>

      {/* Trophy & Stats Quick Glance */}
      <div className="grid grid-cols-2 gap-3">
        <Card
          variant="solid"
          className="p-3.5 cursor-pointer hover:border-ad-gold/50 transition-all"
          onClick={() => navigate('/trophies')}
        >
          <div className="flex items-center justify-between text-xs text-ad-text-secondary mb-1">
            <span>Trophy Cabinet</span>
            <span className="text-ad-gold font-bold">{unlockedCount}/{totalTrophies}</span>
          </div>
          <ProgressBar value={(unlockedCount / totalTrophies) * 100} size="sm" variant="gold" />
          <div className="text-[10px] text-ad-text-secondary/70 mt-2">
            Tap to view achievements 🏆
          </div>
        </Card>

        <Card
          variant="solid"
          className="p-3.5"
        >
          <div className="text-xs text-ad-text-secondary mb-1">
            Couples Stats
          </div>
          <div className="font-display text-lg font-bold text-ad-gold">
            {sessionsPlayed} <span className="text-xs font-normal text-ad-text-secondary">Sessions</span>
          </div>
          <div className="text-[10px] text-ad-text-secondary/70 mt-1">
            Private history preserved 🔒
          </div>
        </Card>
      </div>

      {/* Recently Played List */}
      {recentSessions.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display text-xs font-bold uppercase tracking-wider text-ad-text-secondary">
            Recent Adventures
          </h3>
          <div className="space-y-1.5">
            {recentSessions.slice(0, 3).map((session) => (
              <div
                key={session.id}
                className="p-2.5 rounded-xl bg-ad-bg-secondary/60 border border-ad-burgundy/30 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-medium text-ad-text capitalize">
                    {session.gameId.replace(/-/g, ' ')}
                  </span>
                  <div className="text-[10px] text-ad-text-secondary">
                    {session.summary}
                  </div>
                </div>
                <Badge variant="outline" size="sm">
                  {new Date(session.completedAt).toLocaleDateString()}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
