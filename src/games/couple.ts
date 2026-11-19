export type CoupleRoundPhase =
  | 'handoff-answer'
  | 'answer'
  | 'handoff-predict'
  | 'predict'
  | 'reveal'
  | 'finished';

export interface CoupleChoiceRound {
  round: number;
  prompt: string;
  choices: [string, string, ...string[]];
  answer?: string;
  prediction?: string;
  revealed: boolean;
  matched: boolean;
}

export interface CoupleChoiceModel {
  version: 1;
  gameId: string;
  phase: CoupleRoundPhase;
  round: number;
  totalRounds: number;
  rounds: CoupleChoiceRound[];
  scores: [number, number];
  customChoice?: string;
}

export function createCoupleChoices(
  gameId: string,
  prompt: string,
  choices: [string, string, ...string[]],
  totalRounds = 5,
): CoupleChoiceModel {
  return {
    version: 1,
    gameId,
    phase: 'handoff-answer',
    round: 1,
    totalRounds,
    rounds: [{ round: 1, prompt, choices, revealed: false, matched: false }],
    scores: [0, 0],
  };
}

export function beginAnswer(model: CoupleChoiceModel): CoupleChoiceModel {
  return model.phase === 'handoff-answer' ? { ...model, phase: 'answer' } : model;
}

export function submitAnswer(model: CoupleChoiceModel, answer: string): CoupleChoiceModel {
  if (model.phase !== 'answer') return model;
  const rounds = [...model.rounds];
  rounds[rounds.length - 1] = { ...rounds[rounds.length - 1], answer };
  return { ...model, phase: 'handoff-predict', rounds };
}

export function beginPrediction(model: CoupleChoiceModel): CoupleChoiceModel {
  return model.phase === 'handoff-predict' ? { ...model, phase: 'predict' } : model;
}

export function submitPrediction(model: CoupleChoiceModel, prediction: string): CoupleChoiceModel {
  if (model.phase !== 'predict') return model;
  const rounds = [...model.rounds];
  const current = rounds[rounds.length - 1];
  const matched = normalize(current.answer) === normalize(prediction);
  const scores: [number, number] = [...model.scores];
  if (matched) scores[1] += 1;
  rounds[rounds.length - 1] = { ...current, prediction, revealed: true, matched };
  return { ...model, phase: 'reveal', rounds, scores };
}

export function nextCoupleRound(
  model: CoupleChoiceModel,
  prompt: string,
  choices: [string, string, ...string[]],
): CoupleChoiceModel {
  if (model.phase !== 'reveal') return model;
  if (model.round >= model.totalRounds) return { ...model, phase: 'finished' };
  const round = model.round + 1;
  return {
    ...model,
    phase: 'handoff-answer',
    round,
    rounds: [
      ...model.rounds,
      { round, prompt, choices, revealed: false, matched: false },
    ],
  };
}

export function matchingPercentage(model: CoupleChoiceModel): number {
  const revealed = model.rounds.filter((round) => round.revealed);
  if (revealed.length === 0) return 0;
  const matches = revealed.filter((round) => round.matched).length;
  return Math.round((matches / revealed.length) * 100);
}

function normalize(value?: string): string {
  return (value || '').trim().toLowerCase();
}
