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
  if (model.completed || model.rounds[model.roundIndex]?.revealed) return model;
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
  if (model.completed || !model.rounds[model.roundIndex]?.revealed) return model;
  const nextIndex = model.roundIndex + 1;
  if (nextIndex >= model.rounds.length) return { ...model, completed: true };
  return { ...model, roundIndex: nextIndex };
}

export function revealAndAdvancePreferenceRound(model: PreferenceModel): PreferenceModel {
  return nextPreferenceRound(revealPreferenceRound(model));
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
  if (model.status !== 'pending') return model;
  return { ...model, status: 'accepted' };
}

export function submitChallenge(model: ChallengeModel, player: 0 | 1, submission: string): ChallengeModel {
  if (model.status !== 'accepted' || !submission.trim()) return model;
  const submissions: [string?, string?] = [...model.submissions];
  submissions[player] = submission;
  return { ...model, submissions };
}

export function revealChallenge(model: ChallengeModel): ChallengeModel {
  if (model.status !== 'accepted' || !model.submissions[0]?.trim() || !model.submissions[1]?.trim()) {
    return model;
  }
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
  items: [RankedItem[], RankedItem[]];
  submitted: [boolean, boolean];
  revealed: boolean;
  matchingRanks: number;
}

export function createMenu(items: string[]): MenuModel {
  return {
    items: [
      items.map((label, index) => ({ id: `menu-${index}`, label, rank: index })),
      items.map((label, index) => ({ id: `menu-${index}`, label, rank: index })),
    ],
    submitted: [false, false],
    revealed: false,
    matchingRanks: 0,
  };
}

export function setMenuRank(model: MenuModel, player: 0 | 1, itemId: string, rank: number): MenuModel {
  if (model.revealed || model.submitted[player] || !Number.isInteger(rank)) return model;
  const playerItems = model.items[player];
  if (rank < 0 || rank >= playerItems.length || !playerItems.some((item) => item.id === itemId)) {
    return model;
  }
  const items: [RankedItem[], RankedItem[]] = [...model.items];
  items[player] = playerItems.map((item) => item.id === itemId ? { ...item, rank } : item);
  return { ...model, items };
}

export function submitMenuRanking(model: MenuModel, player: 0 | 1): MenuModel {
  if (model.revealed || model.submitted[player]) return model;
  const ranks = model.items[player].map((item) => item.rank).sort((a, b) => a - b);
  if (ranks.some((rank, index) => rank !== index)) return model;
  const submitted: [boolean, boolean] = [...model.submitted];
  submitted[player] = true;
  return { ...model, submitted };
}

export function revealMenu(model: MenuModel): MenuModel {
  if (model.revealed || !model.submitted[0] || !model.submitted[1]) return model;
  const partnerRanks = new Map(model.items[1].map((item) => [item.id, item.rank]));
  const matchingRanks = model.items[0].filter((item) => partnerRanks.get(item.id) === item.rank).length;
  return { ...model, revealed: true, matchingRanks };
}
