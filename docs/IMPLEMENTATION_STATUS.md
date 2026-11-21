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
| Fantasy | The Menu | Independent private rankings, duplicate-rank rejection, simultaneous reveal, match scoring and local session persistence are wired. Remote privacy, reconnect behavior and component tests are not implemented. |
| Fantasy | Challenge Duel | Shared single-textarea form; two private submissions, reveal gating and scoring are not implemented in the page. |
| Fantasy | Choose Your Story | One branching story; current node is saved to the local game session. No two-player turn synchronization or story-flow test. |
| Fantasy | Fantasy Roulette | Generates setting/atmosphere/theme/direction combinations. No durable room history or cross-device no-repeat verification. |

## Content measurement

Run `npm run content:audit` to regenerate the
machine-readable `reports/content-catalogue-audit.json` report and print it to
stdout. The audit measures generated/unique experiences, duplicate IDs,
normalized prompts, near-duplicate examples, required metadata, game
categorization and public/private eligibility. At this revision it reports
19,074 generated combinations and 11,075 valid unique private-build
experiences, with zero duplicate IDs, zero exact duplicate experiences, and
7,999 lexical near-duplicate candidates excluded. It also reports 18,955
unique normalized prompt strings (119 repeated prompt strings, including
reusable stems). Near-duplicate comparisons use normalized prompt/choice token
sets and Jaccard similarity >= 0.82; this is a lexical heuristic, not a
semantic language model. This total does not apply an individual couple’s
intensity or excluded-topic settings. Pair history remains local and is not
synchronized between devices.

The no-repeat selector excludes all persisted encountered IDs and compares
against persisted semantic fingerprints. Unit tests cover old semantic
duplicates and the full catalogue threshold.

## Platform and service verification

| Requirement | Status | Evidence / remaining limitation |
|---|---|---|
| Web type-check and production bundle | Complete and tested | `npm run build`; existing large-chunk warning remains. |
| Unit tests | Tested | `npm test`; latest run: 49 tests passed across 9 files. |
| Supabase schema and local configuration | Implemented, local database tests pending | Versioned migrations, RLS, Edge Functions, local `config.toml` and pgTAP media/room tests exist. A GitHub Actions workflow now starts local Supabase and runs the migrations, pgTAP and Deno adapter tests. Docker Desktop's Linux engine is unavailable in this workstation session, so no successful local database run is claimed. |
| Supabase remote chat | Implemented but externally unverified | Authenticated room RPCs, message subscription and encrypted media upload/view endpoints are wired. Live two-phone relay and offline retry are unverified. Full game-state sync is not implemented; Anywhere mode remains disabled. |
| Room deletion | Incomplete | Revocation blocks access and queues media for cleanup, but archived room/chat/game metadata is not physically purged. |
| Photo/video/gallery/voice | Implemented but device-unverified | Native plugins compile; capture/gallery/voice now show preview before explicit send. Media bytes are sealed locally and for remote upload. No physical device or emulator is attached. |
| Disappearing media | Reservation/completion flow implemented; database tests pending | Expiring media uses a two-minute atomic reservation, stable-token download retries, idempotent completion, release on failed download/decryption, and server-started expiry. Consumed/expired metadata and objects are removed by scheduled cleanup. pgTAP now covers contention, completion replay and release/retry; database/Storage execution remains pending because Docker's Linux engine is unavailable locally. |
| FCM notifications | Deterministic server adapter added; live dispatch incomplete | Native registration/token refresh/revocation, privacy-safe generic payloads, preference/quiet-hours filtering and bounded retries for transient FCM errors are wired. Shared adapter tests cover categories, quiet hours, privacy, retries and stale-token detection. Game, invitation, turn, trophy and presence event producers are not all wired; real delivery remains Firebase/device-unverified. |
| End-to-end encryption | Incomplete; do not market as E2EE | The invite still transports a shared raw room key. A protocol/library assessment and threat model are documented in [the crypto assessment](./CRYPTO_PROTOCOL_ASSESSMENT.md); no reviewed library found in that assessment supports both required client platforms with an appropriate supported API. Authenticated pairing, independent sessions, forward secrecy, replay protection, revocation/key rotation and independent-device crypto tests remain missing. |
| Android debug build | Tested | Fresh `npm run android:assemble` passed using JDK 21. APK is at `android/app/build/outputs/apk/debug/app-debug.apk`. Android custom-scheme invite handling is wired but not device-tested. |
| Android release configuration | Tested without release credentials | Unsigned `bundleRelease` task passed. Signing is conditional on the four `AFTERDARK_RELEASE_*` environment variables; the bundle is not ready for distribution until signed and verified with the owner-controlled key. |
| Physical two-phone use | Not tested | ADB found no connected emulator or phone. No live Supabase project credentials are configured. |
| Release signing | Blocked by owner-controlled signing key | No keystore was created. The owner must create and securely back up the production signing key once, then store it outside the repository. |

Use [the Android manual checklist](./ANDROID_MANUAL_VERIFICATION.md) for device
testing. It intentionally records physical-device checks as pending.

## Engineering work still incomplete (not owner-side setup)

- Select and integrate a maintained, reviewed protocol library with supported
  React/browser and Capacitor Android APIs; remove shared-key URL transport and
  implement the complete protocol/key lifecycle before sending sensitive
  content remotely.
- Synchronize pair-specific prompt history and game state between devices.
- Complete remote game-session synchronization, reconnection and retry
  handling; per-game mechanics listed above remain in progress.
- Wire invitation, game, turn, trophy and presence events to push dispatch.
- Add authenticated E2E device identity/key agreement and pair-scoped history;
  local content history is not synchronized to the room.
- Obtain a successful Supabase CI run for the migration/pgTAP suite and add
  hidden-answer tests as authoritative remote game-session APIs are developed.

## Owner-side activation and verification

- Deploy the migrations/functions, configure Realtime and schedule cleanup in
  the owner's Supabase project.
- Configure Firebase project/package identity, add owner-provided
  `google-services.json`, deploy FCM secrets and verify real push delivery.
- Execute the physical-device and two-phone checklist.
- Generate/back up an owner-controlled Android signing key before any release
  signing. Never commit it.

The 11,075 eligible-content catalogue audit is reproducible with
`node .\scripts\report-content-catalogue.mjs`. No live cloud, FCM, physical
camera, or two-phone verification is claimed.
