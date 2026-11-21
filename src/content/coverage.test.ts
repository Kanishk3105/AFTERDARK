import { describe, expect, it } from 'vitest';
import { MOODS } from '@/config/app.config';
import { buildGameContentCoverage } from './coverage';

describe('game content coverage matrix', () => {
  it('reports all 21 games and all four non-empty intensity pools', () => {
    const matrix = buildGameContentCoverage();
    const expectedGameIds = MOODS.flatMap((mood) => mood.games.map((game) => game.id)).sort();

    expect(matrix.map((entry) => entry.gameId).sort()).toEqual(expectedGameIds);
    expect(matrix).toHaveLength(21);
    matrix.forEach((entry) => {
      expect(entry.gameplayImplementation).toBeTruthy();
      expect(entry.existingContentCount).toBeGreaterThan(0);
      expect(Object.values(entry.byIntensity)).toHaveLength(4);
      Object.values(entry.byIntensity).forEach((count) => {
        expect(count).toBeGreaterThan(0);
      });
      expect(entry.selectionLogic).toContain('Atomic');
      expect(entry.historyIntegration).toContain('Dexie');
      expect(entry.historyIntegration).toContain('no pair synchronization');
      expect(entry.boundaryIntegration).toContain('not implemented');
      expect(entry.automatedTestCoverage).toBeTruthy();
    });
  });
});
