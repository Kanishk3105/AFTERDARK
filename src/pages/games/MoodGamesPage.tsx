import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MOODS } from '@/config/app.config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MoodId } from '@/types';

export const MoodGamesPage: React.FC = () => {
  const { moodId } = useParams<{ moodId: string }>();
  const navigate = useNavigate();

  const mood = MOODS.find((m) => m.id === moodId);

  if (!mood) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-ad-text-secondary text-sm">Mood category not found.</p>
        <Button variant="secondary" onClick={() => navigate('/games')}>
          Back to Games
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pt-4 pb-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/home')}
          className="text-xs text-ad-text-secondary hover:text-ad-text flex items-center gap-1.5"
        >
          <span>←</span> <span>Home</span>
        </button>
        <button
          onClick={() => navigate('/games')}
          className="text-xs text-ad-gold hover:underline"
        >
          All Games
        </button>
      </div>

      {/* Hero Mood Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`p-6 rounded-3xl border ${mood.borderColor} bg-gradient-to-br ${mood.gradient} shadow-2xl relative overflow-hidden`}
      >
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-4xl filter drop-shadow select-none">
              {mood.emoji}
            </span>
            <Badge variant="gold" size="sm">
              {mood.games.length} GAMES
            </Badge>
          </div>

          <h1 className="font-display text-2xl font-black tracking-wider text-white uppercase">
            {mood.label}
          </h1>

          <p className="text-xs text-ad-text/90 leading-relaxed max-w-xs">
            {mood.description}
          </p>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </motion.div>

      {/* Games in this mood */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xs font-bold uppercase tracking-wider text-ad-text-secondary">
            Available Games
          </h2>
        </div>

        <div className="space-y-3">
          {mood.games.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/games/${mood.id}/${game.id}`)}
            >
              <Card
                variant="glass"
                className="p-4 hover:border-ad-gold/50 cursor-pointer transition-all active:scale-[0.99] border-ad-burgundy/40"
              >
                <div className="flex items-start gap-3.5">
                  <div className="text-3xl select-none pt-0.5">{game.emoji}</div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold text-ad-text">
                        {game.name}
                      </h3>
                      <span className="text-[10px] text-ad-gold font-mono">
                        ⏱ {game.estimatedMinutes}m
                      </span>
                    </div>

                    <p className="text-xs text-ad-text-secondary leading-relaxed">
                      {game.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {game.features.map((feat) => (
                        <span
                          key={feat}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-ad-bg-secondary/90 text-ad-text-secondary border border-ad-burgundy/30"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
