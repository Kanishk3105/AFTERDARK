// Application configuration — all branding and settings are centralized here
// so the product name, tagline, and theme can be changed without rewriting components.

import type { IntensityLevel } from '@/types';

export const DEFAULT_INTENSITY: IntensityLevel = 'moderate';

export const INTENSITY_SCORE: Record<IntensityLevel, number> = {
  mild: 20,
  moderate: 55,
  spicy: 87,
  extreme: 100,
};

export const APP_CONFIG = {
  name: 'AFTERDARK',
  tagline: 'Two people. Four moods. Endless discovery.',
  secondaryTagline: 'YOUR ROOM. YOUR RULES. YOUR ADVENTURE.',
  version: '0.1.0',
  minAge: 18,
  /**
   * Private builds keep every mood, including SEXUAL.
   * A public-store build filters cards marked ineligible for store distribution
   * without renaming or deleting the category.
   */
  distribution: 'private' as 'private' | 'public',
  contentPackVersion: '2026.11.1',
} as const;

export const COLORS = {
  bg: '#0B0508',
  bgSecondary: '#19090F',
  burgundy: '#460B1B',
  red: '#8B1732',
  gold: '#D5AA6D',
  text: '#F5E9EC',
  textSecondary: '#BA9BA4',
} as const;

export type MoodId = 'platonic' | 'romantic' | 'sexual' | 'fantasy';

export interface MoodConfig {
  id: MoodId;
  label: string;
  emoji: string;
  description: string;
  gradient: string;
  borderColor: string;
  glowColor: string;
  games: GameConfig[];
}

export interface GameConfig {
  id: string;
  name: string;
  description: string;
  emoji: string;
  moodId: MoodId;
  minPlayers: number;
  maxPlayers: number;
  estimatedMinutes: number;
  hasIntensityLevels: boolean;
  features: string[];
}

