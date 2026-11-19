import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TROPHIES } from '@/config/app.config';
import { UnlockedTrophy } from '@/types';

interface TrophyState {
  unlockedTrophies: UnlockedTrophy[];
  progress: Record<string, number>;
  latestUnlocked: string | null;

  // Actions
  unlockTrophy: (trophyId: string) => boolean;
  incrementProgress: (requirement: string, amount?: number) => void;
  setProgress: (requirement: string, value: number) => void;
  checkAndUnlock: () => string[];
  isTrophyUnlocked: (trophyId: string) => boolean;
  getProgress: (requirement: string) => number;
  clearLatestUnlocked: () => void;
  resetTrophies: () => void;
}

export const useTrophyStore = create<TrophyState>()(
  persist(
    (set, get) => ({
      unlockedTrophies: [],
      progress: {
        games_completed: 0,
        perfect_six_questions: 0,
        moods_explored: 0,
        scenarios_created: 0,
        chat_games: 0,
        rooms_created: 0,
        tod_rounds: 0,
        five_step_complete: 0,
        stories_completed: 0,
        desire_matches: 0,
        unique_games_played: 0,
        unique_challenges: 0,
        unique_prompts: 0,
      },
      latestUnlocked: null,

      unlockTrophy: (trophyId) => {
        const unlocked = get().unlockedTrophies;
        if (unlocked.some((t) => t.trophyId === trophyId)) {
          return false;
        }

        const newUnlock: UnlockedTrophy = {
          trophyId,
          unlockedAt: new Date().toISOString(),
        };

        set({
          unlockedTrophies: [...unlocked, newUnlock],
          latestUnlocked: trophyId,
        });

        return true;
      },

      incrementProgress: (requirement, amount = 1) => {
        const currentProgress = get().progress;
        const currentVal = currentProgress[requirement] || 0;
        const newVal = currentVal + amount;

        set({
          progress: {
            ...currentProgress,
            [requirement]: newVal,
          },
        });

        get().checkAndUnlock();
      },

      setProgress: (requirement, value) => {
        set((state) => ({
          progress: {
            ...state.progress,
            [requirement]: value,
          },
        }));
        get().checkAndUnlock();
      },

      checkAndUnlock: () => {
        const { progress, unlockedTrophies, unlockTrophy } = get();
        const newlyUnlocked: string[] = [];

        for (const trophy of TROPHIES) {
          const isAlreadyUnlocked = unlockedTrophies.some(
            (t) => t.trophyId === trophy.id
          );
          if (isAlreadyUnlocked) continue;

          const currentVal = progress[trophy.requirement] || 0;
          if (currentVal >= trophy.threshold) {
            const success = unlockTrophy(trophy.id);
            if (success) {
              newlyUnlocked.push(trophy.id);
            }
          }
        }

        return newlyUnlocked;
      },

      isTrophyUnlocked: (trophyId) => {
        return get().unlockedTrophies.some((t) => t.trophyId === trophyId);
      },

      getProgress: (requirement) => {
        return get().progress[requirement] || 0;
      },

      clearLatestUnlocked: () => set({ latestUnlocked: null }),

      resetTrophies: () =>
        set({
          unlockedTrophies: [],
          progress: {
            games_completed: 0,
            perfect_six_questions: 0,
            moods_explored: 0,
            scenarios_created: 0,
            chat_games: 0,
            rooms_created: 0,
            tod_rounds: 0,
            five_step_complete: 0,
            stories_completed: 0,
            desire_matches: 0,
            unique_games_played: 0,
            unique_challenges: 0,
            unique_prompts: 0,
          },
          latestUnlocked: null,
        }),
    }),
    {
      name: 'afterdark-trophy-store',
    }
  )
);
