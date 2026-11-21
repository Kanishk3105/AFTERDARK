import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MoodId, PlayMode, UserPreferences } from '@/types';

interface AppState {
  hasCompletedOnboarding: boolean;
  ageAcknowledged: boolean;
  playerName: string;
  partnerName: string;
  pronouns: string;
  deviceId: string;
  roomId: string;
  roomCode: string;
  inviteExpiresAt: string | null;
  inviteRevoked: boolean;
  currentMood: MoodId;
  playMode: PlayMode;
  onboardingStep: number;
  preferences: UserPreferences;

  setAgeAcknowledged: (value: boolean) => void;
  setPlayerName: (name: string) => void;
  setPartnerName: (name: string) => void;
  setPronouns: (value: string) => void;
  ensureDeviceId: () => string;
  setRoomId: (id: string, code: string) => void;
  setInvite: (code: string, expiresAt: string) => void;
  revokeInvite: () => void;
  setCurrentMood: (mood: MoodId) => void;
  setPlayMode: (mode: PlayMode) => void;
  setOnboardingStep: (step: number) => void;
  updatePreferences: (partial: Partial<UserPreferences>) => void;
  completeOnboarding: () => void;
  resetAll: () => void;
}

const defaultPreferences: UserPreferences = {
  language: 'English',
  pronouns: '',
  coupleConfig: 'mf',
  intensity: 'spicy',
  interests: ['Romance', 'Deep Questions', 'Challenges'],
  excludedTopics: [],
  showOnlineStatus: true,
  showLastSeen: true,
  readReceipts: true,
  showGameActivity: true,
  allowCamera: true,
  allowMicrophone: true,
  notifications: {
    messages: true,
    gameInvites: true,
    partnerActivity: true,
    trophies: true,
    sound: true,
    vibration: true,
  },
  appearance: {
    reducedMotion: false,
    hapticFeedback: true,
    textSize: 'medium',
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      ageAcknowledged: false,
      playerName: '',
      partnerName: '',
      pronouns: '',
      deviceId: '',
      roomId: '',
      roomCode: '',
      inviteExpiresAt: null,
      inviteRevoked: false,
      currentMood: 'romantic',
      playMode: 'pass-and-play',
      onboardingStep: 0,
      preferences: defaultPreferences,

      setAgeAcknowledged: (value) => set({ ageAcknowledged: value }),
      setPlayerName: (name) => set({ playerName: name }),
      setPartnerName: (name) => set({ partnerName: name }),
      setPronouns: (value) => set({ pronouns: value }),
      ensureDeviceId: () => {
        const existing = get().deviceId;
        if (existing) return existing;
        const id = crypto.randomUUID();
        set({ deviceId: id });
        return id;
      },
      setRoomId: (id, code) => set({ roomId: id, roomCode: code, inviteRevoked: false }),
      setInvite: (code, expiresAt) => set({ roomCode: code, inviteExpiresAt: expiresAt, inviteRevoked: false }),
      revokeInvite: () => set({ inviteRevoked: true, inviteExpiresAt: new Date().toISOString() }),
      setCurrentMood: (mood) => set({ currentMood: mood }),
      setPlayMode: (mode) => set({ playMode: mode }),
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      updatePreferences: (partial) =>
        set((state) => ({
          preferences: { ...state.preferences, ...partial },
        })),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetAll: () =>
        set({
          hasCompletedOnboarding: false,
          ageAcknowledged: false,
          playerName: '',
          partnerName: '',
          pronouns: '',
          deviceId: '',
          roomId: '',
          roomCode: '',
          inviteExpiresAt: null,
          inviteRevoked: false,
          currentMood: 'romantic',
          playMode: 'pass-and-play',
          onboardingStep: 0,
          preferences: defaultPreferences,
        }),
    }),
    {
      name: 'afterdark-app-store',
    }
  )
);
