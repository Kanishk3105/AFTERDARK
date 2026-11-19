import { describe, it, expect, beforeEach } from 'vitest';
import { useTrophyStore } from './trophy.store';

describe('Trophy and Achievement Engine', () => {
  beforeEach(() => {
    useTrophyStore.getState().resetTrophies();
  });

  it('initializes with zero trophies and tracks progress', () => {
    const store = useTrophyStore.getState();
    expect(store.unlockedTrophies).toHaveLength(0);
    expect(store.getProgress('games_completed')).toBe(0);
  });

  it('unlocks First Spark trophy upon completing first game session', () => {
    const store = useTrophyStore.getState();
    store.incrementProgress('games_completed', 1);

    const updated = useTrophyStore.getState();
    expect(updated.isTrophyUnlocked('first-spark')).toBe(true);
    expect(updated.latestUnlocked).toBe('first-spark');
  });

  it('does not duplicate already unlocked trophies', () => {
    const store = useTrophyStore.getState();
    store.incrementProgress('games_completed', 1);
    store.incrementProgress('games_completed', 1);

    const updated = useTrophyStore.getState();
    const sparks = updated.unlockedTrophies.filter((t) => t.trophyId === 'first-spark');
    expect(sparks).toHaveLength(1);
  });
});
