import { APP_CONFIG } from '@/config/app.config';
import {
  FANTASY_ATMOSPHERES,
  FANTASY_DIRECTIONS,
  FANTASY_SETTINGS,
  FANTASY_THEMES,
  RECIPES,
  type AuthoredPrompt,
  type GeneratedRecipe,
} from '@/content/recipes';
import type { ContentCard, IntensityLevel, MoodId } from '@/types';

const INTENSITY_RANK: Record<IntensityLevel, number> = {
  mild: 0,
  moderate: 1,
  spicy: 2,
  extreme: 3,
};

const STOP = new Set([
  'the', 'a', 'an', 'to', 'of', 'and', 'or', 'your', 'you', 'with', 'for', 'in', 'on', 'is', 'are',
  'do', 'does', 'what', 'how', 'who', 'would', 'about', 'this', 'that', 'it', 'be', 'if', 'from',
]);

export interface SelectRequest {
  gameId: string;
  intensity: IntensityLevel;
  excludedTopics: string[];
  history: string[];
  fingerprints: string[];
  distribution?: 'private' | 'public';
  match?: (card: ContentCard) => boolean;
}

export type SelectResult =
  | { ok: true; card: ContentCard }
  | { ok: false; reason: string };

export function fingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word && !STOP.has(word))
    .sort()
    .join(' ');
}

