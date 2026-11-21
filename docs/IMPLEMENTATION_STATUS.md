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
| Unit tests | Tested | `npm test`; latest run: 52 tests passed across 9 files. |
| Supabase schema and local configuration | Existing baseline tested; new migrations pending CI | The prior GitHub Actions run passed 28 pgTAP assertions and 7 Deno tests. This change adds fail-closed remote-content and permanent-deletion migrations, expands pgTAP to 41 assertions and Deno adapter coverage to 12 tests. Docker is unavailable locally; the updated Supabase workflow must pass before these new database assertions are considered verified. |
| Supabase remote content | Disabled until E2EE is integrated | The new migration defaults rooms to `e2ee_protocol = 'disabled'`, revokes unused legacy invitations and blocks chat reads/writes, media creation/retrieval, and direct game-session access through server-side policies. Online room invitations no longer contain a room key; legacy v1 links are rejected. Live secure messaging is not available. |
| Room deletion | Implemented; live Storage/scheduler verification pending | Owner-authenticated deletion immediately revokes both members, invitations, push tokens and notifications. A retryable service-role job removes all room Storage objects before cascading room metadata, chat, games, history, media records and credentials. Deterministic retry tests and pgTAP deletion checks are included; production scheduler execution remains unverified. |
| Photo/video/gallery/voice | Local capture and preview implemented; device-unverified | Native plugins compile; capture/gallery/voice show preview before explicit send. Encrypted remote upload code is present, but remote transfer is server-disabled until E2EE is integrated. No physical device or emulator is attached. |
| Disappearing media | Reservation and upload integrity implemented; remote media gated | Expiring media uses a two-minute atomic reservation, stable-token retries, idempotent completion, release on failed download/decryption and server-started expiry. Encrypted uploads are stream-limited, bound to an immutable SHA-256/size per media ID, and safely retryable without overwrite. Remote transfer remains server-disabled until E2EE is integrated. Scheduled storage cleanup still requires live deployment verification. |
| FCM notifications | Deterministic server adapter tested; live dispatch incomplete | Native registration/token refresh/revocation, privacy-safe generic payloads, preference/quiet-hours filtering and bounded retries for transient FCM errors are wired. Five deterministic tests cover categories, quiet hours, privacy, retries and stale-token detection; SQL tests cover token refresh, deletion and unpairing. Game, invitation, turn, trophy and presence event producers are not all wired; real delivery remains Firebase/device-unverified. |
| End-to-end encryption | Incomplete; do not market as E2EE | New invitation payloads omit key material and pending legacy invitations are revoked. RFC 9420 MLS and `ts-mls` are assessed in [the crypto assessment](./CRYPTO_PROTOCOL_ASSESSMENT.md), but the cross-platform TypeScript implementation has no formal security audit and a high-severity pre-1.6.4 removal defect. Authenticated key lifecycle, independent sessions, forward secrecy, replay/revocation tests and secure persistence remain incomplete; remote private content is gated off. |
| Android debug build | Tested | Fresh `npm run android:assemble` passed using JDK 21. APK is at `android/app/build/outputs/apk/debug/app-debug.apk`. Android custom-scheme invite handling is wired but not device-tested. |
| Android release configuration | Tested without release credentials | Unsigned `bundleRelease` task passed. Signing is conditional on the four `AFTERDARK_RELEASE_*` environment variables; the bundle is not ready for distribution until signed and verified with the owner-controlled key. |
| Physical two-phone use | Not tested | ADB found no connected emulator or phone. No live Supabase project credentials are configured. |
| Release signing | Blocked by owner-controlled signing key | No keystore was created. The owner must create and securely back up the production signing key once, then store it outside the repository. |

Use [the Android manual checklist](./ANDROID_MANUAL_VERIFICATION.md) for device
testing. It intentionally records physical-device checks as pending.

## Engineering work still incomplete (not owner-side setup)

- Select and integrate a maintained, reviewed protocol implementation with
  supported React/browser and Capacitor Android APIs; complete the protocol
  key lifecycle and independently test it before enabling sensitive remote
  content. The key-bearing invitation format has been removed.
- Synchronize pair-specific prompt history and game state between devices.
- Complete remote game-session synchronization, reconnection and retry
  handling; per-game mechanics listed above remain in progress.
- Wire invitation, game, turn, trophy and presence events to push dispatch.
- Add authenticated E2E device identity/key agreement and pair-scoped history;
  local content history is not synchronized to the room.
- Add hidden-answer tests as authoritative remote game-session APIs are developed.

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
