# Implementation Status

Status meanings: NOT STARTED, IN PROGRESS, IMPLEMENTED, TESTED LOCALLY,
INTEGRATION TESTED, or COMPLETE.

| Feature | Status | Evidence |
|---|---|---|
| React/Vite foundation | TESTED LOCALLY | `package.json`, `src/App.tsx` |
| Dark cinematic UI | IMPLEMENTED | `src/index.css`, `src/components`, `src/pages` |
| Splash and age gate | TESTED LOCALLY | `src/pages/SplashPage.tsx` |
| Nickname/onboarding | TESTED LOCALLY | `src/pages/onboarding/OnboardingFlow.tsx` |
| Pairing invitation generation | TESTED LOCALLY | `src/services/pairing.ts` |
| Pairing join route | TESTED LOCALLY | `src/pages/onboarding/JoinRoomPage.tsx` |
| Exactly-two room authorization | NOT STARTED | no server-side membership enforcement |
| BroadcastChannel chat | IMPLEMENTED | `src/services/channel.ts`, `src/App.tsx` |
| Internet realtime | NOT STARTED | Supabase credentials/schema are absent |
| Pass & Play | TESTED LOCALLY | `src/pages/games/GamePlayPage.tsx` |
| Six Questions | TESTED LOCALLY | pass-and-play UI and state |
| Truth or Dare engine | TESTED LOCALLY | `src/games/tod.ts`, `src/games/tod.test.ts` |
| Romantic dedicated engines | IN PROGRESS | shared prompt UI is insufficient for independent engines |
| Sexual dedicated engines | IN PROGRESS | shared prompt UI is insufficient for independent engines |
| Fantasy dedicated engines | IN PROGRESS | story and roulette have partial implementations |
| AES-GCM chat wrapper | TESTED LOCALLY | `src/security/crypto.ts` |
| Camera/photo/video UI | TESTED LOCALLY | `src/pages/chat/ChatPage.tsx` |
| Native Capacitor photo camera | TESTED LOCALLY | Capacitor Camera plugin and Android manifest |
| Disappearing media lifecycle | IN PROGRESS | expiry metadata exists; server/local enforcement is incomplete |
| Trophy cabinet | TESTED LOCALLY | `src/stores/trophy.store.ts` |
| No-repeat content engine | TESTED LOCALLY | `src/content/engine.ts`, history in IndexedDB |
| 10,000-experience catalogue | NOT STARTED | current catalogue is generated but below target |
| Supabase migrations | NOT STARTED | no migration files or credentials |
| Push notifications | NOT STARTED | no native notification integration |
| Android APK | TESTED LOCALLY | Capacitor Android project produces a debug APK with JDK 21 |
| Documentation | IN PROGRESS | permanent docs being completed |
