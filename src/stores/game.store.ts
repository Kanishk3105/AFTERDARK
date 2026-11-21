import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db, type EncounterStatus } from '@/data/db';
import type { ContentCard, GameSession, MoodId, PlayMode, IntensityLevel } from '@/types';

export interface RecentSession {
  id: string;
  gameId: string;
  moodId: MoodId;
  scores: [number, number];
  completedAt: string;
  summary: string;
}

export interface SavedMemory {
  id: string;
  prompt: string;
  note: string;
  savedAt: string;
}

interface GameState {
  activeSession: GameSession | null;
  cardHistory: string[];
  fingerprints: string[];
  similarityGroups: string[];
  sessionsPlayed: number;
  uniqueGamesPlayed: string[];
  moodsExplored: MoodId[];
  lastCompletedSession: GameSession | null;
  recentSessions: RecentSession[];
  savedMemories: SavedMemory[];

  startSession: (config: {
    gameId: string;
    moodId: MoodId;
    mode: PlayMode;
    intensity: IntensityLevel;
    playerNames: [string, string];
  }) => GameSession;
  submitAnswer: (roundIndex: number, playerIndex: 0 | 1, value: string) => void;
  submitPrediction: (roundIndex: number, playerIndex: 0 | 1, value: string) => void;
  revealRound: (roundIndex: number) => void;
  nextTurn: () => void;
  endSession: () => void;
  recordCardEncountered: (
    card: ContentCard,
    sessionId: string,
    status?: EncounterStatus,
    persist?: boolean,
  ) => boolean;
  updateCardEncounterStatus: (cardId: string, status: EncounterStatus) => Promise<void>;
  isCardEncountered: (cardId: string) => boolean;
  clearHistory: () => Promise<void>;
  patchSession: (partial: Partial<GameSession>) => void;
  setEngine: (engine: unknown) => void;
  saveMemory: (prompt: string, note: string) => void;
  replaceHistory: (ids: string[], fingerprints: string[], similarityGroups: string[]) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      activeSession: null,
      cardHistory: [],
      fingerprints: [],
      similarityGroups: [],
      sessionsPlayed: 0,
      uniqueGamesPlayed: [],
      moodsExplored: [],
      lastCompletedSession: null,
      recentSessions: [],
      savedMemories: [],

      startSession: ({ gameId, moodId, mode, intensity }) => {
        const newSession: GameSession = {
          id: 'session-' + Date.now(),
          roomId: 'local-room',
          gameId,
          moodId,
          mode,
          status: 'in-progress',
          currentTurn: 0,
          currentPlayer: 0,
          rounds: [],
          scores: [0, 0],
          startedAt: new Date().toISOString(),
          intensity,
          updatedAt: new Date().toISOString(),
        };

        const currentGames = get().uniqueGamesPlayed;
        const updatedGames = currentGames.includes(gameId)
          ? currentGames
          : [...currentGames, gameId];

        set({
          activeSession: newSession,
          uniqueGamesPlayed: updatedGames,
        });

        return newSession;
      },

      submitAnswer: (roundIndex, playerIndex, value) => {
        const session = get().activeSession;
        if (!session || !session.rounds[roundIndex]) return;

        const updatedRounds = [...session.rounds];
        const currentRound = { ...updatedRounds[roundIndex] };
        const answers = [...currentRound.answers] as [any, any];

        answers[playerIndex] = {
          playerId: playerIndex === 0 ? 'p1' : 'p2',
          value,
          submittedAt: new Date().toISOString(),
        };

        currentRound.answers = answers;
        updatedRounds[roundIndex] = currentRound;

        set({
          activeSession: {
            ...session,
            rounds: updatedRounds,
          },
        });
      },

      submitPrediction: (roundIndex, playerIndex, value) => {
        const session = get().activeSession;
        if (!session || !session.rounds[roundIndex]) return;

        const updatedRounds = [...session.rounds];
        const currentRound = { ...updatedRounds[roundIndex] };
        const predictions = [...currentRound.predictions] as [any, any];

        predictions[playerIndex] = {
          playerId: playerIndex === 0 ? 'p1' : 'p2',
          value,
          submittedAt: new Date().toISOString(),
        };

        currentRound.predictions = predictions;
        updatedRounds[roundIndex] = currentRound;

        set({
          activeSession: {
            ...session,
            rounds: updatedRounds,
          },
        });
      },

