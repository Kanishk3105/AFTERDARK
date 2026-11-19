export type PreferenceChoice = 'yes' | 'maybe' | 'no';

export interface SimultaneousChoice {
  round: number;
  prompt: string;
  a?: PreferenceChoice;
  b?: PreferenceChoice;
  revealed: boolean;
}

export interface PreferenceModel {
  gameId: string;
  rounds: SimultaneousChoice[];
  roundIndex: number;
  completed: boolean;
}

export function createPreferenceModel(gameId: string, prompts: string[]): PreferenceModel {
  return {
    gameId,
    rounds: prompts.map((prompt, round) => ({ round, prompt, revealed: false })),
    roundIndex: 0,
    completed: false,
  };
}

export function submitPrivateChoice(
  model: PreferenceModel,
  player: 'a' | 'b',
  choice: PreferenceChoice,
): PreferenceModel {
  const rounds = model.rounds.map((round, index) =>
    index === model.roundIndex ? { ...round, [player]: choice } : round,
  );
  return { ...model, rounds };
}

export function revealPreferenceRound(model: PreferenceModel): PreferenceModel {
  const round = model.rounds[model.roundIndex];
  if (!round?.a || !round?.b) return model;
  const rounds = model.rounds.map((item, index) =>
    index === model.roundIndex ? { ...item, revealed: true } : item,
  );
  return { ...model, rounds };
}

export function preferenceMatches(model: PreferenceModel): number {
  const revealed = model.rounds.filter((round) => round.revealed);
  return revealed.filter((round) => round.a === round.b).length;
}

export function nextPreferenceRound(model: PreferenceModel): PreferenceModel {
  const nextIndex = model.roundIndex + 1;
  if (nextIndex >= model.rounds.length) return { ...model, completed: true };
  return { ...model, roundIndex: nextIndex };
}

export interface ChallengeModel {
  gameId: string;
  prompt: string;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  submissions: [string?, string?];
  scores: [number, number];
}

export function createChallenge(gameId: string, prompt: string): ChallengeModel {
  return { gameId, prompt, status: 'pending', submissions: [], scores: [0, 0] };
}

export function acceptChallenge(model: ChallengeModel): ChallengeModel {
  return { ...model, status: 'accepted' };
}

export function submitChallenge(model: ChallengeModel, player: 0 | 1, submission: string): ChallengeModel {
  const submissions: [string?, string?] = [...model.submissions];
  submissions[player] = submission;
  return { ...model, submissions };
}

export function revealChallenge(model: ChallengeModel): ChallengeModel {
  if (!model.submissions[0] || !model.submissions[1]) return model;
  const scores: [number, number] = [...model.scores];
  scores[0] += 1;
  scores[1] += 1;
  return { ...model, status: 'completed', scores };
}

export interface RankedItem {
  id: string;
  label: string;
  rank: number;
}

export interface MenuModel {
  items: RankedItem[];
  submitted: [boolean, boolean];
  revealed: boolean;
}

export function createMenu(items: string[]): MenuModel {
  return {
    items: items.map((label, index) => ({ id: `menu-${index}`, label, rank: index })),
    submitted: [false, false],
    revealed: false,
  };
}

export function setMenuRank(model: MenuModel, player: 0 | 1, itemId: string, rank: number): MenuModel {
  const items = model.items.map((item) => (item.id === itemId ? { ...item, rank } : item));
  const submitted: [boolean, boolean] = [...model.submitted];
  submitted[player] = true;
  return { ...model, items, submitted };
}
