export type PlayMode = 'pass-and-play' | 'nearby' | 'anywhere';
export type MoodId = 'platonic' | 'romantic' | 'sexual' | 'fantasy';
export type IntensityLevel = 'mild' | 'moderate' | 'spicy' | 'extreme';
export type CoupleConfig = 'mf' | 'mm' | 'ff' | 'other';
export type ChallengeState = 'pending' | 'accepted' | 'completed' | 'swapped' | 'passed' | 'paused';
export type TwistLevel = 'easy' | 'adventure' | 'five-step';
export type MessageType = 'text' | 'image' | 'video' | 'voice' | 'emoji' | 'game-invite' | 'trophy-share' | 'system';
export type MediaExpiry = 'view-once' | '5s' | '10s' | '30s' | 'keep';

export interface Player {
  id: string;
  name: string;
  deviceId: string;
  createdAt: string;
}

export interface Room {
  id: string;
  code: string;
  players: [Player, Player?];
  status: 'waiting' | 'paired' | 'active' | 'archived';
  createdAt: string;
  settings: RoomSettings;
}

export interface RoomSettings {
  language: string;
  coupleConfig: CoupleConfig;
  defaultIntensity: IntensityLevel;
  interests: string[];
  excludedTopics: string[];
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  readReceipts: boolean;
}

export interface ContentCard {
  id: string;
  category: MoodId;
  gameId: string;
  mood: MoodId;
  intensity: IntensityLevel;
  language: string;
  theme: string;
  tags: string[];
  prompt: string;
  answerType: 'mcq' | 'open-text' | 'prediction' | 'boolean' | 'ranking' | 'emoji';
  answerChoices?: string[];
  followUp?: string;
  contentVersion: string;
  similarityFingerprint: string;
  eligibility: Record<string, boolean>;
}

export interface GameSession {
  id: string;
  roomId: string;
  gameId: string;
  moodId: MoodId;
  mode: PlayMode;
  status: 'in-progress' | 'completed' | 'paused' | 'abandoned';
  currentTurn: number;
  currentPlayer: number; // 0 or 1
  rounds: GameRound[];
  scores: [number, number];
  startedAt: string;
  completedAt?: string;
  intensity: IntensityLevel;
  /** Game-specific state so a session can resume after a refresh. */
  engine?: unknown;
  updatedAt: string;
}

export interface GameRound {
  roundNumber: number;
  cardId: string;
  prompt: string;
  options?: string[];
  answers: [GameAnswer?, GameAnswer?];
  predictions: [GameAnswer?, GameAnswer?];
  revealed: boolean;
  matched: boolean;
}

export interface GameAnswer {
  playerId: string;
  value: string;
  submittedAt: string;
}

export interface TruthOrDareState {
  currentChallenge: 'truth' | 'dare' | null;
  challengeState: ChallengeState;
  twistLevel: TwistLevel;
  strikes: [number, number];
  fiveStepProgress?: {
    currentStep: number;
    totalSteps: 5;
    steps: FiveStep[];
  };
}

export interface FiveStep {
  stepNumber: number;
  description: string;
  status: 'pending' | 'approved' | 'skipped' | 'completed';
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  type: MessageType;
  /** Plaintext for system text. Player content is stored in sealedContent when encryption is available. */
  content: string;
  sealedContent?: string;
  encryption: 'aes-gcm' | 'plaintext' | 'unavailable';
  mediaId?: string;
  mediaMime?: string;
  mediaExpiry?: MediaExpiry;
  previewLabel?: string;
  replyToId?: string;
  reactions: Record<string, string>; // emoji -> playerId
  status: 'sending' | 'sent' | 'delivered' | 'read';
  createdAt: string;
  expiresAt?: string;
  viewed?: boolean;
  deleted: boolean;
}

export interface UnlockedTrophy {
  trophyId: string;
  unlockedAt: string;
}

export interface UserPreferences {
  language: string;
  pronouns: string;
  coupleConfig: CoupleConfig;
  intensity: IntensityLevel;
  interests: string[];
  excludedTopics: string[];
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  readReceipts: boolean;
  showGameActivity: boolean;
  allowCamera: boolean;
  allowMicrophone: boolean;
  notifications: NotificationPreferences;
  appearance: AppearancePreferences;
}

export interface NotificationPreferences {
  messages: boolean;
  gameInvites: boolean;
  partnerActivity: boolean;
  trophies: boolean;
  sound: boolean;
  vibration: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface AppearancePreferences {
  reducedMotion: boolean;
  hapticFeedback: boolean;
  textSize: 'small' | 'medium' | 'large';
}
