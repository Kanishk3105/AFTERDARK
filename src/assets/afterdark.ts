import type { MoodId, IntensityLevel } from '@/types';

const root = '/assets/afterdark';

const gameCovers = {
  'six-questions': `${root}/games/platonic/six-questions.svg`,
  'how-well-do-you-know-me': `${root}/games/platonic/how-well-do-you-know-me.svg`,
  'would-you-rather': `${root}/games/platonic/would-you-rather.svg`,
  'whos-more-likely': `${root}/games/platonic/whos-more-likely.svg`,
  'love-quiz': `${root}/games/romantic/love-quiz.svg`,
  'memory-lane': `${root}/games/romantic/memory-lane.svg`,
  'love-language': `${root}/games/romantic/love-language.svg`,
  'couple-challenges': `${root}/games/romantic/couple-challenges.svg`,
  'romantic-roulette': `${root}/games/romantic/romantic-roulette.svg`,
  'truth-or-dare': `${root}/games/sexual/truth-or-dare.svg`,
  'desire-match': `${root}/games/sexual/desire-match.svg`,
  'naughty-roulette': `${root}/games/sexual/naughty-roulette.svg`,
  temptations: `${root}/games/sexual/temptations.svg`,
  'desire-quiz': `${root}/games/sexual/desire-quiz.svg`,
  'emoji-confessions': `${root}/games/sexual/emoji-confessions.svg`,
  'fantasy-cards': `${root}/games/fantasy/fantasy-cards.svg`,
  'scenario-builder': `${root}/games/fantasy/scenario-builder.svg`,
  'the-menu': `${root}/games/fantasy/the-menu.svg`,
  'challenge-duel': `${root}/games/fantasy/challenge-duel.svg`,
  'choose-your-story': `${root}/games/fantasy/choose-your-story.svg`,
  'fantasy-roulette': `${root}/games/fantasy/fantasy-roulette.svg`,
} as const;

const trophyArt = {
  'first-spark': `${root}/trophies/first-spark.svg`,
  'perfect-match': `${root}/trophies/perfect-match.svg`,
  'bold-explorer': `${root}/trophies/bold-explorer.svg`,
  'fantasy-maker': `${root}/trophies/fantasy-maker.svg`,
  'chat-sparks': `${root}/trophies/chat-sparks.svg`,
  'game-master': `${root}/trophies/game-master.svg`,
  'paired-up': `${root}/trophies/paired-up.svg`,
  'truth-seeker': `${root}/trophies/truth-seeker.svg`,
  'five-step-master': `${root}/trophies/five-step-master.svg`,
  storyteller: `${root}/trophies/storyteller.svg`,
  'desire-explorer': `${root}/trophies/desire-explorer.svg`,
  'variety-seeker': `${root}/trophies/variety-seeker.svg`,
  challenger: `${root}/trophies/challenger.svg`,
  'explorer-supreme': `${root}/trophies/explorer-supreme.svg`,
} as const;

