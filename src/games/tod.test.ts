import { describe, it, expect } from 'vitest';
import {
  createTod,
  chooseKind,
  acceptChallenge,
  completeChallenge,
  passChallenge,
  swapIn,
  pauseGame,
  resumeGame,
  setSteps,
  approveStep,
  skipStep,
  swapStep,
  nextTurn,
} from './tod';

describe('Truth or Dare Engine with Three-Level Twist Ladder', () => {
  it('initializes with level and correct default state', () => {
    const tod = createTod('adventure');
    expect(tod.twistLevel).toBe('adventure');
    expect(tod.phase).toBe('choose');
    expect(tod.strikes).toEqual([0, 0]);
    expect(tod.points).toEqual([0, 0]);
    expect(tod.round).toBe(1);
  });

  it('allows choosing Truth or Dare', () => {
    let tod = createTod('easy');
    tod = chooseKind(tod, 'truth', 'What is your secret desire?');
    expect(tod.phase).toBe('presented');
    expect(tod.kind).toBe('truth');
    expect(tod.prompt).toBe('What is your secret desire?');
  });

  it('awards points upon completion', () => {
    let tod = createTod('easy');
    tod = chooseKind(tod, 'truth', 'Tell the truth');
    tod = acceptChallenge(tod);
    expect(tod.challengeState).toBe('accepted');
    tod = completeChallenge(tod);
    expect(tod.challengeState).toBe('completed');
    expect(tod.points[tod.recipient]).toBe(1);
    expect(tod.phase).toBe('resolved');
  });

  it('handles Level 1 Easy Twist: pass challenge offers alternative', () => {
    let tod = createTod('easy');
    tod = chooseKind(tod, 'truth', 'Difficult truth');
    tod = passChallenge(tod, 'Easy alternative challenge');
    expect(tod.challengeState).toBe('passed');
    expect(tod.strikes[tod.recipient]).toBe(1);
    expect(tod.phase).toBe('alternative');
    expect(tod.alternative).toBe('Easy alternative challenge');
  });

  it('handles Level 2 Adventure Twist: pass truth offers dare alternative, pass dare offers video option', () => {
    let tod = createTod('adventure');
    tod = chooseKind(tod, 'truth', 'Intense truth');
    tod = passChallenge(tod, 'Adventurous dare');
    expect(tod.phase).toBe('alternative');
    expect(tod.kind).toBe('dare');

    let todDare = createTod('adventure');
    todDare = chooseKind(todDare, 'dare', 'Intense dare');
    todDare = passChallenge(todDare, 'Video performance');
    expect(todDare.phase).toBe('video-offer');
  });

  it('handles Level 3 Five-Step Twist Terminal sequence', () => {
    let tod = createTod('five-step');
    tod = chooseKind(tod, 'dare', 'Five step dare');
    expect(tod.phase).toBe('compose-steps');

    const steps = [
      'Step 1: Soft gaze',
      'Step 2: Gentle kiss',
      'Step 3: Shoulder touch',
      'Step 4: Whisper line',
      'Step 5: Hold hands',
    ];

    tod = setSteps(tod, steps);
    expect(tod.phase).toBe('step');
    expect(tod.stepIndex).toBe(0);

    // Approve step 1
    tod = approveStep(tod);
    expect(tod.stepIndex).toBe(1);

    // Skip step 2 (should add strike)
    tod = skipStep(tod);
    expect(tod.stepIndex).toBe(2);
    expect(tod.strikes[tod.recipient]).toBe(1);

    // Swap step 3
    tod = swapStep(tod, 'Swapped step 3');
    expect(tod.stepIndex).toBe(3);

    // Approve step 4 and 5
    tod = approveStep(tod);
    tod = approveStep(tod);
    expect(tod.phase).toBe('resolved');
    expect(tod.challengeState).toBe('completed');
  });

  it('alternates chooser and recipient on nextTurn', () => {
    let tod = createTod('adventure');
    expect(tod.chooser).toBe(0);
    expect(tod.recipient).toBe(1);

    const next = nextTurn(tod);
    expect(next.chooser).toBe(1);
    expect(next.recipient).toBe(0);
    expect(next.round).toBe(2);
  });
});
