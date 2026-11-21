# Implementation and Verification Status

This status distinguishes local implementation from production integration. A
route or a compiling native plugin is not proof of a complete user flow.

## Individual game audit

All 21 game IDs are registered and have content entries. The table describes
the current pass-and-play implementation; none has tested two-phone gameplay,
reconnection, or synchronized answer privacy.

| Mood | Game | Local implementation and remaining gap |
|---|---|---|
| Platonic | Six Questions | Six-round answer/guess flow, local scoring and reveal. The “perfect six” award now requires six correct rounds. Game UI, result persistence and resume are not tested. |
| Platonic | How Well Do You Know Me? | Uses the same answer/guess UI as Six Questions rather than a separate mechanics engine. No dedicated game-flow test or resume. |
| Platonic | Would You Rather? | Two authored choices, optional custom choice, private pass-and-play votes, reveal and score. This flow has no component-level test or remote state sync. |
| Platonic | Who’s More Likely? | Private pass-and-play votes and reveal using player names. It has no component-level test or remote state sync. |
| Romantic | Love Quiz | Uses the shared preference-choice UI; it is not a distinct quiz engine. No per-game UI test or remote sync. |
| Romantic | Memory Lane | Shared single-textarea challenge form; it does not collect two private submissions or compare/reveal them. |
| Romantic | Love Language | Uses yes/maybe/no choices rather than a private ranking across the five love languages. |
| Romantic | Couple Challenges | Shared challenge text form; separate acceptance, consent, completion and results are not implemented. |
| Romantic | Romantic Roulette | Dedicated-route spinner advances generic prompts; no independently tested roulette, persisted history or synchronized reveal. |
| Sexual | Truth or Dare | Local reducer covers turns, consent actions, strikes, alternatives and five-step state. Page state is not persisted for restart/reconnect; UI coverage is incomplete. |
| Sexual | Desire Match | Local private yes/maybe/no choices and reveal. No remote privacy, persistence or game UI test. |
| Sexual | Naughty Roulette | Dedicated-route generic spinner; intensity selection and independently verified random selection are absent. |
| Sexual | Temptations | Four input fields render, but only the first is controlled; partner selection and approval are not implemented. |
| Sexual | Desire Quiz | Uses the generic answer/guess UI and content; no unique quiz engine or remote sync. |
| Sexual | Emoji Confessions | Local emoji composition; partner interpretation/guess and reveal are not implemented. |
| Fantasy | Fantasy Cards | Local private yes/maybe/no selection and reveal. No remote privacy or game UI test. |
| Fantasy | Scenario Builder | Shared editable fields; a separate partner approval step and persistence are missing. |
| Fantasy | The Menu | Uses yes/maybe/no choices; independent ranking and comparison are not wired into the page. |
| Fantasy | Challenge Duel | Shared single-textarea form; two private submissions, reveal gating and scoring are not implemented in the page. |
| Fantasy | Choose Your Story | One branching story; current node is saved to the local game session. No two-player turn synchronization or story-flow test. |
| Fantasy | Fantasy Roulette | Generates setting/atmosphere/theme/direction combinations. No durable room history or cross-device no-repeat verification. |

## Content measurement

Run `node .\scripts\report-content-catalogue.mjs` to regenerate the catalogue
audit. At this revision it reports 19,074 generated combinations and 11,075
valid unique private-build experiences, with zero duplicate IDs and 7,999
exact/semantic duplicates excluded. Semantic comparisons use normalized
prompt/choice fingerprints and Jaccard similarity >= 0.82. This total does not
apply an individual couple’s intensity or excluded-topic settings.

The no-repeat selector excludes all persisted encountered IDs and compares
against persisted semantic fingerprints. Unit tests cover old semantic
duplicates and the full catalogue threshold.

## Platform and service verification

| Requirement | Status | Evidence / remaining limitation |
|---|---|---|
| Web type-check and production bundle | Complete and tested | `npm run build`; existing large-chunk warning remains. |
| Unit tests | Complete and tested | `npm test`; latest run: 40 tests passed. |
| Supabase room authorization | Complete and tested locally | `.\scripts\verify-supabase.ps1`; 8 pgTAP assertions cover room creation, cross-room visibility, invitation join, two-member cap, rejection and revocation. No production project tested. |
| Supabase room/game/chat Realtime | Implemented but externally unverified | Authenticated anonymous identity and room RPCs are wired; game state, storage, actual remote pairing/chat, and live Realtime are not end-to-end verified. |
| Photo/video/gallery/voice plugins | Implemented but externally unverified | Native integrations compile. No emulator/device is attached; preview, retake, recipient playback, lifecycle and cleanup are not physically verified. Native voice currently sends after stop without preview. |
| Disappearing media | Implemented but externally unverified | Local timed expiry starts on first view and survives local restart via IndexedDB. Server-side deletion/access denial, remote attachment storage and true view-once are not implemented. |
| FCM notifications | Blocked by Firebase project configuration and server dispatch | Android push plugin is present; no `google-services.json`, secure token lifecycle, server dispatch or live FCM test. |
| End-to-end encryption | Incomplete | AES-GCM text sealing exists, but key exchange, device-protected storage, rotation, media encryption and a complete E2E pipeline are missing. Do not market the app as E2EE. |
| Android debug build | Complete and tested | Fresh debug APK built by `npm run android:assemble`; Android `versionName` is 0.1.0, `versionCode` 1. No device launch test. |
| Physical two-phone use | Blocked by unavailable devices and production backend | ADB listed no connected emulator or phone. No live Supabase project credentials are configured. |
| Release signing | Blocked by owner-controlled signing key | No keystore was created. The owner must create and securely back up the production signing key once, then store it outside the repository. |

Use [the Android manual checklist](./ANDROID_MANUAL_VERIFICATION.md) for owner
testing on devices. It identifies flows that cannot pass until missing media
and remote-delivery support is implemented.

## Production setup still required

- Configure production Supabase URL and public anon key, enable anonymous
  sign-in, apply versioned migrations, and enable Realtime for `chat_messages`.
- Complete and validate remote game-state synchronization, media storage and
  media access control before claiming two-phone or disappearing-media support.
- Configure Firebase project/package identity, add the owner-provided
  `google-services.json`, deploy a credential-protected notification sender,
  and test token refresh/removal and notification preferences.
- Complete each game-specific mechanic above and test it on two independent
  devices before calling the game suite release-ready.
- Generate/back up an owner-controlled Android signing key before any release
  signing. Never commit it.

No live cloud, FCM, physical camera or two-phone verification is claimed.