export const AFTERDARK_ASSETS = {
  brand: {
    appIcon: `${root}/brand/app-icon.svg`,
    emblem: `${root}/brand/brand-emblem.svg`,
    splash: `${root}/brand/splash-room-background.webp`,
    wordmark: `${root}/brand/wordmark.svg`,
  },
  moods: {
    platonic: `${root}/moods/platonic-hero.webp`,
    romantic: `${root}/moods/romantic-hero.svg`,
    sexual: `${root}/moods/sexual-hero.webp`,
    fantasy: `${root}/moods/fantasy-hero.svg`,
  } satisfies Record<MoodId, string>,
  games: gameCovers,
  onboarding: [
    `${root}/onboarding/step-01-your-name.svg`,
    `${root}/onboarding/step-02-partner-name.svg`,
    `${root}/onboarding/step-03-preferences.svg`,
    `${root}/onboarding/step-04-room-ready.svg`,
    `${root}/onboarding/step-05-invite-partner.svg`,
    `${root}/onboarding/step-06-welcome.svg`,
  ],
  scenes: {
    hotelSuite: `${root}/scenes/hotel-suite.svg`,
    masqueradeBall: `${root}/scenes/masquerade-ball.svg`,
    privateLounge: `${root}/scenes/private-lounge.svg`,
    rooftopNight: `${root}/scenes/rooftop-night.svg`,
    privateVilla: `${root}/scenes/private-villa.svg`,
    mysteriousHallway: `${root}/scenes/mysterious-hallway.svg`,
  },
  trophies: trophyArt,
  chat: {
    background: `${root}/chat/chat-background.svg`,
    emptyState: `${root}/chat/empty-state.svg`,
    cameraOverlay: `${root}/chat/camera-overlay.svg`,
    voiceWaveform: `${root}/chat/voice-waveform.svg`,
    viewOnceRing: `${root}/chat/view-once-ring.svg`,
    stickers: {
      kiss: `${root}/chat/stickers/kiss.svg`,
      heart: `${root}/chat/stickers/heart.svg`,
      flame: `${root}/chat/stickers/flame.svg`,
      devil: `${root}/chat/stickers/devil.svg`,
      cuffs: `${root}/chat/stickers/cuffs.svg`,
      mask: `${root}/chat/stickers/mask.svg`,
      rose: `${root}/chat/stickers/rose.svg`,
      wine: `${root}/chat/stickers/wine.svg`,
      cherries: `${root}/chat/stickers/cherries.svg`,
      feather: `${root}/chat/stickers/feather.svg`,
      key: `${root}/chat/stickers/key.svg`,
      spark: `${root}/chat/stickers/spark.svg`,
    },
  },
  intensity: {
    mild: `${root}/intensity/mild-pg13.svg`,
    moderate: `${root}/intensity/moderate-pg13.svg`,
    spicy: `${root}/intensity/spicy-18.svg`,
    extreme: `${root}/intensity/extreme-18.svg`,
  } satisfies Record<IntensityLevel, string>,
  ui: {
    rouletteWheel: `${root}/ui/roulette-wheel.svg`,
    gameCardFrame: `${root}/ui/game-card-frame.svg`,
    ornateDivider: `${root}/ui/ornate-divider.svg`,
    progressTrack: `${root}/ui/progress-track.svg`,
    lockedBadge: `${root}/ui/locked-badge.svg`,
    loadingRose: `${root}/ui/loading-rose.svg`,
    cardBack: `${root}/ui/card-back.svg`,
    dice: `${root}/ui/dice.svg`,
    maskOverlay: `${root}/ui/mask-overlay.svg`,
  },
} as const;

export type GameCoverId = keyof typeof gameCovers;
export type TrophyArtId = keyof typeof trophyArt;

const isGameCoverId = (id: string): id is GameCoverId =>
  Object.prototype.hasOwnProperty.call(gameCovers, id);

const isTrophyArtId = (id: string): id is TrophyArtId =>
  Object.prototype.hasOwnProperty.call(trophyArt, id);

export function getGameCover(gameId: string): string {
  return isGameCoverId(gameId) ? gameCovers[gameId] : AFTERDARK_ASSETS.ui.cardBack;
}

export function getTrophyArt(trophyId: string): string {
  return isTrophyArtId(trophyId) ? trophyArt[trophyId] : AFTERDARK_ASSETS.brand.emblem;
}

export const ALL_AFTERDARK_ASSET_PATHS = [
  ...Object.values(AFTERDARK_ASSETS.brand),
  ...Object.values(AFTERDARK_ASSETS.moods),
  ...Object.values(AFTERDARK_ASSETS.games),
  ...AFTERDARK_ASSETS.onboarding,
  ...Object.values(AFTERDARK_ASSETS.scenes),
  ...Object.values(AFTERDARK_ASSETS.trophies),
  AFTERDARK_ASSETS.chat.background,
  AFTERDARK_ASSETS.chat.emptyState,
  AFTERDARK_ASSETS.chat.cameraOverlay,
  AFTERDARK_ASSETS.chat.voiceWaveform,
  AFTERDARK_ASSETS.chat.viewOnceRing,
  ...Object.values(AFTERDARK_ASSETS.chat.stickers),
  ...Object.values(AFTERDARK_ASSETS.intensity),
  ...Object.values(AFTERDARK_ASSETS.ui),
] as const;