export const MOODS: MoodConfig[] = [
  {
    id: 'platonic',
    label: 'PLATONIC',
    emoji: '🤍',
    description: 'Connection, understanding & fun',
    gradient: 'from-slate-800/60 via-slate-700/40 to-slate-900/80',
    borderColor: 'border-slate-400/30',
    glowColor: 'shadow-slate-400/20',
    games: [
      {
        id: 'six-questions',
        name: 'Six Questions',
        description: 'Answer six questions and predict your partner\'s choices. How well do you really know each other?',
        emoji: '🎯',
        moodId: 'platonic',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 10,
        hasIntensityLevels: false,
        features: ['MCQ', 'Predictions', 'Score tracking', 'Match percentage'],
      },
      {
        id: 'how-well-do-you-know-me',
        name: 'How Well Do You Know Me?',
        description: 'Personal questions with private answers and simultaneous reveal.',
        emoji: '💭',
        moodId: 'platonic',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 15,
        hasIntensityLevels: false,
        features: ['Private answers', 'Simultaneous reveal', 'Score tracking'],
      },
      {
        id: 'would-you-rather',
        name: 'Would You Rather?',
        description: 'Two impossible choices. Pick one — or create your own third option.',
        emoji: '⚖️',
        moodId: 'platonic',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 10,
        hasIntensityLevels: false,
        features: ['Two choices', 'Custom answers', 'Alternating turns'],
      },
      {
        id: 'whos-more-likely',
        name: "Who's More Likely?",
        description: 'Vote secretly on who\'s more likely to do something — then see if you agree.',
        emoji: '🤔',
        moodId: 'platonic',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 10,
        hasIntensityLevels: false,
        features: ['Secret voting', 'Simultaneous reveal', 'Agreement tracking'],
      },
    ],
  },
  {
    id: 'romantic',
    label: 'ROMANTIC',
    emoji: '🌹',
    description: 'Affection, memories & love',
    gradient: 'from-rose-900/60 via-pink-900/40 to-rose-950/80',
    borderColor: 'border-rose-400/30',
    glowColor: 'shadow-rose-400/20',
    games: [
      {
        id: 'love-quiz',
        name: 'Love Quiz',
        description: 'Questions about your favourite moments, preferences, and romantic memories.',
        emoji: '💕',
        moodId: 'romantic',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 15,
        hasIntensityLevels: false,
        features: ['MCQ', 'Open text', 'Predictions'],
      },
      {
        id: 'memory-lane',
        name: 'Memory Lane',
        description: 'Walk through your shared memories and see how differently you remember them.',
        emoji: '📸',
        moodId: 'romantic',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 15,
        hasIntensityLevels: false,
        features: ['Shared memories', 'Compare answers', 'Save memories'],
      },
      {
        id: 'love-language',
        name: 'Love Language',
        description: 'Discover how you both give and receive love.',
        emoji: '💝',
        moodId: 'romantic',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 10,
        hasIntensityLevels: false,
        features: ['Five love languages', 'Fun exploration', 'Comparison'],
      },
      {
        id: 'couple-challenges',
        name: 'Couple Challenges',
        description: 'Sweet activities you both accept and complete together.',
        emoji: '🎯',
        moodId: 'romantic',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 20,
        hasIntensityLevels: false,
        features: ['Activities', 'Mutual acceptance', 'Completion tracking'],
      },
      {
        id: 'romantic-roulette',
        name: 'Romantic Roulette',
        description: 'Spin the wheel and discover a romantic activity together.',
        emoji: '🎰',
        moodId: 'romantic',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 5,
        hasIntensityLevels: false,
        features: ['Animated wheel', 'Randomized activities', 'Fun reveals'],
      },
    ],
  },
  {
    id: 'sexual',
    label: 'SEXUAL',
    emoji: '🔥',
    description: 'Desire, intimacy & exploration',
    gradient: 'from-red-900/60 via-rose-900/40 to-red-950/80',
    borderColor: 'border-red-500/30',
    glowColor: 'shadow-red-500/20',
    games: [
      {
        id: 'truth-or-dare',
        name: 'Truth or Dare',
        description: 'The classic game with a three-level twist ladder. Accept, swap, or escalate.',
        emoji: '🎲',
        moodId: 'sexual',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 20,
        hasIntensityLevels: true,
        features: ['Three-level twist', 'Five-step terminal', 'Strike system', 'Alternating turns'],
      },
      {
        id: 'desire-match',
        name: 'Desire Match',
        description: 'Independently select your preferences. Discover what you both want.',
        emoji: '💞',
        moodId: 'sexual',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 10,
        hasIntensityLevels: true,
        features: ['Private selection', 'Match reveal', 'No judgment'],
      },
      {
        id: 'naughty-roulette',
        name: 'Naughty Roulette',
        description: 'Spin for a randomized challenge. Intensity is in your hands.',
        emoji: '🎡',
        moodId: 'sexual',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 10,
        hasIntensityLevels: true,
        features: ['Animated wheel', 'Intensity settings', 'Optional acceptance'],
      },
      {
        id: 'temptations',
        name: 'Temptations',
        description: 'Create four choices for your partner. They pick one — or suggest their own.',
        emoji: '😈',
        moodId: 'sexual',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 15,
        hasIntensityLevels: true,
        features: ['Create choices', 'Custom options', 'Mutual approval'],
      },
      {
        id: 'desire-quiz',
        name: 'Desire Quiz',
        description: 'Discover your preference match through intimate questions.',
        emoji: '🔮',
        moodId: 'sexual',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 15,
        hasIntensityLevels: true,
        features: ['Preference matching', 'Custom answers', 'Alternating roles'],
      },
      {
        id: 'emoji-confessions',
        name: 'Emoji Confessions',
        description: 'Express yourself with emojis. Can your partner decode your message?',
        emoji: '🫦',
        moodId: 'sexual',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 10,
        hasIntensityLevels: false,
        features: ['Emoji sequences', 'Partner guesses', 'Fun reveals'],
      },
    ],
  },
  {
    id: 'fantasy',
    label: 'FANTASY',
    emoji: '😈',
    description: 'Scenarios, stories & adventures',
    gradient: 'from-purple-900/60 via-violet-900/40 to-purple-950/80',
    borderColor: 'border-purple-400/30',
    glowColor: 'shadow-purple-400/20',
    games: [
      {
        id: 'fantasy-cards',
        name: 'Fantasy Cards',
        description: 'Themed scenario cards. Independently indicate your interests.',
        emoji: '🃏',
        moodId: 'fantasy',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 15,
        hasIntensityLevels: true,
        features: ['Themed scenarios', 'Independent selection', 'Boundaries'],
      },
      {
        id: 'scenario-builder',
        name: 'Scenario Builder',
        description: 'Build your own scenario together. Setting, roles, atmosphere — all yours.',
        emoji: '🏗️',
        moodId: 'fantasy',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 20,
        hasIntensityLevels: true,
        features: ['Custom scenarios', 'Partner approval', 'Configurable fields'],
      },
      {
        id: 'the-menu',
        name: 'The Menu',
        description: 'Rank your preferences privately. Discover your overlaps.',
        emoji: '📋',
        moodId: 'fantasy',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 10,
        hasIntensityLevels: false,
        features: ['Private ranking', 'Comparison reveal', 'Matching insights'],
      },
      {
        id: 'challenge-duel',
        name: 'Challenge Duel',
        description: 'Same challenge, independent submissions. Who does it better?',
        emoji: '⚔️',
        moodId: 'fantasy',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 15,
        hasIntensityLevels: false,
        features: ['Same challenge', 'Simultaneous play', 'Score tracking'],
      },
      {
        id: 'choose-your-story',
        name: 'Choose Your Story',
        description: 'An interactive branching narrative. Your decisions shape the experience.',
        emoji: '📖',
        moodId: 'fantasy',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 30,
        hasIntensityLevels: true,
        features: ['Branching narrative', 'Multiple chapters', 'Save progress'],
      },
      {
        id: 'fantasy-roulette',
        name: 'Fantasy Roulette',
        description: 'Random combinations of approved scenario elements. Never the same twice.',
        emoji: '🎪',
        moodId: 'fantasy',
        minPlayers: 2,
        maxPlayers: 2,
        estimatedMinutes: 10,
        hasIntensityLevels: true,
        features: ['Random combinations', 'No repeats', 'Customizable elements'],
      },
    ],
  },
];

