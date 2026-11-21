# Device-to-device encryption assessment

## Decision

No implementation was selected for production integration. RFC 9420 MLS is a
standardized, publicly reviewed protocol, and `ts-mls` demonstrates that a
pure-TypeScript browser/Capacitor-WebView implementation is technically
possible. However, the library explicitly has no formal security audit and its
security history includes a high-severity removal/forward-secrecy defect fixed
in 1.6.4. The protocol is a viable candidate, but the library is not yet a
reviewed implementation suitable for enabling private remote content. This
build now fails closed for remote chat, media and game-state access instead of
using the legacy shared room key.

## Candidate review

| Candidate | Evidence | Assessment |
| --- | --- | --- |
| Signal `libsignal` / `@signalapp/libsignal-client` | [Upstream repository](https://github.com/signalapp/libsignal); package declares `AGPL-3.0-only`, Rust/Node bridge, and optional Windows/macOS/Linux Node packages | Official Signal Protocol implementation and active upstream, but the published JS package is a native Node binding, not a supported browser or Capacitor Android library. AGPL distribution obligations also need owner review. Not a cross-platform fit. |
| `@wireapp/proteus` | [npm package](https://www.npmjs.com/package/@wireapp/proteus); latest package metadata reviewed was 9.13.0, `GPL-3.0`, published in March 2022 | TypeScript implementation of the Axolotl/Proteus protocol, but the package release is stale relative to current protocol/library maintenance expectations and GPL-3.0 obligations require distribution review. Not selected. |
| `@privacyresearch/libsignal-protocol-typescript` | [npm package](https://www.npmjs.com/package/@privacyresearch/libsignal-protocol-typescript); latest package metadata reviewed was 0.0.16, `GPL-3.0-only` | Third-party TypeScript port with no evidence in the package metadata of current Signal maintenance or a current independent audit. Not selected. |
| Prose JavaScript SDK | [`@prose-im/prose-sdk-js`](https://www.npmjs.com/package/@prose-im/prose-sdk-js), `MPL-2.0`, WebAssembly distribution | A full messaging SDK rather than a narrowly supported protocol library for this application's Supabase transport and media/key lifecycle. Its package metadata alone does not establish that it meets this application's protocol, platform, and audit requirements. Not selected. |
| MLS / `ts-mls` | [IETF RFC 9420](https://www.rfc-editor.org/rfc/rfc9420) is an Internet Standards Track protocol with forward secrecy and post-compromise security. [`ts-mls`](https://github.com/LukaJCB/ts-mls) 1.6.4 is MIT-licensed, actively maintained, pure TypeScript, and documents browser support. | Best technical cross-platform fit found. It is maintained by one volunteer and explicitly says it has not undergone a formal security audit. [GHSA-gwp3-968w-m7gv](https://github.com/LukaJCB/ts-mls/security/advisories/GHSA-gwp3-968w-m7gv) documents a high-severity single-member removal defect affecting versions before 1.6.4, where a removed member could decrypt later epochs. The fixed version has no evidence of an independent implementation audit. Not enabled for production. |

## Current threat model and actual behavior

Assets are private chat text and media, device identity material, session
secrets, room membership, and invitation credentials. The intended trust
boundary treats Supabase database/storage and FCM as untrusted for plaintext;
the browser/Android client is the plaintext endpoint. Intercepted invitation
links, unauthorized or revoked devices, a stolen device, and a malicious
server/storage operator are in scope. A compromised operating system,
malicious app update, rooted device, or active XSS is not mitigated by
application-layer encryption.

The current implementation does **not** meet that threat model: local
compatibility code still uses one exportable AES-GCM room key and stores its
browser copy in local storage. Previous v1 invitation links carried that key;
the application now rejects v1 links and the migration revokes unused server
invitations, while all remote private-content access is disabled. Local
AES-GCM does not provide authenticated device pairing, forward secrecy, a
ratchet, cryptographic replay defense, or E2EE. Existing consumed links cannot
be reused for pairing, but recipients who previously obtained an old key must
be considered to retain it.

## Acceptance conditions before enabling E2EE

Adopt one supported, reviewed protocol implementation with explicit web and
Android support and an approved license. Pair devices through a short-lived,
single-use authenticated flow that displays a verifiable device fingerprint;
never put private or session keys in URLs, QR payloads, logs, or notifications.
Persist private identity/session material using non-exportable browser
cryptographic storage where available and Android Keystore-backed storage.
Use separate protocol sessions per device, protocol-provided replay handling
and forward secrecy, and a separately derived attachment key with an
authenticated unique nonce. Revocation must invalidate the device and rotate
the applicable group/session epoch. Recovery must be explicit and must not
silently restore revoked device access.

Required integration tests include independent identities, authenticated
pairing, equal session establishment, authorized and unauthorized
message/media decryption, tampering, replay, nonce uniqueness, key rotation,
revocation, recovery, and room deletion. These must run against the selected
implementation in browser and Android builds, followed by independent
implementation review. A passing integration suite alone does not constitute
a cryptographic audit.
