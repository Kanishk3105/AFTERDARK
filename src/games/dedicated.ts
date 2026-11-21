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
  status: 'pending' | 'accepted' | 'completed' | 'declined' | 'paused';
  acceptances: [boolean, boolean];
  submissions: [string?, string?];
  scores: [number, number];
}

export function createChallenge(
  gameId: string,
  prompt: string,
  requiresConsent = true,
): ChallengeModel {
  const accepted = !requiresConsent;
  return {
    gameId,
    prompt,
    status: accepted ? 'accepted' : 'pending',
    acceptances: [accepted, accepted],
    submissions: [undefined, undefined],
    scores: [0, 0],
  };
}

export function isChallengeModel(value: unknown): value is ChallengeModel {
  if (!value || typeof value !== 'object') return false;
  const model = value as Record<string, unknown>;
  const acceptances = model.acceptances;
  const submissions = model.submissions;
  const scores = model.scores;
  return typeof model.gameId === 'string'
    && typeof model.prompt === 'string'
    && ['pending', 'accepted', 'completed', 'declined', 'paused'].includes(String(model.status))
    && Array.isArray(acceptances)
    && acceptances.length === 2
    && acceptances.every((accepted) => typeof accepted === 'boolean')
    && Array.isArray(submissions)
    && submissions.length === 2
    && submissions.every((submission) => submission === undefined || typeof submission === 'string')
    && Array.isArray(scores)
    && scores.length === 2
    && scores.every((score) => Number.isInteger(score) && score >= 0);
}

export function acceptChallenge(model: ChallengeModel, player: 0 | 1): ChallengeModel {
  if (model.status !== 'pending') return model;
  const acceptances: [boolean, boolean] = [...model.acceptances];
  acceptances[player] = true;
  return {
    ...model,
    acceptances,
    status: acceptances.every(Boolean) ? 'accepted' : 'pending',
  };
}

export function declineChallenge(model: ChallengeModel): ChallengeModel {
  if (!['pending', 'accepted', 'paused'].includes(model.status)) return model;
  return { ...model, status: 'declined' };
}

export function pauseChallenge(model: ChallengeModel): ChallengeModel {
  if (model.status !== 'accepted') return model;
  return { ...model, status: 'paused' };
}

export function resumeChallenge(model: ChallengeModel): ChallengeModel {
  if (model.status !== 'paused') return model;
  return { ...model, status: 'accepted' };
}

export function submitChallenge(model: ChallengeModel, player: 0 | 1, submission: string): ChallengeModel {
  if (model.status !== 'accepted' || !submission.trim() || model.submissions[player]) return model;
  const submissions: [string?, string?] = [...model.submissions];
  submissions[player] = submission;
  return { ...model, submissions };
}

export function revealChallenge(model: ChallengeModel, scoreBoth = true): ChallengeModel {
  if (model.status !== 'accepted' || !model.submissions[0]?.trim() || !model.submissions[1]?.trim()) {
    return model;
  }
  const scores: [number, number] = scoreBoth
    ? [model.scores[0] + 1, model.scores[1] + 1]
    : [...model.scores];
  return { ...model, status: 'completed', scores };
}

export function completeSharedChallenge(model: ChallengeModel): ChallengeModel {
  if (model.status !== 'accepted') return model;
  return {
    ...model,
    status: 'completed',
    scores: [model.scores[0] + 1, model.scores[1] + 1],
  };
}

export interface TemptationsModel {
  gameId: 'temptations';
  choices: [string, string, string, string];
  status: 'draft' | 'awaiting-selection' | 'awaiting-approval' | 'approved' | 'declined';
  selectedIndex?: 0 | 1 | 2 | 3;
}

function isTemptationIndex(index: number): index is 0 | 1 | 2 | 3 {
  return Number.isInteger(index) && index >= 0 && index < 4;
}

export function createTemptationsModel(): TemptationsModel {
  return {
    gameId: 'temptations',
    choices: ['', '', '', ''],
    status: 'draft',
  };
}

export function isTemptationsModel(value: unknown): value is TemptationsModel {
  if (!value || typeof value !== 'object') return false;
  const model = value as Record<string, unknown>;
  return model.gameId === 'temptations'
    && Array.isArray(model.choices)
    && model.choices.length === 4
    && model.choices.every((choice) => typeof choice === 'string')
    && ['draft', 'awaiting-selection', 'awaiting-approval', 'approved', 'declined'].includes(String(model.status))
    && (model.selectedIndex === undefined
      || (Number.isInteger(model.selectedIndex) && Number(model.selectedIndex) >= 0 && Number(model.selectedIndex) <= 3));
}

