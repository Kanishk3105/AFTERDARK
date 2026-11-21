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
| Romantic | Memory Lane | Two local private submissions, gated side-by-side reveal and an optional saved memory note are implemented. It currently uses one prompt per session; there is no remote synchronization or component-level test. |
| Romantic | Love Language | Dedicated private ranking of the five love languages, unique-rank validation, simultaneous reveal and rank-match scoring are implemented with a tested engine. Remote synchronization and component-level tests remain absent. |
| Romantic | Couple Challenges | Mutual acceptance, pass-without-penalty, pause/resume and shared completion/results are implemented with a tested engine. It remains local pass-and-play, not remote or server-authoritative. |
| Romantic | Romantic Roulette | Spins eligible cards from the romantic content pack, applies local no-repeat history and persists the current result. Selection uses the tested shared content engine; no synchronized reveal or two-device history exists. |
| Sexual | Truth or Dare | Local reducer covers turns, consent actions, strikes, alternatives and five-step state. Page state is not persisted for restart/reconnect; UI coverage is incomplete. |
| Sexual | Desire Match | Local private yes/maybe/no choices and reveal. No remote privacy, persistence or game UI test. |
| Sexual | Naughty Roulette | Spins eligible cards from the sexual content pack, respecting the session intensity and exclusions and recording local no-repeat history. No synchronized two-device reveal exists. |
| Sexual | Temptations | Four distinct, controlled choices, partner selection, creator approval and penalty-free pass are implemented with tested local state transitions. No remote consent workflow or component-level test exists. |
| Sexual | Desire Quiz | Uses the generic answer/guess UI and content; no unique quiz engine or remote sync. |
| Sexual | Emoji Confessions | Emoji composition plus a private meaning, partner interpretation, and gated reveal are implemented with a tested engine. It is local pass-and-play only. |
| Fantasy | Fantasy Cards | Local private yes/maybe/no selection and reveal. No remote privacy or game UI test. |
| Fantasy | Scenario Builder | Editable scenario fields persist in the local session; the partner can request changes, approve, or pass. State transitions are engine-tested, but the game is not remotely synchronized. |
| Fantasy | The Menu | Independent private rankings, duplicate-rank rejection, simultaneous reveal, match scoring and local session persistence are wired. Remote privacy, reconnect behavior and component tests are not implemented. |
| Fantasy | Challenge Duel | Two local private submissions, reveal only after both submit and paired completion scoring are implemented with a tested engine. Remote answer privacy is not implemented. |
| Fantasy | Choose Your Story | One branching story; current node is saved to the local game session. No two-player turn synchronization or story-flow test. |
| Fantasy | Fantasy Roulette | Spins eligible generated combinations from the fantasy content pack and persists the current result with local no-repeat history. Pair-shared history and cross-device no-repeat remain unimplemented. |

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
| Unit tests | Tested | `npm test`; latest run: 60 tests passed across 9 files. |
| Supabase schema and local configuration | New migrations tested in GitHub Actions | Clean local Supabase migration reset and all 41 pgTAP assertions passed; all 12 deterministic Edge Function tests passed in workflow run [#6](https://github.com/Kanishk3105/AFTERDARK/actions/runs/44903437509). Docker remains unavailable locally; live project deployment is not tested. |
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