export function jaccard(a: string, b: string): number {
  const left = new Set(a.split(' ').filter(Boolean));
  const right = new Set(b.split(' ').filter(Boolean));
  if (left.size === 0 && right.size === 0) return 1;
  let intersection = 0;
  left.forEach((token) => {
    if (right.has(token)) intersection += 1;
  });
  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function generatedCount(recipe: GeneratedRecipe): number {
  if (recipe.gameId === 'would-you-rather') {
    const n = recipe.topics.length;
    return (n * (n - 1)) / 2 + recipe.authored.length;
  }
  if (recipe.gameId === 'fantasy-roulette') {
    return (
      FANTASY_SETTINGS.length *
      FANTASY_ATMOSPHERES.length *
      FANTASY_THEMES.length *
      FANTASY_DIRECTIONS.length
    );
  }
  if (recipe.templates.length === 0 || recipe.topics.length === 0) {
    return recipe.authored.length;
  }
  const framings = Math.max(recipe.framings.length, 1);
  return recipe.templates.length * recipe.topics.length * framings + recipe.authored.length;
}

export function totalCatalogueSize(): number {
  return Object.values(RECIPES).reduce((sum, recipe) => sum + generatedCount(recipe), 0);
}

export interface CatalogueAudit {
  generatedExperiences: number;
  validUniqueExperiences: number;
  duplicateIds: number;
  semanticDuplicates: number;
  games: Record<string, { generated: number; validUnique: number }>;
}

export function auditCatalogue(): CatalogueAudit {
  const seenIds = new Set<string>();
  const seenExact = new Set<string>();
  const fingerprints: string[] = [];
  const tokenIndex = new Map<string, number[]>();
  const games: CatalogueAudit['games'] = {};
  let generatedExperiences = 0;
  let duplicateIds = 0;
  let semanticDuplicates = 0;
  let validUniqueExperiences = 0;

  Object.values(RECIPES).forEach((recipe) => {
    let gameValidUnique = 0;
    const accept = (card: ContentCard) => {
      generatedExperiences += 1;
      if (seenIds.has(card.id)) {
        duplicateIds += 1;
        return;
      }
      seenIds.add(card.id);
      if (!card.prompt.trim() || card.eligibility.privateBuild === false) return;

      const exact = `${card.prompt.trim().toLowerCase()}|${(card.answerChoices ?? [])
        .map((choice) => choice.trim().toLowerCase())
        .join('|')}`;
      if (seenExact.has(exact)) {
        semanticDuplicates += 1;
        return;
      }
      seenExact.add(exact);

      const terms = card.similarityFingerprint.split(' ').filter(Boolean);
      const postings = terms
        .map((term) => tokenIndex.get(term))
        .filter((entries): entries is number[] => entries !== undefined)
        .sort((left, right) => left.length - right.length);
      const candidates = postings[0] ?? [];
      const currentTerms = new Set(terms);
      const isSimilar = candidates.some((index) => {
        const existing = new Set(fingerprints[index].split(' ').filter(Boolean));
        const maximum = Math.max(existing.size, currentTerms.size);
        const minimum = Math.min(existing.size, currentTerms.size);
        if (maximum === 0 || minimum / maximum < 0.82) return false;
        const intersection = Array.from(existing).filter((term) => currentTerms.has(term)).length;
        return intersection / (existing.size + currentTerms.size - intersection) >= 0.82;
      });
      if (isSimilar) {
        semanticDuplicates += 1;
        return;
      }

      const index = fingerprints.length;
      fingerprints.push(card.similarityFingerprint);
      terms.forEach((term) => {
        const entries = tokenIndex.get(term);
        if (entries) entries.push(index);
        else tokenIndex.set(term, [index]);
      });
      validUniqueExperiences += 1;
      gameValidUnique += 1;
    };

    recipe.authored.forEach((authored) => accept(finalize(recipe, authored)));
    const generatedCountWithoutAuthored = generatedCount(recipe) - recipe.authored.length;
    for (let index = 0; index < generatedCountWithoutAuthored; index += 1) {
      const card = cardFromIndex(recipe, index);
      if (card) accept(card);
    }
    games[recipe.gameId] = {
      generated: generatedCount(recipe),
      validUnique: gameValidUnique,
    };
  });

  return {
    generatedExperiences,
    validUniqueExperiences,
    duplicateIds,
    semanticDuplicates,
    games,
  };
}

function eligibleIntensity(cardLevel: IntensityLevel, selected: IntensityLevel): boolean {
  return INTENSITY_RANK[cardLevel] <= INTENSITY_RANK[selected];
}

function mentionsExcluded(text: string, tags: string[], excluded: string[]): boolean {
  const haystack = `${text} ${tags.join(' ')}`.toLowerCase();
  return excluded.some((topic) => topic.trim() && haystack.includes(topic.trim().toLowerCase()));
}

function finalize(
  recipe: GeneratedRecipe,
  draft: AuthoredPrompt,
): ContentCard {
  const fullText = draft.choices && draft.choices.length > 0
    ? `${draft.prompt} ${draft.choices.join(' ')}`
    : draft.prompt;
  const fp = fingerprint(fullText) || draft.id;
  const sexual = recipe.mood === 'sexual';
  const extreme = draft.intensity === 'extreme';
  return {
    id: draft.id,
    category: recipe.mood,
    gameId: recipe.gameId,
    mood: recipe.mood,
    intensity: draft.intensity,
    language: 'English',
    theme: draft.theme,
    tags: draft.tags,
    prompt: draft.prompt,
    answerType: recipe.answerType,
    answerChoices: draft.choices,
    contentVersion: APP_CONFIG.contentPackVersion,
    similarityFingerprint: fp,
    eligibility: {
      privateBuild: true,
      publicStore: !sexual && !extreme,
    },
  };
}

function cardFromIndex(recipe: GeneratedRecipe, index: number): ContentCard | null {
  if (recipe.gameId === 'would-you-rather') {
    const n = recipe.topics.length;
    const total = (n * (n - 1)) / 2;
    if (index >= total) return null;
    let remaining = index;
    for (let i = 0; i < n; i += 1) {
      const row = n - i - 1;
      if (remaining < row) {
        const j = i + 1 + remaining;
        return finalize(recipe, {
          id: `wyr:${i}:${j}`,
          theme: 'choice',
          intensity: 'mild',
          tags: ['choice'],
          prompt: 'Would you rather…',
          choices: [recipe.topics[i], recipe.topics[j]],
        });
      }
      remaining -= row;
    }
    return null;
  }

  if (recipe.gameId === 'fantasy-roulette') {
    const combo = fantasyAt(index);
    if (!combo) return null;
    return finalize(recipe, {
      id: combo.id,
      theme: 'combo',
      intensity: index % 5 === 0 ? 'spicy' : 'moderate',
      tags: ['fantasy', 'combo'],
      prompt: combo.prompt,
    });
  }

  if (recipe.gameId === 'whos-more-likely') {
    if (index >= recipe.topics.length) return null;
    return finalize(recipe, {
      id: `wml:${index}`,
      theme: 'vote',
      intensity: 'mild',
      tags: ['vote'],
      prompt: `Who is more likely to be the one who ${recipe.topics[index]}?`,
      choices: ['Player 1', 'Player 2'],
    });
  }

  const framingCount = Math.max(recipe.framings.length, 1);
  const topicCount = recipe.topics.length;
  const templateCount = recipe.templates.length;
  const total = templateCount * topicCount * framingCount;
  if (templateCount === 0 || topicCount === 0 || index >= total) return null;
  const templateIndex = index % templateCount;
  const topicIndex = Math.floor(index / templateCount) % topicCount;
  const framingIndex = Math.floor(index / (templateCount * topicCount)) % framingCount;
  const topic = recipe.topics[topicIndex];
  const framing = recipe.framings[framingIndex] ?? '';
  const template = recipe.templates[templateIndex].replaceAll('{topic}', topic);
  const prompt = `${framing} ${template}`.trim();
  const choiceSet = recipe.choiceSets[templateIndex % Math.max(recipe.choiceSets.length, 1)];
  const intensity = recipe.intensities[(templateIndex + topicIndex) % recipe.intensities.length] ?? 'mild';
  return finalize(recipe, {
    id: `${recipe.gameId}:${templateIndex}:${topicIndex}:${framingIndex}`,
    theme: topic,
    intensity,
    tags: [topic, recipe.mood],
    prompt,
    choices: choiceSet?.map((choice) => choice.replaceAll('{topic}', topic)),
  });
}

export function fantasyAt(index: number): { id: string; prompt: string } | null {
  const total =
    FANTASY_SETTINGS.length *
    FANTASY_ATMOSPHERES.length *
    FANTASY_THEMES.length *
    FANTASY_DIRECTIONS.length;
  if (index >= total) return null;
  const s = index % FANTASY_SETTINGS.length;
  const a = Math.floor(index / FANTASY_SETTINGS.length) % FANTASY_ATMOSPHERES.length;
  const t = Math.floor(index / (FANTASY_SETTINGS.length * FANTASY_ATMOSPHERES.length)) % FANTASY_THEMES.length;
  const d =
    Math.floor(index / (FANTASY_SETTINGS.length * FANTASY_ATMOSPHERES.length * FANTASY_THEMES.length)) %
    FANTASY_DIRECTIONS.length;
  return {
    id: `combo:${s}:${a}:${t}:${d}`,
    prompt: `Setting: ${FANTASY_SETTINGS[s]}. Atmosphere: ${FANTASY_ATMOSPHERES[a]}. Theme: ${FANTASY_THEMES[t]}. Direction: ${FANTASY_DIRECTIONS[d]}.`,
  };
}

function allowed(card: ContentCard, request: SelectRequest): boolean {
  const distribution = request.distribution ?? APP_CONFIG.distribution;
  if (distribution === 'public' && card.eligibility.publicStore === false) return false;
  if (!eligibleIntensity(card.intensity, request.intensity)) return false;
  if (mentionsExcluded(card.prompt, card.tags, request.excludedTopics)) return false;
  if (request.match && !request.match(card)) return false;
  return true;
}

function createSimilarityMatcher(fingerprints: string[]): (candidate: string) => boolean {
  const exact = new Set(fingerprints);
  const tokenIndex = new Map<string, number[]>();
  const tokenSets = fingerprints.map((fingerprint, index) => {
    const terms = new Set(fingerprint.split(' ').filter(Boolean));
    terms.forEach((term) => {
      const entries = tokenIndex.get(term);
      if (entries) entries.push(index);
      else tokenIndex.set(term, [index]);
    });
    return terms;
  });

  return (candidate) => {
    if (exact.has(candidate)) return true;
    const candidateTerms = new Set(candidate.split(' ').filter(Boolean));
    const candidateLists = Array.from(candidateTerms)
      .map((term) => tokenIndex.get(term))
      .filter((entries): entries is number[] => entries !== undefined)
      .sort((left, right) => left.length - right.length);
    const possibleMatches = candidateLists[0] ?? [];
    return possibleMatches.some((index) => {
      const existing = tokenSets[index];
      const maximum = Math.max(existing.size, candidateTerms.size);
      const minimum = Math.min(existing.size, candidateTerms.size);
      if (maximum === 0 || minimum / maximum < 0.82) return false;
      const [smaller, larger] = existing.size <= candidateTerms.size
        ? [existing, candidateTerms]
        : [candidateTerms, existing];
      let intersection = 0;
      smaller.forEach((term) => {
        if (larger.has(term)) intersection += 1;
      });
      return intersection / (existing.size + candidateTerms.size - intersection) >= 0.82;
    });
  };
}

export function isTooSimilar(card: ContentCard, fingerprints: string[]): boolean {
  return createSimilarityMatcher(fingerprints)(card.similarityFingerprint);
}

export function selectNext(request: SelectRequest): SelectResult {
  const recipe = RECIPES[request.gameId];
  if (!recipe) return { ok: false, reason: 'This game has no content pack yet.' };
  const seen = new Set(request.history);
  const hasSimilarHistory = createSimilarityMatcher(request.fingerprints);
  const pool: ContentCard[] = [];

  const consider = (card: ContentCard | null) => {
    if (!card || seen.has(card.id) || !allowed(card, request) || hasSimilarHistory(card.similarityFingerprint)) return;
    pool.push(card);
  };

  recipe.authored.forEach((authored) => consider(finalize(recipe, authored)));
  if (pool.length === 0) {
    const total = generatedCount(recipe);
    for (let index = 0; index < total && pool.length < 24; index += 1) {
      consider(cardFromIndex(recipe, index));
    }
  }

  if (pool.length === 0) {
    return {
      ok: false,
      reason:
        'Every eligible card in this pack has been played or is too similar to one you have already seen. Load another content pack before repeating anything.',
    };
  }

  const card = pool[Math.floor(Math.random() * pool.length)];
  return { ok: true, card };
}

export function selectMany(request: SelectRequest, count: number): SelectResult[] | { ok: false; reason: string } {
  const history = [...request.history];
  const fingerprints = [...request.fingerprints];
  const cards: SelectResult[] = [];
  for (let i = 0; i < count; i += 1) {
    const next = selectNext({ ...request, history, fingerprints });
    if (!next.ok) return next;
    cards.push(next);
    history.push(next.card.id);
    fingerprints.push(next.card.similarityFingerprint);
  }
  return cards;
}

export function recipeMood(gameId: string): MoodId | null {
  return RECIPES[gameId]?.mood ?? null;
}
