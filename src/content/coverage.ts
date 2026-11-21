import { MOODS } from '@/config/app.config';
import { contentCardsForGame } from '@/content/engine';
import type { IntensityLevel } from '@/types';

const FOUR_ROUND_GAMES = new Set([
  'love-quiz',
  'desire-match',
  'desire-quiz',
  'fantasy-cards',
]);

const SINGLE_PROMPT_GAMES = new Set([
  'memory-lane',
  'couple-challenges',
  'love-language',
  'temptations',
  'emoji-confessions',
  'scenario-builder',
  'the-menu',
  'challenge-duel',
]);

const ROULETTE_GAMES = new Set([
  'romantic-roulette',
  'naughty-roulette',
  'fantasy-roulette',
]);

const CARD_ROUND_GAMES = new Set([
  'six-questions',
  'how-well-do-you-know-me',
  'would-you-rather',
  'whos-more-likely',
  'truth-or-dare',
  'choose-your-story',
]);

const GAMEPLAY: Record<string, string> = {
  'six-questions': 'Six-round answer, prediction, reveal, and local scoring flow.',
  'how-well-do-you-know-me': 'Shared answer/guess flow; no separate game engine.',
  'would-you-rather': 'Private pass-and-play choice, optional custom choice, reveal, and scoring.',
  'whos-more-likely': 'Private pass-and-play votes, reveal, and player-name attribution.',
  'love-quiz': 'Dedicated private preference choice and reveal.',
  'memory-lane': 'Two private local submissions, gated reveal, optional saved note.',
  'love-language': 'Private five-item ranking, unique-rank validation, reveal, and match scoring.',
  'couple-challenges': 'Mutual acceptance, pause/resume, decline, and shared completion.',
  'romantic-roulette': 'Random eligible prompt spin with local result persistence.',
  'truth-or-dare': 'Turn-based reducer with consent actions, strikes, alternatives, and five-step state.',
  'desire-match': 'Private yes/maybe/no choices with reveal.',
  'naughty-roulette': 'Random eligible prompt spin with local result persistence.',
  temptations: 'User-authored four-choice challenge with partner approval or decline.',
  'desire-quiz': 'Dedicated private choice and reveal.',
  'emoji-confessions': 'Emoji composition, private interpretation, guess, and gated reveal.',
  'fantasy-cards': 'Private scenario interest choices and reveal.',
  'scenario-builder': 'Editable scenario fields with partner approval or decline.',
  'the-menu': 'Private independent rankings, duplicate-rank rejection, reveal, and scoring.',
  'challenge-duel': 'Private submissions with reveal after both players submit.',
  'choose-your-story': 'Local branching story with saved current node.',
  'fantasy-roulette': 'Randomly generated setting, atmosphere, theme, and direction.',
};

const LOCAL_LEDGER = 'Global local Dexie ID/fingerprint/group ledger with session, mood, intensity, timestamp, and status; no pair synchronization.';
const BOUNDARY_GAP = 'Shared excluded topics and game-specific consent actions where implemented; per-player limits and effective pair maximum are not implemented.';

export interface GameContentCoverage {
  gameId: string;
  mood: string;
  gameplayImplementation: string;
  existingContentCount: number;
  byIntensity: Record<IntensityLevel, number>;
  selectionLogic: string;
  historyIntegration: string;
  boundaryIntegration: string;
  automatedTestCoverage: string;
}

export function buildGameContentCoverage(): GameContentCoverage[] {
  return MOODS.flatMap((mood) => mood.games.map((game) => {
    const cards = contentCardsForGame(game.id);
    const byIntensity: Record<IntensityLevel, number> = {
      mild: 0,
      moderate: 0,
      spicy: 0,
      extreme: 0,
    };
    cards.forEach((card) => {
      byIntensity[card.intensity] += 1;
    });

    const selectionLogic = ROULETTE_GAMES.has(game.id)
      ? 'Atomic exact-intensity selection on each roulette spin; shared exclusions and global local history.'
      : FOUR_ROUND_GAMES.has(game.id)
        ? 'Atomic four-card reservation batch; exact intensity; shared exclusions and global local history.'
        : SINGLE_PROMPT_GAMES.has(game.id)
          ? 'Atomic opening-prompt selection; exact intensity; shared exclusions and global local history.'
          : CARD_ROUND_GAMES.has(game.id)
            ? 'Atomic exact-intensity selection before each round or story opening; shared exclusions and global local history.'
            : 'No content-selection route is registered.';
    return {
      gameId: game.id,
      mood: mood.id,
      gameplayImplementation: GAMEPLAY[game.id] ?? 'No audited gameplay description.',
      existingContentCount: cards.length,
      byIntensity,
      selectionLogic,
      historyIntegration: selectionLogic.startsWith('No content')
        ? 'No selected content is connected to the encounter ledger.'
        : `${LOCAL_LEDGER} Exact-intensity selection is serialized with idempotent request keys.`,
      boundaryIntegration: BOUNDARY_GAP,
      automatedTestCoverage: 'All 84 pool combinations, metadata, atomic concurrent selection, cross-game/intensity fingerprint blocking, retries, restart recovery, and exhaustion are tested; game-specific UI and remote recovery remain incomplete.',
    };
  }));
}
