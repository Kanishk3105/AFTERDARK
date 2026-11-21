import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TROPHIES, TrophyDef } from '@/config/app.config';
import { useTrophyStore } from '@/stores/trophy.store';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { getTrophyArt } from '@/assets/afterdark';

export const TrophiesPage: React.FC = () => {
  const unlockedTrophies = useTrophyStore((s) => s.unlockedTrophies);
  const progress = useTrophyStore((s) => s.progress);
  const latestUnlocked = useTrophyStore((s) => s.latestUnlocked);
  const clearLatestUnlocked = useTrophyStore((s) => s.clearLatestUnlocked);

  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedTrophy, setSelectedTrophy] = useState<TrophyDef | null>(null);

  useEffect(() => {
    // Clear latest unlocked notification after visiting
    const timer = setTimeout(() => {
      clearLatestUnlocked();
    }, 4000);
    return () => clearTimeout(timer);
  }, [clearLatestUnlocked]);

  const totalAvailable = TROPHIES.length;
  const totalUnlocked = unlockedTrophies.length;
  const percentageOverall = Math.round((totalUnlocked / totalAvailable) * 100);

  const filteredTrophies = TROPHIES.filter((t) => {
    const isUnlocked = unlockedTrophies.some((u) => u.trophyId === t.id);
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  return (
    <div className="space-y-5 px-4 pt-6 pb-6 max-w-md mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wider text-ad-text uppercase">
          TROPHY CABINET
        </h1>
        <p className="text-xs text-ad-text-secondary">
          Achievements earned across your intimate journey together.
        </p>
      </div>

      {/* Overview Progress Card */}
      <Card variant="glass" className="p-4 space-y-3 border-ad-gold/40 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-ad-gold font-mono uppercase tracking-wider font-bold">
              MASTERY PROGRESS
            </span>
            <div className="font-display text-xl font-bold text-white">
              {totalUnlocked} of {totalAvailable} Unlocked
            </div>
          </div>
          <div className="text-3xl select-none">🏆</div>
        </div>

        <ProgressBar value={percentageOverall} size="md" variant="gold" />

        <div className="flex justify-between items-center text-[10px] text-ad-text-secondary">
          <span>{percentageOverall}% Completed</span>
          <span className="text-ad-gold font-mono">No trophies expire</span>
        </div>
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: `All (${totalAvailable})` },
          { id: 'unlocked', label: `Unlocked (${totalUnlocked})` },
          { id: 'locked', label: `Locked (${totalAvailable - totalUnlocked})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`flex-1 py-1.5 text-xs rounded-xl border transition-all ${
              filter === tab.id
                ? 'border-ad-gold bg-ad-red/25 text-ad-gold font-bold shadow-md'
                : 'border-ad-burgundy/40 bg-ad-bg-secondary/40 text-ad-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trophies Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredTrophies.map((trophy, index) => {
          const unlockRecord = unlockedTrophies.find((u) => u.trophyId === trophy.id);
          const isUnlocked = !!unlockRecord;
          const currentProgress = progress[trophy.requirement] || 0;
          const isLatest = latestUnlocked === trophy.id;

          return (
            <motion.div
              key={trophy.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ y: -2 }}
              onClick={() => setSelectedTrophy(trophy)}
            >
              <Card
                variant={isUnlocked ? 'glass' : 'solid'}
                className={`p-3.5 h-full flex flex-col justify-between cursor-pointer border transition-all relative overflow-hidden ${
                  isUnlocked
                    ? 'border-ad-gold/50 shadow-lg shadow-ad-red/10 bg-gradient-to-b from-ad-burgundy/30 to-ad-bg'
                    : 'border-ad-burgundy/30 opacity-75 grayscale-[30%]'
                } ${isLatest ? 'ring-2 ring-ad-gold animate-pulse' : ''}`}
              >
                {isLatest && (
                  <span className="absolute top-2 right-2 text-[8px] bg-ad-gold text-ad-bg font-extrabold px-1.5 py-0.2 rounded-full">
                    NEW!
                  </span>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <img
                      src={getTrophyArt(trophy.id)}
                      alt=""
                      aria-hidden="true"
                      className="h-16 w-20 rounded-lg object-cover filter drop-shadow"
                      loading="lazy"
                      decoding="async"
                    />
                    <Badge
                      variant={isUnlocked ? 'gold' : 'outline'}
                      size="sm"
                    >
                      {isUnlocked ? 'EARNED' : 'LOCKED'}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-display text-xs font-bold text-ad-text leading-snug">
                      {trophy.name}
                    </h3>
                    <p className="text-[10px] text-ad-text-secondary line-clamp-2 mt-0.5">
                      {trophy.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  {isUnlocked ? (
                    <div className="text-[9px] text-ad-gold font-mono">
                      Unlocked {new Date(unlockRecord!.unlockedAt).toLocaleDateString()}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-ad-text-secondary font-mono">
                        <span>Progress</span>
                        <span>{Math.min(currentProgress, trophy.threshold)}/{trophy.threshold}</span>
                      </div>
                      <ProgressBar
                        value={(Math.min(currentProgress, trophy.threshold) / trophy.threshold) * 100}
                        size="sm"
                        variant="red"
                      />
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Trophy Detail Inspection Modal */}
      <Modal
        isOpen={!!selectedTrophy}
        onClose={() => setSelectedTrophy(null)}
        title={selectedTrophy?.name || 'Trophy Details'}
      >
        {selectedTrophy && (
          <div className="text-center space-y-4 py-2">
            <img
              src={getTrophyArt(selectedTrophy.id)}
              alt=""
              aria-hidden="true"
              className="mx-auto h-28 w-40 rounded-xl border-2 border-ad-gold/50 object-cover shadow-xl shadow-ad-red/20"
              loading="lazy"
              decoding="async"
            />

            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-white">
                {selectedTrophy.name}
              </h3>
              <p className="text-xs text-ad-text leading-relaxed">
                {selectedTrophy.description}
              </p>
            </div>

            <Card variant="solid" className="p-3 text-left space-y-1.5 text-xs text-ad-text-secondary">
              <div className="flex justify-between">
                <span>Category:</span>
                <span className="text-ad-gold font-bold uppercase">{selectedTrophy.category}</span>
              </div>
              <div className="flex justify-between">
                <span>Threshold:</span>
                <span className="font-mono text-white">{selectedTrophy.threshold} requirements met</span>
              </div>
              <div className="flex justify-between">
                <span>Current count:</span>
                <span className="font-mono text-ad-gold">{progress[selectedTrophy.requirement] || 0}</span>
              </div>
            </Card>

            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => setSelectedTrophy(null)}
            >
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
