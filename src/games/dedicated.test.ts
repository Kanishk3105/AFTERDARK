import { describe, expect, it } from 'vitest';
import {
  acceptChallenge,
  createChallenge,
  createMenu,
  createPreferenceModel,
  nextPreferenceRound,
  preferenceMatches,
  revealAndAdvancePreferenceRound,
  revealChallenge,
  revealPreferenceRound,
  submitChallenge,
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
    model = revealAndAdvancePreferenceRound(model);
    expect(model.roundIndex).toBe(1);
    expect(model.rounds[0]).toMatchObject({ a: 'yes', b: 'no', revealed: true });
    expect(preferenceMatches(model)).toBe(0);
  });

  it('requires both challenge submissions before completion', () => {
    let model = createChallenge('challenge-duel', 'Share a sincere compliment');
    model = acceptChallenge(model);
    model = submitChallenge(model, 0, 'Player one response');
    expect(revealChallenge(model).status).toBe('accepted');
    model = submitChallenge(model, 1, 'Player two response');
    model = revealChallenge(model);
    expect(model.status).toBe('completed');
    expect(model.scores).toEqual([1, 1]);
  });

  it('creates a private menu from ranked items', () => {
    const model = createMenu(['Slow evening', 'Adventure', 'Deep conversation']);
    expect(model.items).toHaveLength(3);
    expect(model.submitted).toEqual([false, false]);
  });
});
