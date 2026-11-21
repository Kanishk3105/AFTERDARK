import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MOODS, TROPHIES } from '@/config/app.config';
import {
  AFTERDARK_ASSETS,
  ALL_AFTERDARK_ASSET_PATHS,
  getGameCover,
  getTrophyArt,
} from './afterdark';

describe('AFTERDARK visual asset registry', () => {
  it('resolves every unique registered path to a supplied public file', () => {
    expect(ALL_AFTERDARK_ASSET_PATHS).toHaveLength(85);
    expect(new Set(ALL_AFTERDARK_ASSET_PATHS).size).toBe(85);

    for (const assetPath of ALL_AFTERDARK_ASSET_PATHS) {
      expect(assetPath).toMatch(/^\/assets\/afterdark\//);
      expect(existsSync(resolve(process.cwd(), 'public', assetPath.slice(1)))).toBe(true);
    }
  });

  it('maps every configured game and trophy to its own illustration', () => {
    const gameIds = MOODS.flatMap((mood) => mood.games.map((game) => game.id)).sort();
    const trophyIds = TROPHIES.map((trophy) => trophy.id).sort();

    expect(Object.keys(AFTERDARK_ASSETS.games).sort()).toEqual(gameIds);
    expect(Object.keys(AFTERDARK_ASSETS.trophies).sort()).toEqual(trophyIds);
    expect(Object.values(AFTERDARK_ASSETS.games).every((path) => path.endsWith('.svg'))).toBe(true);
    expect(Object.values(AFTERDARK_ASSETS.trophies).every((path) => path.endsWith('.svg'))).toBe(true);
  });

  it('uses neutral registered artwork for unknown game and trophy IDs', () => {
    expect(getGameCover('not-a-game')).toBe(AFTERDARK_ASSETS.ui.cardBack);
    expect(getTrophyArt('not-a-trophy')).toBe(AFTERDARK_ASSETS.brand.emblem);
    expect(getGameCover('toString')).toBe(AFTERDARK_ASSETS.ui.cardBack);
    expect(getTrophyArt('constructor')).toBe(AFTERDARK_ASSETS.brand.emblem);
  });
});
