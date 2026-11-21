import { useGameStore } from '@/stores/game.store';
import { useTrophyStore } from '@/stores/trophy.store';
import type { ContentCard, MoodId } from '@/types';

export function awardCompletion(extra?: {
  perfectSix?: boolean;
  fiveStep?: boolean;
  story?: boolean;
  desire?: boolean;
  scenario?: boolean;
  moodId?: MoodId;
  gameId?: string;
}): string | null {
  const trophies = useTrophyStore.getState();
  const games = useGameStore.getState();
  trophies.incrementProgress('games_completed');
  if (extra?.moodId) {
    const moods = games.moodsExplored.includes(extra.moodId)
      ? games.moodsExplored
      : [...games.moodsExplored, extra.moodId];
    useGameStore.setState({ moodsExplored: moods });
    trophies.setProgress('moods_explored', moods.length);
  }
  trophies.setProgress('unique_games_played', games.uniqueGamesPlayed.length);
  if (extra?.perfectSix) trophies.incrementProgress('perfect_six_questions');
  if (extra?.fiveStep) trophies.incrementProgress('five_step_complete');
  if (extra?.story) trophies.incrementProgress('stories_completed');
  if (extra?.desire) trophies.incrementProgress('desire_matches');
  if (extra?.scenario) trophies.incrementProgress('scenarios_created');
  if (extra?.gameId === 'truth-or-dare') trophies.incrementProgress('tod_rounds');
  return useTrophyStore.getState().latestUnlocked;
}

export function noteRoomCreated(): void {
  useTrophyStore.getState().incrementProgress('rooms_created');
}

export function notePrompt(_card: ContentCard, recorded: boolean): void {
  if (recorded) useTrophyStore.getState().incrementProgress('unique_prompts');
}