// Navigation items
export const NAV_ITEMS = [
  { id: 'home', label: 'HOME', icon: '🏠', path: '/home' },
  { id: 'games', label: 'GAMES', icon: '🎮', path: '/games' },
  { id: 'chat', label: 'CHAT', icon: '💬', path: '/chat' },
  { id: 'trophies', label: 'TROPHIES', icon: '🏆', path: '/trophies' },
  { id: 'settings', label: 'SETTINGS', icon: '⚙️', path: '/settings' },
] as const;

// Trophy definitions
export interface TrophyDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: MoodId | 'general';
  requirement: string;
  threshold: number;
}

export const TROPHIES: TrophyDef[] = [
  { id: 'first-spark', name: 'First Spark', description: 'Complete your first game', emoji: '🌹', category: 'general', requirement: 'games_completed', threshold: 1 },
  { id: 'perfect-match', name: 'Perfect Match', description: 'Match all six questions', emoji: '💞', category: 'platonic', requirement: 'perfect_six_questions', threshold: 1 },
  { id: 'bold-explorer', name: 'Bold Explorer', description: 'Try all four mood categories', emoji: '🔥', category: 'general', requirement: 'moods_explored', threshold: 4 },
  { id: 'fantasy-maker', name: 'Fantasy Maker', description: 'Create a custom scenario', emoji: '😈', category: 'fantasy', requirement: 'scenarios_created', threshold: 1 },
  { id: 'chat-sparks', name: 'Chat Sparks', description: 'Complete a chat mini-game', emoji: '💋', category: 'general', requirement: 'chat_games', threshold: 1 },
  { id: 'game-master', name: 'Game Master', description: 'Complete ten game sessions', emoji: '🏆', category: 'general', requirement: 'games_completed', threshold: 10 },
  { id: 'paired-up', name: 'Paired Up', description: 'Create your first private room', emoji: '🔗', category: 'general', requirement: 'rooms_created', threshold: 1 },
  { id: 'truth-seeker', name: 'Truth Seeker', description: 'Complete your first Truth or Dare round', emoji: '🎲', category: 'sexual', requirement: 'tod_rounds', threshold: 1 },
  { id: 'five-step-master', name: 'Five-Step Master', description: 'Complete a five-step sequence', emoji: '🔥', category: 'sexual', requirement: 'five_step_complete', threshold: 1 },
  { id: 'storyteller', name: 'Storyteller', description: 'Complete your first story', emoji: '📖', category: 'fantasy', requirement: 'stories_completed', threshold: 1 },
  { id: 'desire-explorer', name: 'Desire Explorer', description: 'Complete your first Desire Match', emoji: '💞', category: 'sexual', requirement: 'desire_matches', threshold: 1 },
  { id: 'variety-seeker', name: 'Variety Seeker', description: 'Play ten different games', emoji: '🎮', category: 'general', requirement: 'unique_games_played', threshold: 10 },
  { id: 'challenger', name: 'Challenger', description: 'Complete fifty unique challenges', emoji: '⚡', category: 'general', requirement: 'unique_challenges', threshold: 50 },
  { id: 'explorer-supreme', name: 'Explorer Supreme', description: 'Encounter one hundred unique prompts', emoji: '🌟', category: 'general', requirement: 'unique_prompts', threshold: 100 },
];