export function updateTemptationChoice(
  model: TemptationsModel,
  index: number,
  value: string,
): TemptationsModel {
  if (model.status !== 'draft' || !isTemptationIndex(index) || value.length > 120) return model;
  const choices: [string, string, string, string] = [...model.choices];
  choices[index] = value;
  return { ...model, choices };
}

export function submitTemptationChoices(model: TemptationsModel): TemptationsModel {
  if (model.status !== 'draft') return model;
  const normalized = model.choices.map((choice) => choice.trim().toLowerCase());
  if (normalized.some((choice) => !choice) || new Set(normalized).size !== normalized.length) return model;
  return {
    ...model,
    choices: [
      model.choices[0].trim(),
      model.choices[1].trim(),
      model.choices[2].trim(),
      model.choices[3].trim(),
    ],
    status: 'awaiting-selection',
  };
}

export function selectTemptation(model: TemptationsModel, index: number): TemptationsModel {
  if (model.status !== 'awaiting-selection' || !isTemptationIndex(index)) return model;
  return { ...model, status: 'awaiting-approval', selectedIndex: index };
}

export function respondToTemptation(model: TemptationsModel, approved: boolean): TemptationsModel {
  if (approved && model.status !== 'awaiting-approval') return model;
  if (!approved && !['awaiting-selection', 'awaiting-approval'].includes(model.status)) return model;
  return { ...model, status: approved ? 'approved' : 'declined' };
}

export interface EmojiConfessionModel {
  gameId: 'emoji-confessions';
  emojis: string;
  confession: string;
  guess?: string;
  status: 'draft' | 'awaiting-guess' | 'revealed';
}

export function createEmojiConfessionModel(): EmojiConfessionModel {
  return {
    gameId: 'emoji-confessions',
    emojis: '',
    confession: '',
    status: 'draft',
  };
}

export function isEmojiConfessionModel(value: unknown): value is EmojiConfessionModel {
  if (!value || typeof value !== 'object') return false;
  const model = value as Record<string, unknown>;
  return model.gameId === 'emoji-confessions'
    && typeof model.emojis === 'string'
    && typeof model.confession === 'string'
    && (model.guess === undefined || typeof model.guess === 'string')
    && ['draft', 'awaiting-guess', 'revealed'].includes(String(model.status));
}

export function updateEmojiConfession(
  model: EmojiConfessionModel,
  field: 'emojis' | 'confession',
  value: string,
): EmojiConfessionModel {
  if (model.status !== 'draft') return model;
  if ((field === 'emojis' && value.length > 100) || (field === 'confession' && value.length > 500)) return model;
  return field === 'emojis' ? { ...model, emojis: value } : { ...model, confession: value };
}

export function submitEmojiConfession(model: EmojiConfessionModel): EmojiConfessionModel {
  if (model.status !== 'draft' || !model.emojis.trim() || !model.confession.trim()) return model;
  return { ...model, confession: model.confession.trim(), status: 'awaiting-guess' };
}

export function submitEmojiGuess(model: EmojiConfessionModel, guess: string): EmojiConfessionModel {
  if (model.status !== 'awaiting-guess' || !guess.trim() || guess.length > 500) return model;
  return { ...model, guess: guess.trim(), status: 'revealed' };
}

export interface ScenarioBuilderModel {
  gameId: 'scenario-builder';
  setting: string;
  roles: string;
  atmosphere: string;
  direction: string;
  boundary: string;
  status: 'draft' | 'awaiting-approval' | 'approved' | 'declined';
}

export type ScenarioField = 'setting' | 'roles' | 'atmosphere' | 'direction' | 'boundary';

export function createScenarioBuilderModel(): ScenarioBuilderModel {
  return {
    gameId: 'scenario-builder',
    setting: 'A candlelit hotel',
    roles: 'Two consenting partners',
    atmosphere: 'Slow and mysterious',
    direction: 'Mutual discovery',
    boundary: 'Nothing without an explicit yes',
    status: 'draft',
  };
}

