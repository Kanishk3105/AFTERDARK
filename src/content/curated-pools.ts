import type { IntensityLevel } from '@/types';
import type { AuthoredPrompt } from '@/content/recipes';

type PoolDraft = Omit<AuthoredPrompt, 'id' | 'intensity'>;
type IntensityPools = Record<IntensityLevel, PoolDraft[]>;

const poolDrafts: Record<string, IntensityPools> = {
  'six-questions': {
    mild: [{ theme: 'care', tags: ['connection'], prompt: 'What small act of care helps you feel understood on an ordinary day?', choices: ['A check-in', 'Quiet company', 'Practical help', 'A kind note'] }],
    moderate: [{ theme: 'support', tags: ['communication'], prompt: 'When you feel overwhelmed, what kind of support do you want your closest person to offer first?', choices: ['Listen without fixing it', 'Offer a plan', 'Give me space', 'Help with one task'] }],
    spicy: [{ theme: 'honesty', tags: ['vulnerability'], prompt: 'What honest opinion about your friendship have you softened because you worried how it would land?', choices: ['A change I want', 'A worry I have', 'A need I have', 'A truth I avoid'], rating: 'pg13-style' }],
    extreme: [{ theme: 'change', tags: ['boundaries', 'trust'], prompt: 'What truth about this friendship would be difficult to say if it meant something between you had to change?', choices: ['A limit I need', 'A hurt I carry', 'A fear I have', 'A change I want'], rating: 'pg13-style' }],
  },
  'how-well-do-you-know-me': {
    mild: [{ theme: 'comfort', tags: ['habits'], prompt: 'Which familiar routine helps me feel most at home?', choices: ['A slow morning', 'A tidy room', 'A shared meal', 'A familiar walk'] }],
    moderate: [{ theme: 'stress', tags: ['support'], prompt: 'When I am under pressure, do I want advice, company, distraction, or quiet?', choices: ['Advice', 'Company', 'Distraction', 'Quiet'] }],
    spicy: [{ theme: 'ambition', tags: ['identity'], prompt: 'What goal do I secretly care about more than I let on?', choices: ['A creative risk', 'A career change', 'A personal milestone', 'A new adventure'], rating: 'pg13-style' }],
    extreme: [{ theme: 'fear', tags: ['vulnerability'], prompt: 'Which fear do I hide behind humour, and what would help me talk about it safely?', choices: ['Being misunderstood', 'Letting someone down', 'Starting over', 'Asking for support'], rating: 'pg13-style' }],
  },
  'would-you-rather': {
    mild: [{ theme: 'weekend', tags: ['choice'], prompt: 'Would you rather choose a quiet day outdoors or an unplanned day in the city?', choices: ['A quiet day outdoors', 'An unplanned day in the city'] }],
    moderate: [{ theme: 'connection', tags: ['choice', 'communication'], prompt: 'Would you rather have a long conversation about a hard topic or write each other a thoughtful note first?', choices: ['Talk it through together', 'Write a thoughtful note first'] }],
    spicy: [{ theme: 'boldness', tags: ['choice', 'adult-curiosity'], prompt: 'Would you rather share a private fantasy as a story or ask one daring question about attraction?', choices: ['Share a fantasy as a story', 'Ask a daring question about attraction'], rating: '18-plus' }],
    extreme: [{ theme: 'negotiation', tags: ['choice', 'boundaries', 'roleplay'], prompt: 'Would you rather design a fictional power-exchange scene together or map out the limits and aftercare before deciding whether to try any roleplay?', choices: ['Design a fictional scene together', 'Agree on limits and aftercare first'], rating: '18-plus' }],
  },
  'whos-more-likely': {
    mild: [{ theme: 'kindness', tags: ['vote', 'habits'], prompt: 'Who is more likely to notice that someone needs a little encouragement?' }],
    moderate: [{ theme: 'repair', tags: ['vote', 'communication'], prompt: 'Who is more likely to start a difficult conversation before a small issue grows?' }],
    spicy: [{ theme: 'flirtation', tags: ['vote', 'adult-curiosity'], prompt: 'Who is more likely to turn a private compliment into unmistakable flirtation?', rating: '18-plus' }],
    extreme: [{ theme: 'boundaries', tags: ['vote', 'negotiation'], prompt: 'Who is more likely to pause a daring roleplay and check that the agreed limits still feel right?', rating: '18-plus' }],
  },
  'love-quiz': {
    mild: [{ theme: 'affection', tags: ['romance', 'connection'], prompt: 'Which quiet gesture makes you feel most deliberately loved?' }],
    moderate: [{ theme: 'desire', tags: ['romance', 'preferences'], prompt: 'What kind of affectionate attention would you like your partner to initiate more often?' }],
    spicy: [
      { theme: 'attraction', tags: ['romance', 'adult-curiosity'], prompt: 'Which confident compliment about your appearance would make you blush in the best way?', rating: 'pg13-style' },
      { theme: 'first-move', tags: ['romance', 'flirtation'], prompt: 'Would you enjoy your partner taking the first move on a date night with a bold but easy-to-decline invitation?', rating: '18-plus' },
      { theme: 'public-affection', tags: ['romance', 'preferences'], prompt: 'Which kind of discreet affection in public feels romantic rather than uncomfortable?', rating: 'pg13-style' },
      { theme: 'private-message', tags: ['romance', 'flirtation'], prompt: 'Would a suggestive private message during the day build welcome anticipation for you?', rating: '18-plus' },
    ],
    extreme: [
      { theme: 'power-dynamics', tags: ['romance', 'roleplay', 'boundaries'], prompt: 'In a fictional adult roleplay, what negotiated dynamic would make you feel both daring and completely in control of your limits?', rating: '18-plus' },
      { theme: 'dominant-role', tags: ['romance', 'consensual-bdsm'], prompt: 'Would you be curious to discuss a dominant role in fiction if you chose the limits and could end the scene at any time?', rating: '18-plus' },
      { theme: 'submissive-role', tags: ['romance', 'consensual-bdsm'], prompt: 'Which reassurance would you want before considering a submissive fictional role: a clear stop signal, a written limit list, or a check-in plan?', rating: '18-plus' },
      { theme: 'aftercare', tags: ['romance', 'boundaries', 'aftercare'], prompt: 'What kind of aftercare conversation would help you feel valued after exploring an intense fictional dynamic?', rating: '18-plus' },
    ],
  },
  'memory-lane': {
    mild: [{ theme: 'first-impression', tags: ['memory', 'affection'], prompt: 'Recall one ordinary detail from an early day together that still makes you smile.' }],
    moderate: [{ theme: 'confidence', tags: ['memory', 'body-confidence'], prompt: 'When did your partner make you feel especially comfortable and confident in your own skin?' }],
    spicy: [{ theme: 'chemistry', tags: ['memory', 'attraction'], prompt: 'Describe a moment when the chemistry between you felt impossible to miss, without sharing anything you would rather keep private.', rating: '18-plus' }],
    extreme: [{ theme: 'trust', tags: ['memory', 'boundaries', 'negotiation'], prompt: 'Remember a time you trusted each other with a vulnerable preference; what made the conversation feel safe rather than pressured?', rating: '18-plus' }],
  },
  'love-language': {
    mild: [{ theme: 'kindness', tags: ['ranking', 'affection'], prompt: 'Rank these everyday signs of care by how loved they make you feel: a note, time together, a helpful act, a small gift, or a warm hug.' }],
    moderate: [{ theme: 'attention', tags: ['ranking', 'preferences'], prompt: 'Rank the kinds of attention you most want during a demanding week: listening, reassurance, shared time, practical help, or affectionate touch.' }],
    spicy: [{ theme: 'romance', tags: ['ranking', 'attraction'], prompt: 'Rank the romantic gestures that create the strongest anticipation for you: a private compliment, a planned date, a lingering kiss, a teasing message, or a slow dance.', rating: '18-plus' }],
    extreme: [{ theme: 'negotiated-roleplay', tags: ['ranking', 'roleplay', 'boundaries'], prompt: 'Rank the ingredients that would make an adult fictional power-exchange scene feel safest: negotiated roles, a clear stop signal, check-ins, aftercare, or choosing the setting together.', rating: '18-plus' }],
  },
  'couple-challenges': {
    mild: [{ theme: 'gratitude', tags: ['challenge', 'affection'], prompt: 'Take turns naming one quality you appreciate and one small way you want to show it this week.' }],
    moderate: [{ theme: 'communication', tags: ['challenge', 'preferences'], prompt: 'Each describe one preference you have been hesitant to ask for, then agree on a kind way to revisit it.' }],
    spicy: [{ theme: 'flirtation', tags: ['challenge', 'adult-curiosity'], prompt: 'Create a private two-line invitation for a date night; either person may edit or decline it.', rating: '18-plus' }],
    extreme: [{ theme: 'scene-negotiation', tags: ['challenge', 'roleplay', 'consent'], prompt: 'As a conversation-only challenge, negotiate a fictional adult roleplay: name the roles, hard limits, a stop signal, and the aftercare you would want. No scene begins from this exercise.', rating: '18-plus' }],
  },
  'romantic-roulette': {
    mild: [{ theme: 'shared-moment', tags: ['roulette', 'affection'], prompt: 'Choose a song that belongs to the two of you and tell the story behind it.' }],
    moderate: [{ theme: 'desire', tags: ['roulette', 'communication'], prompt: 'Each name one kind of affectionate touch you enjoy and one way your partner can check the timing.' }],
    spicy: [{ theme: 'anticipation', tags: ['roulette', 'flirtation'], prompt: 'Write a daring but comfortable invitation for later; your partner can revise it or say no.', rating: '18-plus' }],
    extreme: [{ theme: 'power-exchange', tags: ['roulette', 'roleplay', 'negotiation'], prompt: 'Build a fictional adult power-exchange premise together, then agree on roles, limits, a stop signal, and aftercare before deciding whether it stays fiction.', rating: '18-plus' }],
  },
  'truth-or-dare': {
    mild: [{ theme: 'affection', tags: ['truth', 'connection'], prompt: 'Truth: what everyday kind of affection helps you feel close without needing a special occasion?' }],
    moderate: [{ theme: 'preferences', tags: ['truth', 'desire', 'communication'], prompt: 'Truth: which intimate preference would you like to discuss more openly, with no expectation that either person must act on it?' }],
    spicy: [{ theme: 'fantasy', tags: ['truth', 'adult-curiosity', 'roleplay'], prompt: 'Truth: what adult roleplay theme intrigues you as a story, and what would you need to keep it comfortable?', rating: '18-plus' }],
    extreme: [{ theme: 'consensual-bdsm', tags: ['truth', 'boundaries', 'negotiation'], prompt: 'Truth: what would you need to negotiate before exploring a consensual BDSM-inspired fictional dynamic, including limits, a stop signal, and aftercare?', rating: '18-plus' }],
  },
  'desire-match': {
    mild: [
      { theme: 'comfort', tags: ['preference', 'affection'], prompt: 'Would you enjoy more unhurried time together with phones put away?' },
      { theme: 'shared-meal', tags: ['preference', 'connection'], prompt: 'Would sharing a meal you both helped prepare feel like a meaningful way to reconnect?' },
      { theme: 'kindness', tags: ['preference', 'communication'], prompt: 'Would you appreciate a regular check-in where you can talk without needing to solve anything?' },
      { theme: 'memory', tags: ['preference', 'affection'], prompt: 'Would you like to revisit a favourite shared memory together this month?' },
    ],
    moderate: [{ theme: 'curiosity', tags: ['preference', 'intimate-communication'], prompt: 'Would you be comfortable discussing a new intimate preference without making a promise to try it?' }],
    spicy: [{ theme: 'fantasy', tags: ['preference', 'roleplay'], prompt: 'Would you be curious to co-write a bold adult fantasy that remains fictional unless you both separately agree otherwise?', rating: '18-plus' }],
    extreme: [
      { theme: 'negotiated-control', tags: ['preference', 'consensual-bdsm', 'limits'], prompt: 'Would you want to discuss a consensual dominant/submissive fictional role, including what is off limits and how either person can stop the discussion?', rating: '18-plus' },
      { theme: 'control-language', tags: ['preference', 'negotiation', 'consensual-bdsm'], prompt: 'Would you be comfortable agreeing on fictional role titles before deciding whether the power dynamic interests you?', rating: '18-plus' },
      { theme: 'hard-limits', tags: ['preference', 'boundaries', 'consensual-bdsm'], prompt: 'Would you rather share hard limits in writing, discuss them aloud, or keep the topic out of roleplay entirely?', rating: '18-plus' },
      { theme: 'check-ins', tags: ['preference', 'safety', 'consensual-bdsm'], prompt: 'Would scheduled check-ins make a fictional high-intensity scene feel more comfortable to discuss?', rating: '18-plus' },
    ],
  },
  'naughty-roulette': {
    mild: [{ theme: 'sweetness', tags: ['roulette', 'affection'], prompt: 'Offer your partner a sincere compliment about something they did today.' }],
    moderate: [{ theme: 'desire', tags: ['roulette', 'communication'], prompt: 'Invite your partner to name one kind of affection they would welcome tonight; listening is a complete response.' }],
    spicy: [{ theme: 'teasing', tags: ['roulette', 'adult-curiosity'], prompt: 'Offer a playful, suggestive compliment, then let your partner choose whether to continue the flirtation.', rating: '18-plus' }],
    extreme: [{ theme: 'role-negotiation', tags: ['roulette', 'roleplay', 'consent'], prompt: 'Propose a fictional adult role for each of you and ask what boundaries or revisions would make the premise feel safe; no action is implied.', rating: '18-plus' }],
  },
  'temptations': {
    mild: [{ theme: 'thoughtful-choice', tags: ['choice', 'affection'], prompt: 'Write four gentle ways to make an ordinary evening feel more thoughtful, then let your partner choose or pass.' }],
    moderate: [{ theme: 'personal-preference', tags: ['choice', 'communication'], prompt: 'Write four ways to ask about a partner’s intimate preferences respectfully, with “not now” as a valid answer.' }],
    spicy: [{ theme: 'bold-invitation', tags: ['choice', 'flirtation'], prompt: 'Write four daring but non-pressuring date-night invitations; your partner may choose one, edit it, or decline.', rating: '18-plus' }],
    extreme: [{ theme: 'negotiated-fantasy', tags: ['choice', 'roleplay', 'boundaries'], prompt: 'Write four fictional adult roleplay premises, each with a clear boundary-check question; your partner chooses only if the premise feels welcome.', rating: '18-plus' }],
  },
  'desire-quiz': {
    mild: [
      { theme: 'reassurance', tags: ['prediction', 'connection'], prompt: 'Which reassurance helps me feel most secure when we have had a busy week?' },
      { theme: 'routine', tags: ['prediction', 'habits'], prompt: 'Which small shared routine would I be happiest to protect on a busy week?' },
      { theme: 'encouragement', tags: ['prediction', 'support'], prompt: 'What kind of encouragement would I most want before trying something unfamiliar?' },
      { theme: 'listening', tags: ['prediction', 'communication'], prompt: 'When I share a worry, what response am I most likely hoping for first?' },
    ],
    moderate: [{ theme: 'intimacy', tags: ['prediction', 'preferences'], prompt: 'Which kind of intimate conversation would I find easiest to begin: a question, a note, a shared list, or a check-in?' }],
    spicy: [{ theme: 'boldness', tags: ['prediction', 'adult-curiosity'], prompt: 'Which daring but comfortable fantasy topic would I be most curious to discuss first?', rating: '18-plus' }],
    extreme: [
      { theme: 'limits', tags: ['prediction', 'consensual-bdsm', 'boundaries'], prompt: 'What would I insist on discussing before any consensual BDSM-inspired roleplay: limits, roles, a stop signal, check-ins, or aftercare?', rating: '18-plus' },
      { theme: 'stop-signal', tags: ['prediction', 'consensual-bdsm', 'safety'], prompt: 'Which stop-signal arrangement would I trust most in an intense fictional scene: a spoken word, a gesture, or both?', rating: '18-plus' },
      { theme: 'role-change', tags: ['prediction', 'consensual-bdsm', 'negotiation'], prompt: 'Would I want the fictional roles to stay fixed, switch at an agreed point, or remain undecided until we talk?', rating: '18-plus' },
      { theme: 'debrief', tags: ['prediction', 'aftercare', 'communication'], prompt: 'After a bold roleplay discussion, what kind of debrief would help me feel heard and grounded?', rating: '18-plus' },
    ],
  },
  'emoji-confessions': {
    mild: [{ theme: 'memory', tags: ['emoji', 'confession'], prompt: 'Use only emoji to hint at a small shared memory that still makes you happy.' }],
    moderate: [{ theme: 'affection', tags: ['emoji', 'desire'], prompt: 'Use emoji to confess one kind of affection you would like more often, then explain it after the guess.' }],
    spicy: [{ theme: 'fantasy', tags: ['emoji', 'adult-curiosity'], prompt: 'Use emoji to hint at an adult fantasy theme you are comfortable discussing, not a promise to act on it.', rating: '18-plus' }],
    extreme: [{ theme: 'roleplay', tags: ['emoji', 'consensual-bdsm', 'boundaries'], prompt: 'Use emoji to hint at a fictional power-dynamic theme; after the guess, name one limit that keeps the conversation comfortable.', rating: '18-plus' }],
  },
  'fantasy-cards': {
    mild: [
      { theme: 'journey', tags: ['fantasy', 'story'], prompt: 'Would you enjoy a story about the two of you taking an unplanned trip and finding a quiet place to talk?' },
      { theme: 'garden', tags: ['fantasy', 'nature'], prompt: 'Would a story set in a hidden garden, where you leave each other kind notes, feel inviting?' },
      { theme: 'rainy-day', tags: ['fantasy', 'memory'], prompt: 'Would you choose a rainy-day story about recreating a small tradition from your early days together?' },
      { theme: 'stargazing', tags: ['fantasy', 'connection'], prompt: 'Would you enjoy a quiet stargazing scene where both characters share a hope for the future?' },
    ],
    moderate: [{ theme: 'private-retreat', tags: ['fantasy', 'preferences'], prompt: 'Would you be curious about a private-retreat story where each person chooses the pace and can change the scene?' }],
    spicy: [{ theme: 'masked-ball', tags: ['fantasy', 'roleplay', 'adult-curiosity'], prompt: 'Would you enjoy a fictional masked-ball roleplay between two adult partners, with the roles chosen together?', rating: '18-plus' }],
    extreme: [
      { theme: 'negotiated-power', tags: ['fantasy', 'consensual-bdsm', 'negotiation'], prompt: 'Would you want to co-design a fictional adult power-exchange scene with negotiated roles, hard limits, a stop signal, and agreed aftercare?', rating: '18-plus' },
      { theme: 'ceremony', tags: ['fantasy', 'consensual-bdsm', 'roleplay'], prompt: 'Would a fictional ceremony for choosing roles feel compelling if either adult could pause or rewrite the scene?', rating: '18-plus' },
      { theme: 'authority', tags: ['fantasy', 'consensual-bdsm', 'limits'], prompt: 'Would you explore a story with a confident authority role if the boundaries were written by both characters first?', rating: '18-plus' },
      { theme: 'aftercare-scene', tags: ['fantasy', 'aftercare', 'consent'], prompt: 'Would you want the story itself to include an aftercare scene where both characters check in and renegotiate what comes next?', rating: '18-plus' },
    ],
  },
  'scenario-builder': {
    mild: [{ theme: 'quiet-escape', tags: ['scenario', 'story'], prompt: 'Build a gentle scene around a quiet weekend escape where both characters can change the plan.' }],
    moderate: [{ theme: 'desire-conversation', tags: ['scenario', 'preferences'], prompt: 'Build a private scene where two adult partners share a new preference and decide together what happens next.' }],
    spicy: [{ theme: 'roleplay', tags: ['scenario', 'adult-roleplay'], prompt: 'Build a bold adult roleplay scene with clear character choices, a pause point, and a way to rewrite the direction.', rating: '18-plus' }],
    extreme: [{ theme: 'power-dynamic', tags: ['scenario', 'consensual-bdsm', 'limits'], prompt: 'Build a consensual BDSM-inspired fictional scene by negotiating roles, hard limits, a stop signal, check-ins, and aftercare before the story begins.', rating: '18-plus' }],
  },
  'the-menu': {
    mild: [{ theme: 'togetherness', tags: ['ranking', 'shared-story'], prompt: 'Rank gentle shared-story ingredients: a walk, a home-cooked meal, a favourite song, a handwritten note, or a slow morning.' }],
    moderate: [{ theme: 'intimate-options', tags: ['ranking', 'preferences'], prompt: 'Rank conversation topics you would welcome: affection, attraction, body confidence, boundaries, or future expectations.' }],
    spicy: [{ theme: 'adult-fantasy', tags: ['ranking', 'roleplay'], prompt: 'Rank adult fantasy ingredients you might discuss: a chosen setting, playful characters, a private invitation, a change of pace, or a clear check-in.', rating: '18-plus' }],
    extreme: [{ theme: 'power-exchange-menu', tags: ['ranking', 'consensual-bdsm', 'negotiation'], prompt: 'Rank what must be agreed before a fictional power-exchange story: roles, limits, stop signal, check-ins, or aftercare.', rating: '18-plus' }],
  },
  'challenge-duel': {
    mild: [{ theme: 'gratitude', tags: ['duel', 'writing'], prompt: 'Both write a short note describing one ordinary moment with your partner that you hope to remember.' }],
    moderate: [{ theme: 'desire', tags: ['duel', 'communication'], prompt: 'Both privately write one preference you want your partner to understand, then reveal only when both are ready.' }],
    spicy: [{ theme: 'flirtation', tags: ['duel', 'adult-curiosity'], prompt: 'Both write a confident, suggestive invitation for a fictional date night; reveal together and revise freely.', rating: '18-plus' }],
    extreme: [{ theme: 'negotiation', tags: ['duel', 'consensual-bdsm', 'boundaries'], prompt: 'Both write the safeguards you would require for a fictional dominant/submissive roleplay, then reveal and compare limits without agreeing to act.', rating: '18-plus' }],
  },
  'choose-your-story': {
    mild: [{ theme: 'story-start', tags: ['branching-story', 'memory'], prompt: 'Story opening: choose a familiar place that holds a kind memory, then decide together whether the first scene begins with a letter or a reunion.' }],
    moderate: [{ theme: 'story-start', tags: ['branching-story', 'desire'], prompt: 'Story opening: two adult partners find an invitation to a private retreat; choose whether they ask questions first or set their own terms.' }],
    spicy: [{ theme: 'story-start', tags: ['branching-story', 'adult-roleplay'], prompt: 'Story opening: two adult partners meet at a masked event in roles they chose together; decide who speaks first and what remains off limits.', rating: '18-plus' }],
    extreme: [{ theme: 'story-start', tags: ['branching-story', 'consensual-bdsm', 'negotiation'], prompt: 'Story opening: two adult partners plan a fictional power-exchange scene; the first branch is whether to negotiate roles, limits, stop signals, or aftercare before entering the scene.', rating: '18-plus' }],
  },
  'fantasy-roulette': {
    mild: [{ theme: 'chance', tags: ['roulette', 'story'], prompt: 'A quiet garden, a favourite song, and a shared decision to stay a little longer.' }],
    moderate: [{ theme: 'chance', tags: ['roulette', 'preferences'], prompt: 'A private suite, a candid question about attraction, and a mutual choice about the pace.' }],
    spicy: [{ theme: 'chance', tags: ['roulette', 'adult-roleplay'], prompt: 'A masked invitation, two chosen adult characters, and a scene either partner can rewrite or end.', rating: '18-plus' }],
    extreme: [{ theme: 'chance', tags: ['roulette', 'consensual-bdsm', 'negotiation'], prompt: 'A fictional power-exchange premise, roles negotiated in advance, hard limits respected, and aftercare agreed before the story proceeds.', rating: '18-plus' }],
  },
};

