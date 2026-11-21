import { describe, expect, it } from 'vitest';
import {
  acceptChallenge,
  completeSharedChallenge,
  createChallenge,
  createEmojiConfessionModel,
  createRouletteModel,
  createScenarioBuilderModel,
  createMenu,
  createPreferenceModel,
  createTemptationsModel,
  isTemptationsModel,
  isEmojiConfessionModel,
  isScenarioBuilderModel,
  isRouletteModel,
  isMenuModel,
  nextPreferenceRound,
  preferenceMatches,
  isChallengeModel,
  declineChallenge,
  pauseChallenge,
  resumeChallenge,
  revealAndAdvancePreferenceRound,
  revealMenu,
  revealChallenge,
  revealPreferenceRound,
  approveScenario,
  declineScenario,
  requestScenarioApproval,
  requestScenarioChanges,
  recordRouletteSpin,
  respondToTemptation,
  selectTemptation,
  setMenuRank,
  submitChallenge,
  submitEmojiConfession,
  submitEmojiGuess,
  submitMenuRanking,
  submitPrivateChoice,
  submitTemptationChoices,
  updateTemptationChoice,
  updateEmojiConfession,
  updateScenarioField,
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
    expect(isChallengeModel(model)).toBe(true);
    expect(submitChallenge(model, 0, 'too early')).toBe(model);
    model = acceptChallenge(model, 0);
    expect(submitChallenge(model, 0, 'before partner approval')).toBe(model);
    model = acceptChallenge(model, 1);
    expect(submitChallenge(model, 0, '   ')).toBe(model);
    model = submitChallenge(model, 0, 'Player one response');
    expect(revealChallenge(model).status).toBe('accepted');
    expect(submitChallenge(model, 0, 'replace my private answer')).toBe(model);
    model = submitChallenge(model, 1, 'Player two response');
    model = revealChallenge(model);
    expect(model.status).toBe('completed');
    expect(model.scores).toEqual([1, 1]);
  });

  it('lets either partner decline a pending activity without starting it', () => {
    let model = createChallenge('couple-challenges', 'Make a shared playlist');
    model = acceptChallenge(model, 0);
    expect(model.status).toBe('pending');
    model = declineChallenge(model);
    expect(model.status).toBe('declined');
    expect(acceptChallenge(model, 1)).toBe(model);
    const accepted = createChallenge('couple-challenges', 'Take a walk together', false);
    expect(declineChallenge(accepted).status).toBe('declined');
  });

  it('supports pausing and resuming an accepted activity', () => {
    let model = createChallenge('couple-challenges', 'Take a mindful break');
    model = acceptChallenge(model, 0);
    model = acceptChallenge(model, 1);
    model = pauseChallenge(model);
    expect(submitChallenge(model, 0, 'too early')).toBe(model);
    model = resumeChallenge(model);
    model = completeSharedChallenge(model);
    expect(model).toMatchObject({ status: 'completed', scores: [1, 1] });
  });

  it('keeps Love Language as a persisted five-item private ranking game', () => {
    const model = createMenu([
      'Words of affirmation',
      'Quality time',
      'Receiving gifts',
      'Acts of service',
      'Physical touch',
    ], 'love-language');
    expect(isMenuModel(model)).toBe(true);
    expect(model.gameId).toBe('love-language');
    expect(model.items[0]).toHaveLength(5);
    expect(model.items[1].map((item) => item.rank)).toEqual([0, 1, 2, 3, 4]);
  });

  it('requires four distinct Temptations choices, partner selection, and explicit approval', () => {
    let model = createTemptationsModel();
    expect(isTemptationsModel(model)).toBe(true);
    expect(submitTemptationChoices(model)).toBe(model);
    model = updateTemptationChoice(model, 0, 'A quiet evening');
    model = updateTemptationChoice(model, 1, 'Cook together');
    model = updateTemptationChoice(model, 2, 'A walk at sunset');
    model = updateTemptationChoice(model, 3, 'A handwritten note');
    expect(updateTemptationChoice(model, 4, 'Invalid index')).toBe(model);
    model = submitTemptationChoices(model);
    expect(model.status).toBe('awaiting-selection');
    expect(respondToTemptation(model, true)).toBe(model);
    model = selectTemptation(model, 2);
    expect(model).toMatchObject({ status: 'awaiting-approval', selectedIndex: 2 });
    expect(submitTemptationChoices(model)).toBe(model);
    model = respondToTemptation(model, true);
    expect(model.status).toBe('approved');
    expect(selectTemptation(model, 1)).toBe(model);
  });

  it('allows passing a Temptations choice without approval', () => {
    let model = createTemptationsModel();
    model = updateTemptationChoice(model, 0, 'One');
    model = updateTemptationChoice(model, 1, 'Two');
    model = updateTemptationChoice(model, 2, 'Three');
    model = updateTemptationChoice(model, 3, 'Four');
    model = submitTemptationChoices(model);
    model = respondToTemptation(model, false);
    expect(model.status).toBe('declined');
    expect(respondToTemptation(model, true)).toBe(model);
  });

  it('keeps an emoji confession hidden until the partner submits an interpretation', () => {
    let model = createEmojiConfessionModel();
    expect(isEmojiConfessionModel(model)).toBe(true);
    model = updateEmojiConfession(model, 'emojis', '🌹💌');
    expect(submitEmojiConfession(model)).toBe(model);
    model = updateEmojiConfession(model, 'confession', 'I want to plan a surprise date.');
    model = submitEmojiConfession(model);
    expect(model.status).toBe('awaiting-guess');
    expect(model.guess).toBeUndefined();
    expect(submitEmojiGuess(model, '   ')).toBe(model);
    model = submitEmojiGuess(model, 'A secret romantic plan');
    expect(model).toMatchObject({
      status: 'revealed',
      confession: 'I want to plan a surprise date.',
      guess: 'A secret romantic plan',
    });
    expect(updateEmojiConfession(model, 'emojis', '🔥')).toBe(model);
  });

  it('persists Scenario Builder edits and requires partner approval', () => {
    let model = createScenarioBuilderModel();
    expect(isScenarioBuilderModel(model)).toBe(true);
    model = updateScenarioField(model, 'setting', 'A quiet cabin');
    expect(model.setting).toBe('A quiet cabin');
    model = requestScenarioApproval(model);
    expect(model.status).toBe('awaiting-approval');
    expect(updateScenarioField(model, 'setting', 'Changed without review')).toBe(model);
    model = requestScenarioChanges(model);
    expect(model.status).toBe('draft');
    model = requestScenarioApproval(model);
    model = approveScenario(model);
    expect(model.status).toBe('approved');
    expect(declineScenario(model)).toBe(model);
  });

  it('records unique roulette cards and rejects repeats or cards from another game', () => {
    let model = createRouletteModel('romantic-roulette');
    const first = {
      gameId: 'romantic-roulette',
      id: 'romantic-card-1',
      prompt: 'Take a walk with no destination.',
      similarityFingerprint: 'walk destination',
    };
    model = recordRouletteSpin(model, first);
    expect(isRouletteModel(model)).toBe(true);
    expect(model.spinCount).toBe(1);
    expect(recordRouletteSpin(model, first)).toBe(model);
    expect(recordRouletteSpin(model, { ...first, gameId: 'naughty-roulette' })).toBe(model);
    model = recordRouletteSpin(model, { ...first, id: 'romantic-card-2' });
    expect(model.spinCount).toBe(2);
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