      revealRound: (roundIndex) => {
        const session = get().activeSession;
        if (!session || !session.rounds[roundIndex]) return;

        const updatedRounds = [...session.rounds];
        const currentRound = { ...updatedRounds[roundIndex] };
        currentRound.revealed = true;

        // Check if answers matched or prediction matched target
        const ans0 = currentRound.answers[0]?.value;
        const ans1 = currentRound.answers[1]?.value;
        const pred1 = currentRound.predictions[1]?.value;
        const pred0 = currentRound.predictions[0]?.value;

        let matched = false;
        let score0 = session.scores[0];
        let score1 = session.scores[1];

        // If prediction matches actual answer:
        if (pred1 && ans0 && pred1.toLowerCase() === ans0.toLowerCase()) {
          matched = true;
          score1 += 1;
        } else if (pred0 && ans1 && pred0.toLowerCase() === ans1.toLowerCase()) {
          matched = true;
          score0 += 1;
        } else if (ans0 && ans1 && ans0.toLowerCase() === ans1.toLowerCase()) {
          matched = true;
          score0 += 1;
          score1 += 1;
        }

        currentRound.matched = matched;
        updatedRounds[roundIndex] = currentRound;

        set({
          activeSession: {
            ...session,
            rounds: updatedRounds,
            scores: [score0, score1],
          },
        });
      },

      nextTurn: () => {
        const session = get().activeSession;
        if (!session) return;

        set({
          activeSession: {
            ...session,
            currentTurn: session.currentTurn + 1,
            currentPlayer: session.currentPlayer === 0 ? 1 : 0,
          },
        });
      },

      endSession: () => {
        const session = get().activeSession;
        if (!session) return;

        const completed = {
          ...session,
          status: 'completed' as const,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const recent: RecentSession = {
          id: completed.id,
          gameId: completed.gameId,
          moodId: completed.moodId,
          scores: completed.scores,
          completedAt: completed.completedAt!,
          summary: `${completed.gameId} · ${completed.scores[0]}–${completed.scores[1]}`,
        };

        const moods = get().moodsExplored.includes(session.moodId)
          ? get().moodsExplored
          : [...get().moodsExplored, session.moodId];

        set({
          activeSession: null,
          lastCompletedSession: completed,
          sessionsPlayed: get().sessionsPlayed + 1,
          recentSessions: [recent, ...get().recentSessions].slice(0, 12),
          moodsExplored: moods,
        });
      },

      patchSession: (partial) => {
        const session = get().activeSession;
        if (!session) return;
        set({
          activeSession: {
            ...session,
            ...partial,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      setEngine: (engine) => {
        const session = get().activeSession;
        if (!session) return;
        set({
          activeSession: {
            ...session,
            engine,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      saveMemory: (prompt, note) => {
        const memory: SavedMemory = {
          id: 'mem-' + Date.now(),
          prompt,
          note,
          savedAt: new Date().toISOString(),
        };
        set({ savedMemories: [memory, ...get().savedMemories].slice(0, 50) });
      },

      replaceHistory: (ids, fingerprints, similarityGroups) => set({
        cardHistory: ids,
        fingerprints,
        similarityGroups,
      }),

      recordCardEncountered: (card, sessionId, status = 'shown', persistRecord = true) => {
        const current = get().cardHistory;
        const prints = get().fingerprints;
        const groups = get().similarityGroups;
        if (current.includes(card.id)) return false;
        set({
          cardHistory: [...current, card.id],
          fingerprints: [...prints, card.contentFingerprint],
          similarityGroups: [...groups, card.similarityGroup],
        });
        if (persistRecord) {
          void db.history.put({
            id: card.id,
            fingerprint: card.contentFingerprint,
            gameId: card.gameId,
            moodId: card.mood,
            intensity: card.intensity,
            contentRating: card.contentRating,
            sessionId,
            status,
            normalizedText: card.normalizedText,
            similarityGroup: card.similarityGroup,
            contentVersion: card.contentVersion,
            seenAt: new Date().toISOString(),
          }).catch((error: unknown) => {
            console.error('Persisting content encounter failed', error);
          });
        }
        return true;
      },

      updateCardEncounterStatus: async (cardId, status) => {
        const changed = await db.history.update(cardId, { status });
        if (changed === 0) throw new Error(`Content encounter ${cardId} is missing from the local ledger.`);
      },

      isCardEncountered: (cardId) => {
        return get().cardHistory.includes(cardId);
      },

      clearHistory: async () => {
        set({ cardHistory: [], fingerprints: [], similarityGroups: [] });
        await db.history.clear();
      },
    }),
    {
      name: 'afterdark-game-store',
    }
  )
);
