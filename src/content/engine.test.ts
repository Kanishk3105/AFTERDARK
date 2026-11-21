import { describe, it, expect } from 'vitest';
import {
  fingerprint,
  isTooSimilar,
  jaccard,
  selectNext,
  selectMany,
  auditCatalogue,
  contentCardsForGame,
  totalCatalogueSize,
  normalizeContentText,
} from './engine';
import { INTENSITY_SCORE } from '@/config/app.config';
import { MOODS } from '@/config/app.config';

describe('No-Repetition Content Engine', () => {
  it('uses the required shared intensity scale', () => {
    expect(INTENSITY_SCORE).toEqual({
      mild: 20,
      moderate: 55,
      spicy: 87,
      extreme: 100,
    });
  });

  it('computes consistent fingerprints regardless of stop-words and casing', () => {
    const fp1 = fingerprint('What is your secret desire tonight?');
    const fp2 = fingerprint('SECRET DESIRE TONIGHT');
    expect(fp1).toBe(fp2);
  });

  it('normalizes Unicode compatibility forms and punctuation consistently', () => {
    expect(normalizeContentText('  Café—Été! ')).toBe(normalizeContentText('café été'));
    expect(fingerprint('Café—Été!')).toBe(fingerprint('café été'));
  });

  it('provides classified content for all 84 game-intensity combinations', () => {
    const gameIds = MOODS.flatMap((mood) => mood.games.map((game) => game.id));
    const levels = ['mild', 'moderate', 'spicy', 'extreme'] as const;
    const ids = new Set<string>();
    const cardsByGame = new Map(gameIds.map((gameId) => [gameId, contentCardsForGame(gameId)]));

    expect(gameIds).toHaveLength(21);
    gameIds.forEach((gameId) => {
      const cards = cardsByGame.get(gameId) ?? [];
      expect(cards.length).toBeGreaterThan(0);
      cards.forEach((card) => {
        expect(ids.has(card.id)).toBe(false);
        ids.add(card.id);
        expect(card.normalizedText).toBeTruthy();
        expect(card.contentFingerprint).toBeTruthy();
        expect(card.similarityGroup).toBeTruthy();
        expect(card.templateFingerprint).toBeTruthy();
        expect(card.originalSource).toBeTruthy();
        expect(card.createdAt).toBeTruthy();
      });

      levels.forEach((intensity) => {
        const levelCards = cards.filter((card) => card.intensity === intensity);
        expect(levelCards.length, `${gameId} ${intensity} pool`).toBeGreaterThan(0);
        expect(new Set(levelCards.map((card) => card.normalizedText)).size).toBe(levelCards.length);
        const selected = selectNext({
          gameId,
          intensity,
          excludedTopics: [],
          history: [],
          fingerprints: [],
        });
        expect(selected.ok, `${gameId} ${intensity} selection`).toBe(true);
        if (selected.ok) expect(selected.card.intensity).toBe(intensity);
      });
    });

    const spicyRatings = gameIds.flatMap((gameId) =>
      (cardsByGame.get(gameId) ?? [])
        .filter((card) => card.intensity === 'spicy')
        .map((card) => card.contentRating),
    );
    expect(spicyRatings).toContain('pg13-style');
    expect(spicyRatings).toContain('18-plus');
  }, 30_000);

  it('rejects a matching similarity group across games', () => {
    const first = contentCardsForGame('love-quiz').find((card) => card.intensity === 'mild');
    const second = contentCardsForGame('desire-match').find((card) => card.intensity === 'mild');
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;

    expect(isTooSimilar(
      { ...first, similarityGroup: second.similarityGroup },
      [],
      [second.similarityGroup],
    )).toBe(true);
  });

  it('calculates Jaccard similarity between two fingerprints accurately', () => {
    const simExact = jaccard('secret desire', 'secret desire');
    expect(simExact).toBe(1);

    const simDiff = jaccard('apple banana', 'orange grape');
    expect(simDiff).toBe(0);

    const simPartial = jaccard('kiss slow tender', 'kiss slow urgent');
    expect(simPartial).toBeGreaterThan(0.4);
  });

  it('excludes semantic repeats even when they are older than the recent window', () => {
    const oldFingerprint = fingerprint('A sincere story about trust');
    const unrelated = Array.from({ length: 30 }, (_, index) => `unrelated prompt ${index}`);
    const card = {
      similarityFingerprint: fingerprint('A sincere story about trust'),
    } as Parameters<typeof isTooSimilar>[0];
    expect(isTooSimilar(card, [...unrelated, oldFingerprint])).toBe(true);
  });

  it('selects valid content cards for games', () => {
    const res = selectNext({
      gameId: 'six-questions',
      intensity: 'spicy',
      excludedTopics: [],
      history: [],
      fingerprints: [],
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.card.gameId).toBe('six-questions');
      expect(res.card.prompt).toBeTruthy();
      expect(res.card.answerChoices?.length).toBeGreaterThan(0);
    }
  });

  it('strictly excludes previously encountered cards in history', () => {
    const res1 = selectNext({
      gameId: 'would-you-rather',
      intensity: 'mild',
      excludedTopics: [],
      history: [],
      fingerprints: [],
    });

    expect(res1.ok).toBe(true);
    if (res1.ok) {
      const seenId = res1.card.id;
      // Now request again with seenId in history
      const res2 = selectNext({
        gameId: 'would-you-rather',
        intensity: 'mild',
        excludedTopics: [],
        history: [seenId],
        fingerprints: [res1.card.similarityFingerprint],
      });

      expect(res2.ok).toBe(true);
      if (res2.ok) {
        expect(res2.card.id).not.toBe(seenId);
      }
    }
  });

  it('respects excluded user topics and boundaries', () => {
    const res = selectNext({
      gameId: 'six-questions',
      intensity: 'spicy',
      excludedTopics: ['arguments', 'conflict'],
      history: [],
      fingerprints: [],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.card.tags).not.toContain('arguments');
    }
  });

  it('keeps Truth or Dare selections at the exact selected intensity and history', () => {
    const request = {
      gameId: 'truth-or-dare',
      intensity: 'moderate' as const,
      excludedTopics: [],
      history: [],
      fingerprints: [],
    };
    const first = selectNext(request);

    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.card.intensity).toBe('moderate');

    const next = selectNext({
      ...request,
      history: [first.card.id],
      fingerprints: [first.card.similarityFingerprint],
    });

    expect(next.ok).toBe(true);
    if (next.ok) {
      expect(next.card.id).not.toBe(first.card.id);
      expect(next.card.similarityFingerprint).not.toBe(first.card.similarityFingerprint);
      expect(next.card.intensity).toBe('moderate');
    }
  });

  it('supports large catalog generation matching the scaling requirement', () => {
    const total = totalCatalogueSize();
    expect(total).toBeGreaterThanOrEqual(10_000);
  });

  it('audits all generated prompts and reports only valid unique experiences', () => {
    const report = auditCatalogue();
    expect(report.generatedExperiences).toBe(totalCatalogueSize());
    expect(report.duplicateIds).toBe(0);
    expect(report.exactDuplicateExperiences + report.nearDuplicateExperiences)
      .toBe(report.generatedExperiences - report.validUniqueExperiences);
    expect(report.duplicateNormalizedPrompts).toBe(0);
    expect(report.uniqueNormalizedPrompts).toBe(report.generatedExperiences);
    expect(report.nearDuplicateMetric).toBe('normalized-token-set-jaccard');
    expect(report.nearDuplicateThreshold).toBe(0.82);
    expect(report.requiredMetadataErrors).toBe(0);
    expect(report.gameCategorizationErrors).toBe(0);
    expect(report.uniqueNormalizedPrompts).toBeGreaterThan(0);
    expect(report.eligibility.privateBuild).toBeGreaterThan(0);
    expect(report.operationalChecks.noRepeatSelection).toBe('covered-by-selector-tests');
    expect(report.operationalChecks.pairSpecificHistory).toBe('not-synchronized-between-devices');
    expect(Object.keys(report.games)).toHaveLength(21);
    expect(report.validUniqueExperiences).toBeGreaterThanOrEqual(10_000);
    Object.values(report.games).forEach((game) => {
      expect(game.generated).toBeGreaterThan(0);
      expect(game.validUnique).toBeGreaterThan(0);
    });
  }, 60_000);
});
