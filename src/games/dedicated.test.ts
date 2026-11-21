import { describe, expect, it } from 'vitest';
import {
  acceptChallenge,
  createChallenge,
  createMenu,
  createPreferenceModel,
  isMenuModel,
  nextPreferenceRound,
  preferenceMatches,
  revealAndAdvancePreferenceRound,
  revealMenu,
  revealChallenge,
  revealPreferenceRound,
  setMenuRank,
  submitChallenge,
  submitMenuRanking,
  submitPrivateChoice,
} from './dedicated';

describe('Dedicated couple game engines', () => {
  it('requires both preference choices before reveal', () => {
    let model = createPreferenceModel('desire-match', ['Close', 'Playful']);
    model = submitPrivateChoice(model, 'a', 'yes');
    expect(revealPreferenceRound(model).rounds[0].revealed).toBe(false);
    model = submitPrivateChoice(model, 'b', 'yes');
    model = revealPreferenceRound(model);
    expect(model.rounds[0].revealed).toBe(true);
    expect(preferenceMatches(model)).toBe(1);
  });

  it('advances or completes preference rounds', () => {
    let model = createPreferenceModel('desire-match', ['One']);
    expect(nextPreferenceRound(model)).toBe(model);
    model = submitPrivateChoice(model, 'a', 'yes');
    model = submitPrivateChoice(model, 'b', 'yes');
    model = revealPreferenceRound(model);
    model = nextPreferenceRound(model);
    expect(model.completed).toBe(true);
  });

  it('reveals submitted choices before advancing the round', () => {
    let model = createPreferenceModel('love-quiz', ['One', 'Two']);
    model = submitPrivateChoice(model, 'a', 'yes');
    model = submitPrivateChoice(model, 'b', 'no');
    const revealed = revealPreferenceRound(model);
    expect(submitPrivateChoice(revealed, 'a', 'maybe')).toBe(revealed);
    model = revealAndAdvancePreferenceRound(model);
    expect(model.roundIndex).toBe(1);
    expect(model.rounds[0]).toMatchObject({ a: 'yes', b: 'no', revealed: true });
    expect(preferenceMatches(model)).toBe(0);
  });

  it('requires both challenge submissions before completion', () => {
    let model = createChallenge('challenge-duel', 'Share a sincere compliment');
    expect(submitChallenge(model, 0, 'too early')).toBe(model);
    model = acceptChallenge(model);
    expect(submitChallenge(model, 0, '   ')).toBe(model);
    model = submitChallenge(model, 0, 'Player one response');
    expect(revealChallenge(model).status).toBe('accepted');
    model = submitChallenge(model, 1, 'Player two response');
    model = revealChallenge(model);
    expect(model.status).toBe('completed');
    expect(model.scores).toEqual([1, 1]);
  });

  it('creates a private menu from ranked items', () => {
    const model = createMenu(['Slow evening', 'Adventure', 'Deep conversation']);
    expect(isMenuModel(model)).toBe(true);
    expect(model.items[0]).toHaveLength(3);
    expect(model.items[1]).toHaveLength(3);
    expect(model.submitted).toEqual([false, false]);
    expect(isMenuModel({ items: [], submitted: [], revealed: false, matchingRanks: 0 })).toBe(false);
  });

  it('keeps menu rankings private and reveals only after both unique rankings are submitted', () => {
    let model = createMenu(['Slow evening', 'Adventure', 'Deep conversation']);
    model = setMenuRank(model, 0, 'menu-0', 1);
    expect(submitMenuRanking(model, 0).submitted[0]).toBe(false);
    model = setMenuRank(model, 0, 'menu-1', 0);
    expect(model.items[1].map((item) => item.rank)).toEqual([0, 1, 2]);
    expect(submitMenuRanking(model, 0).submitted[0]).toBe(true);

    model = submitMenuRanking(model, 0);
    expect(revealMenu(model).revealed).toBe(false);
    model = setMenuRank(model, 1, 'menu-0', 2);
    model = setMenuRank(model, 1, 'menu-1', 0);
    model = setMenuRank(model, 1, 'menu-2', 1);
    model = submitMenuRanking(model, 1);
    model = revealMenu(model);
    expect(model).toMatchObject({ revealed: true, matchingRanks: 1 });
    expect(setMenuRank(model, 1, 'menu-0', 0)).toBe(model);
  });
});