function toAuthoredPrompts(gameId: string, intensity: IntensityLevel, drafts: PoolDraft[]): AuthoredPrompt[] {
  return drafts.map((draft, index) => ({
    ...draft,
    id: `pool:${gameId}:${intensity}:${index + 1}`,
    intensity,
    tags: draft.tags.length ? draft.tags : [draft.theme],
    rating: draft.rating ?? (intensity === 'extreme' ? '18-plus' : 'pg13-style'),
    similarityGroup: draft.similarityGroup ?? `pool:${gameId}:${intensity}:${draft.theme}`,
    templateFingerprint: `${gameId}:${intensity}:${draft.theme}`,
  }));
}

export const CURATED_POOLS: Record<string, Record<IntensityLevel, AuthoredPrompt[]>> = {};

Object.entries(poolDrafts).forEach(([gameId, levels]) => {
  CURATED_POOLS[gameId] = {
    mild: toAuthoredPrompts(gameId, 'mild', levels.mild),
    moderate: toAuthoredPrompts(gameId, 'moderate', levels.moderate),
    spicy: toAuthoredPrompts(gameId, 'spicy', levels.spicy),
    extreme: toAuthoredPrompts(gameId, 'extreme', levels.extreme),
  };
});

export function curatedPromptsForGame(gameId: string): AuthoredPrompt[] {
  const pools = CURATED_POOLS[gameId];
  return pools ? Object.values(pools).flat() : [];
}

export function curatedPromptCount(gameId: string): number {
  return curatedPromptsForGame(gameId).length;
}
