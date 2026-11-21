import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/data/db';
import { useGameStore } from '@/stores/game.store';
import { contentCardsForGame } from './engine';
import { selectAndRecordMany, selectAndRecordNext } from './selection';

function request(gameId: string, intensity: 'mild' | 'moderate' | 'spicy' | 'extreme') {
  return {
    gameId,
    intensity,
    excludedTopics: [],
    history: [],
    fingerprints: [],
  };
}

describe('transactional content history', () => {
  beforeEach(async () => {
    await db.history.clear();
    useGameStore.setState({
      cardHistory: [],
      fingerprints: [],
      similarityGroups: [],
    });
  });

  it('serializes concurrent selections and stores encounter metadata before returning cards', async () => {
    const [first, second] = await Promise.all([
      selectAndRecordNext(request('would-you-rather', 'mild'), 'session-concurrent', 'selection-a'),
      selectAndRecordNext(request('would-you-rather', 'mild'), 'session-concurrent', 'selection-b'),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.card.id).not.toBe(second.card.id);

    const records = await db.history.toArray();
    expect(records).toHaveLength(2);
    records.forEach((record) => {
      expect(record.gameId).toBe('would-you-rather');
      expect(record.moodId).toBe('platonic');
      expect(record.intensity).toBe('mild');
      expect(record.sessionId).toBe('session-concurrent');
      expect(record.status).toBe('shown');
      expect(record.cardSnapshot?.id).toBe(record.id);
      expect(record.fingerprint).toBeTruthy();
    });
  });

  it('makes a retried selection idempotent by selection key', async () => {
    const [first, retry] = await Promise.all([
      selectAndRecordNext(request('choose-your-story', 'mild'), 'session-retry', 'story-open'),
      selectAndRecordNext(request('choose-your-story', 'mild'), 'session-retry', 'story-open'),
    ]);

    expect(first.ok).toBe(true);
    expect(retry.ok).toBe(true);
    if (!first.ok || !retry.ok) return;
    expect(retry.card.id).toBe(first.card.id);
    expect((await db.history.toArray())).toHaveLength(1);
  });

  it('recovers persisted history after in-memory state is cleared', async () => {
    const first = await selectAndRecordNext(request('would-you-rather', 'mild'), 'session-restart', 'round-1');
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    useGameStore.setState({
      cardHistory: [],
      fingerprints: [],
      similarityGroups: [],
    });
    const next = await selectAndRecordNext(request('would-you-rather', 'mild'), 'session-restart', 'round-2');

    expect(next.ok).toBe(true);
    if (next.ok) expect(next.card.id).not.toBe(first.card.id);
  });

  it('blocks fingerprint repeats across games and intensity levels', async () => {
    const target = contentCardsForGame('love-quiz').find((card) => card.intensity === 'spicy');
    if (!target) throw new Error('Expected a spicy Love Quiz test card.');
    await db.history.add({
      id: 'prior-other-game-card',
      fingerprint: target.contentFingerprint,
      gameId: 'desire-match',
      moodId: 'sexual',
      intensity: 'moderate',
      similarityGroup: target.similarityGroup,
      seenAt: new Date().toISOString(),
    });

    const selected = await selectAndRecordNext({
      ...request('love-quiz', 'spicy'),
      match: (card) => card.id === target.id,
    }, 'session-global', 'global-repeat');

    expect(selected.ok).toBe(false);
    if (!selected.ok) expect(selected.reason).toContain('No new spicy experience remains');
    expect(await db.history.count()).toBe(1);
  });

  it('atomically records distinct reserved cards for a multi-round game', async () => {
    const selected = await selectAndRecordMany(
      request('love-quiz', 'spicy'),
      4,
      'session-batch',
      'love-quiz-initial',
    );

    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    expect(new Set(selected.cards.map((card) => card.id)).size).toBe(4);
    expect((await db.history.toArray()).filter((record) => record.status === 'reserved')).toHaveLength(4);
  });

  it('reports exact-pool exhaustion instead of reusing a viewed card', async () => {
    const first = await selectAndRecordNext(request('choose-your-story', 'mild'), 'session-empty', 'story-first');
    expect(first.ok).toBe(true);
    const next = await selectAndRecordNext(request('choose-your-story', 'mild'), 'session-empty', 'story-second');

    expect(next.ok).toBe(false);
    if (!next.ok) expect(next.reason).toContain('No new mild experience remains');
    expect((await db.history.toArray())).toHaveLength(1);
  });
});
