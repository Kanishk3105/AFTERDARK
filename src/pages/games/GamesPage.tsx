import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MOODS } from '@/config/app.config';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MoodId } from '@/types';

export const GamesPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMood, setSelectedMood] = useState<MoodId | 'all'>('all');
  const [search, setSearch] = useState('');

  // Collect all games
  const allGames = MOODS.flatMap((mood) =>
    mood.games.map((game) => ({
      ...game,
      moodEmoji: mood.emoji,
      moodLabel: mood.label,
      moodGradient: mood.gradient,
      moodBorder: mood.borderColor,
    }))
  );

  const filteredGames = allGames.filter((game) => {
    const matchesMood = selectedMood === 'all' || game.moodId === selectedMood;
    const matchesSearch =
      !search.trim() ||
      game.name.toLowerCase().includes(search.toLowerCase()) ||
      game.description.toLowerCase().includes(search.toLowerCase());
    return matchesMood && matchesSearch;
  });

  return (
    <div className="space-y-5 px-4 pt-6 pb-6">
      {/* Page Title */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wider text-ad-text uppercase">
          GAME CATALOGUE
        </h1>
        <p className="text-xs text-ad-text-secondary">
          21 interactive two-player couples experiences across four moods.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search games, challenges, stories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-ad-bg-secondary/70 border border-ad-burgundy/40 rounded-xl py-2.5 pl-9 pr-4 text-xs text-ad-text placeholder:text-ad-text-secondary/40 focus:outline-none focus:border-ad-gold/60 focus:ring-1 focus:ring-ad-gold/40 transition-all"
        />
        <span className="absolute left-3 top-2.5 text-xs text-ad-text-secondary">
          🔍
        </span>
      </div>

      {/* Mood Filter Pill Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedMood('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
            selectedMood === 'all'
              ? 'bg-ad-gold text-ad-bg font-bold shadow-md shadow-ad-gold/20'
              : 'bg-ad-bg-secondary/60 text-ad-text-secondary border border-ad-burgundy/30'
          }`}
        >
          All (21)
        </button>

        {MOODS.map((mood) => (
          <button
            key={mood.id}
            type="button"
            onClick={() => setSelectedMood(mood.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedMood === mood.id
                ? 'bg-ad-red text-white font-bold shadow-md shadow-ad-red/30'
                : 'bg-ad-bg-secondary/60 text-ad-text-secondary border border-ad-burgundy/30'
            }`}
          >
            <span>{mood.emoji}</span>
            <span>{mood.label}</span>
          </button>
        ))}
      </div>

      {/* Games List Grid */}
      <div className="space-y-3">
        {filteredGames.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => navigate(`/games/${game.moodId}/${game.id}`)}
          >
            <Card
              variant="glass"
              className="p-4 hover:border-ad-gold/40 cursor-pointer transition-all active:scale-[0.99] border-ad-burgundy/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-3xl select-none pt-0.5">{game.emoji}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-sm font-bold text-ad-text">
                        {game.name}
                      </h3>
                      <Badge
                        variant={
                          game.moodId === 'sexual'
                            ? 'red'
                            : game.moodId === 'fantasy'
                            ? 'burgundy'
                            : game.moodId === 'romantic'
                            ? 'gold'
                            : 'slate'
                        }
                        size="sm"
                      >
                        {game.moodLabel}
                      </Badge>
                    </div>

                    <p className="text-xs text-ad-text-secondary leading-relaxed">
                      {game.description}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1.5">
                      <span className="text-[10px] text-ad-gold font-mono mr-1.5">
                        ⏱ {game.estimatedMinutes} min
                      </span>
                      {game.features.slice(0, 2).map((feat) => (
                        <span
                          key={feat}
                          className="text-[10px] px-2 py-0.2 rounded-md bg-ad-bg-secondary/80 text-ad-text-secondary border border-ad-burgundy/30"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <span className="text-ad-gold/70 text-sm font-bold">➔</span>
              </div>
            </Card>
          </motion.div>
        ))}

        {filteredGames.length === 0 && (
          <div className="text-center py-12 text-ad-text-secondary text-xs">
            No games match your search criteria.
          </div>
        )}
      </div>
    </div>
  );
};
