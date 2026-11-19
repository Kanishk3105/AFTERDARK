import type { ChallengeState, TwistLevel } from '@/types';

export interface TodStep {
  text: string;
  status: 'pending' | 'approved' | 'skipped' | 'swapped';
}

export type TodPhase =
  | 'choose'
  | 'presented'
  | 'alternative'
  | 'video-offer'
  | 'compose-steps'
  | 'step'
  | 'paused'
  | 'resolved';

export interface TodModel {
  version: 1;
  chooser: 0 | 1;
  recipient: 0 | 1;
  kind: 'truth' | 'dare' | null;
  challengeState: ChallengeState;
  twistLevel: TwistLevel;
  strikes: [number, number];
  phase: TodPhase;
  prompt: string;
  promptId?: string;
  alternative?: string;
  steps: TodStep[];
  stepIndex: number;
  points: [number, number];
  log: string[];
  pausedFrom?: TodPhase;
  round: number;
}

export function createTod(level: TwistLevel): TodModel {
  return {
    version: 1,
    chooser: 0,
    recipient: 1,
    kind: null,
    challengeState: 'pending',
    twistLevel: level,
    strikes: [0, 0],
    phase: 'choose',
    prompt: '',
    steps: [],
    stepIndex: 0,
    points: [0, 0],
    log: [],
    round: 1,
  };
}

function withLog(model: TodModel, line: string, patch: Partial<TodModel>): TodModel {
  return { ...model, ...patch, log: [...model.log, line].slice(-40) };
}

export function chooseKind(
  model: TodModel,
  kind: 'truth' | 'dare',
  prompt: string,
  promptId?: string,
): TodModel {
  if (model.phase !== 'choose') return model;
  if (model.twistLevel === 'five-step') {
    return withLog(model, `${kind} opens the five-step terminal`, {
      kind,
      prompt,
      promptId,
      challengeState: 'pending',
      phase: 'compose-steps',
      steps: [],
      stepIndex: 0,
    });
  }
  return withLog(model, `Chose ${kind}`, {
    kind,
    prompt,
    promptId,
    challengeState: 'pending',
    phase: 'presented',
  });
}

export function acceptChallenge(model: TodModel): TodModel {
  if (model.phase !== 'presented' && model.phase !== 'alternative') return model;
  return withLog(model, 'Accepted', { challengeState: 'accepted', phase: 'presented' });
}

export function completeChallenge(model: TodModel): TodModel {
  if (model.challengeState === 'passed') return model;
  const points: [number, number] = [...model.points];
  points[model.recipient] += 1;
  return withLog(model, 'Completed', {
    challengeState: 'completed',
    phase: 'resolved',
    points,
  });
}

export function passChallenge(model: TodModel, alternative?: string): TodModel {
  const strikes: [number, number] = [...model.strikes];
  strikes[model.recipient] = Math.min(3, strikes[model.recipient] + 1);
  if (model.twistLevel === 'easy' && alternative) {
    return withLog(model, 'Passed — an optional alternative is available', {
      challengeState: 'passed',
      strikes,
      phase: 'alternative',
      alternative,
    });
  }
  if (model.twistLevel === 'adventure' && model.kind === 'truth' && alternative) {
    return withLog(model, 'Passed the truth — an optional dare is available', {
      challengeState: 'passed',
      strikes,
      phase: 'alternative',
      alternative,
      kind: 'dare',
    });
  }
  if (model.twistLevel === 'adventure' && model.kind === 'dare') {
    return withLog(model, 'Passed the dare — video is optional', {
      challengeState: 'passed',
      strikes,
      phase: 'video-offer',
      alternative,
    });
  }
  return withLog(model, 'Passed', {
    challengeState: 'passed',
    strikes,
    phase: 'resolved',
    alternative,
  });
}

export function declineAlternative(model: TodModel): TodModel {
  return withLog(model, 'Declined the alternative. Nothing further is required.', {
    challengeState: 'passed',
    phase: 'resolved',
  });
}

export function swapIn(model: TodModel, prompt: string, promptId?: string): TodModel {
  return withLog(model, 'Swapped for a different challenge', {
    challengeState: 'swapped',
    phase: 'presented',
    prompt,
    promptId,
    alternative: undefined,
  });
}

export function pauseGame(model: TodModel): TodModel {
  if (model.phase === 'paused' || model.phase === 'resolved') return model;
  return withLog(model, 'Paused', { phase: 'paused', pausedFrom: model.phase, challengeState: 'paused' });
}

export function resumeGame(model: TodModel): TodModel {
  if (model.phase !== 'paused') return model;
  return withLog(model, 'Resumed', {
    phase: model.pausedFrom && model.pausedFrom !== 'paused' ? model.pausedFrom : 'presented',
    challengeState: 'pending',
  });
}

export function setSteps(model: TodModel, texts: string[]): TodModel {
  const steps = texts.slice(0, 5).map((text) => ({ text: text.trim(), status: 'pending' as const }));
  if (steps.length !== 5 || steps.some((step) => !step.text)) return model;
  return { ...model, steps, stepIndex: 0, phase: 'step', challengeState: 'pending' };
}

export function approveStep(model: TodModel): TodModel {
  return advanceStep(model, 'approved');
}

export function skipStep(model: TodModel): TodModel {
  const strikes: [number, number] = [...model.strikes];
  strikes[model.recipient] = Math.min(3, strikes[model.recipient] + 1);
  return advanceStep({ ...model, strikes }, 'skipped');
}

export function swapStep(model: TodModel, text: string): TodModel {
  const steps = model.steps.map((step, index) =>
    index === model.stepIndex ? { text, status: 'swapped' as const } : step,
  );
  return advanceStep({ ...model, steps }, 'swapped');
}

function advanceStep(model: TodModel, status: TodStep['status']): TodModel {
  if (model.phase !== 'step') return model;
  const steps = model.steps.map((step, index) => (index === model.stepIndex ? { ...step, status } : step));
  const next = model.stepIndex + 1;
  if (next >= steps.length) {
    const points: [number, number] = [...model.points];
    if (steps.some((step) => step.status === 'approved' || step.status === 'swapped')) {
      points[model.recipient] += 1;
    }
    return withLog(model, `Step ${model.stepIndex + 1} ${status}. Sequence complete.`, {
      steps,
      stepIndex: model.stepIndex,
      phase: 'resolved',
      challengeState: 'completed',
      points,
    });
  }
  return withLog(model, `Step ${model.stepIndex + 1} ${status}`, {
    steps,
    stepIndex: next,
    phase: 'step',
  });
}

export function endSteps(model: TodModel): TodModel {
  return withLog(model, 'The recipient ended the sequence. Remaining steps are not required.', {
    phase: 'resolved',
    challengeState: 'passed',
  });
}

export function nextTurn(model: TodModel): TodModel {
  const chooser = model.recipient;
  return {
    ...createTod(model.twistLevel),
    chooser,
    recipient: chooser === 0 ? 1 : 0,
    strikes: model.strikes,
    points: model.points,
    log: model.log,
    round: model.round + 1,
  };
}