export function isScenarioBuilderModel(value: unknown): value is ScenarioBuilderModel {
  if (!value || typeof value !== 'object') return false;
  const model = value as Record<string, unknown>;
  return model.gameId === 'scenario-builder'
    && ['setting', 'roles', 'atmosphere', 'direction', 'boundary'].every((field) => typeof model[field] === 'string')
    && ['draft', 'awaiting-approval', 'approved', 'declined'].includes(String(model.status));
}

export function updateScenarioField(
  model: ScenarioBuilderModel,
  field: ScenarioField,
  value: string,
): ScenarioBuilderModel {
  if (model.status !== 'draft' || value.length > 200) return model;
  return { ...model, [field]: value };
}

export function requestScenarioApproval(model: ScenarioBuilderModel): ScenarioBuilderModel {
  if (model.status !== 'draft') return model;
  if (![model.setting, model.roles, model.atmosphere, model.direction, model.boundary].every((value) => value.trim())) {
    return model;
  }
  return { ...model, status: 'awaiting-approval' };
}

export function requestScenarioChanges(model: ScenarioBuilderModel): ScenarioBuilderModel {
  if (model.status !== 'awaiting-approval') return model;
  return { ...model, status: 'draft' };
}

export function approveScenario(model: ScenarioBuilderModel): ScenarioBuilderModel {
  if (model.status !== 'awaiting-approval') return model;
  return { ...model, status: 'approved' };
}

export function declineScenario(model: ScenarioBuilderModel): ScenarioBuilderModel {
  if (model.status !== 'awaiting-approval') return model;
  return { ...model, status: 'declined' };
}

export interface RouletteCard {
  gameId: string;
  id: string;
  prompt: string;
  similarityFingerprint: string;
}

export interface RouletteModel {
  gameId: string;
  spinCount: number;
  currentCard?: RouletteCard;
}

export function createRouletteModel(gameId: string): RouletteModel {
  return { gameId, spinCount: 0 };
}

export function isRouletteModel(value: unknown): value is RouletteModel {
  if (!value || typeof value !== 'object') return false;
  const model = value as Record<string, unknown>;
  const currentCard = model.currentCard;
  return typeof model.gameId === 'string'
    && Number.isInteger(model.spinCount)
    && Number(model.spinCount) >= 0
    && (currentCard === undefined || (
      Boolean(currentCard)
      && typeof currentCard === 'object'
      && typeof (currentCard as Record<string, unknown>).gameId === 'string'
      && typeof (currentCard as Record<string, unknown>).id === 'string'
      && typeof (currentCard as Record<string, unknown>).prompt === 'string'
      && typeof (currentCard as Record<string, unknown>).similarityFingerprint === 'string'
    ));
}

export function recordRouletteSpin(model: RouletteModel, card: RouletteCard): RouletteModel {
  if (model.gameId !== card.gameId || !card.id || !card.prompt.trim()) return model;
  if (model.currentCard?.id === card.id) return model;
  return {
    gameId: model.gameId,
    spinCount: model.spinCount + 1,
    currentCard: {
      gameId: card.gameId,
      id: card.id,
      prompt: card.prompt,
      similarityFingerprint: card.similarityFingerprint,
    },
  };
}

export interface RankedItem {
  id: string;
  label: string;
  rank: number;
}

export interface MenuModel {
  gameId: string;
  items: [RankedItem[], RankedItem[]];
  submitted: [boolean, boolean];
  revealed: boolean;
  matchingRanks: number;
}

export function isMenuModel(value: unknown): value is MenuModel {
  if (!value || typeof value !== 'object') return false;
  const model = value as Record<string, unknown>;
  const isRankedItem = (item: unknown): item is RankedItem => {
    if (!item || typeof item !== 'object') return false;
    const rankedItem = item as Record<string, unknown>;
    return typeof rankedItem.id === 'string'
      && typeof rankedItem.label === 'string'
      && Number.isInteger(rankedItem.rank);
  };
  return typeof model.gameId === 'string'
    && Array.isArray(model.items)
    && model.items.length === 2
    && model.items.every((items) => Array.isArray(items) && items.every(isRankedItem))
    && Array.isArray(model.submitted)
    && model.submitted.length === 2
    && model.submitted.every((submitted) => typeof submitted === 'boolean')
    && typeof model.revealed === 'boolean'
    && Number.isInteger(model.matchingRanks);
}

export function createMenu(items: string[], gameId = 'the-menu'): MenuModel {
  return {
    gameId,
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
