import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MOODS } from '@/config/app.config';
import { useAppStore } from '@/stores/app.store';
import { useGameStore } from '@/stores/game.store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { IntensityLevel, MoodId } from '@/types';

export const GameDetailPage: React.FC = () => {
  const { moodId, gameId } = useParams<{ moodId: string; gameId: string }>();
  const navigate = useNavigate();

  const playerName = useAppStore((s) => s.playerName) || 'Player 1';
  const partnerName = useAppStore((s) => s.partnerName) || 'Player 2';
  const playMode = useAppStore((s) => s.playMode);
  const preferredIntensity = useAppStore((s) => s.preferences.intensity);

  const startSession = useGameStore((s) => s.startSession);

  const [intensity, setIntensity] = useState<IntensityLevel>(preferredIntensity || 'spicy');

  const mood = MOODS.find((m) => m.id === moodId);
  const game = mood?.games.find((g) => g.id === gameId);

  if (!game || !mood) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-ad-text-secondary text-sm">Game not found.</p>
        <Button variant="secondary" onClick={() => navigate('/games')}>
          Back to Games
        </Button>
      </div>
    );
  }

  const handleStartPlay = () => {
    startSession({
      gameId: game.id,
      moodId: mood.id as MoodId,
      mode: playMode,
      intensity,
      playerNames: [playerName, partnerName],
    });

    navigate(`/games/${mood.id}/${game.id}/play`);
  };

  return (
    <div className="space-y-6 px-4 pt-4 pb-8 max-w-md mx-auto">
      {/* Top Navigation */}
      <button
        onClick={() => navigate(`/games/${mood.id}`)}
        className="text-xs text-ad-text-secondary hover:text-ad-text flex items-center gap-1.5"
      >
        <span>←</span> <span>{mood.label}</span>
      </button>

      {/* Game Header Emblem Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-3xl bg-gradient-to-b from-ad-burgundy/50 via-ad-bg-secondary to-ad-bg border border-ad-burgundy/60 text-center space-y-3 shadow-2xl relative overflow-hidden"
      >
        <div className="w-20 h-20 mx-auto rounded-2xl border border-ad-gold/40 bg-ad-red/20 flex items-center justify-center text-4xl shadow-xl shadow-ad-red/30">
          {game.emoji}
        </div>

        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="font-display text-2xl font-black text-ad-text tracking-wide">
              {game.name}
            </h1>
          </div>
          <Badge variant="gold" size="sm">
            {mood.label} CATEGORY
          </Badge>
        </div>

        <p className="text-xs text-ad-text-secondary max-w-xs mx-auto leading-relaxed">
          {game.description}
        </p>

        {/* Info Pills */}
        <div className="flex items-center justify-center gap-3 pt-2 text-xs text-ad-text-secondary font-mono">
          <span>⏱ {game.estimatedMinutes} Mins</span>
          <span>·</span>
          <span>👥 {game.minPlayers} Players</span>
          <span>·</span>
          <span className="capitalize">📱 {playMode.replace(/-/g, ' ')}</span>
        </div>
      </motion.div>

      {/* Couple Players Banner */}
      <Card variant="solid" className="p-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-ad-gold font-bold">PLAYERS:</span>
          <span className="text-ad-text font-medium">{playerName}</span>
          <span className="text-ad-text-secondary">&</span>
          <span className="text-ad-text font-medium">{partnerName}</span>
        </div>
        <span className="text-[10px] text-ad-gold uppercase tracking-wider font-mono">
          Ready
        </span>
      </Card>

      {/* Intensity Selector (if supported) */}
      {game.hasIntensityLevels && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-ad-text-secondary uppercase tracking-wider">
              Select Intensity
            </label>
            <span className="text-[10px] text-ad-gold capitalize font-mono">
              {intensity}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'mild', label: 'Mild', emoji: '🌿' },
              { id: 'moderate', label: 'Moderate', emoji: '🌹' },
              { id: 'spicy', label: 'Spicy', emoji: '🔥' },
              { id: 'extreme', label: 'Extreme', emoji: '😈' },
            ].map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setIntensity(lvl.id as IntensityLevel)}
                className={`py-2 px-1 rounded-xl border text-center transition-all ${
                  intensity === lvl.id
                    ? 'border-ad-gold bg-ad-red/25 text-ad-gold font-bold shadow-md'
                    : 'border-ad-burgundy/40 bg-ad-bg-secondary/40 text-ad-text-secondary'
                }`}
              >
                <div className="text-base select-none">{lvl.emoji}</div>
                <div className="text-[10px] mt-0.5">{lvl.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Key Mechanics / Features */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold text-ad-text-secondary uppercase tracking-wider">
          Game Highlights
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {game.features.map((feat) => (
            <div
              key={feat}
              className="p-2.5 rounded-xl bg-ad-bg-secondary/50 border border-ad-burgundy/30 text-xs text-ad-text flex items-center gap-2"
            >
              <span className="text-ad-gold text-xs">✦</span>
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Play Button */}
      <div className="pt-2">
        <Button
          size="lg"
          fullWidth
          onClick={handleStartPlay}
          className="shadow-2xl shadow-ad-red/50 text-base font-display tracking-wider uppercase"
        >
          START GAME NOW ➔
        </Button>
      </div>
    </div>
  );
};
