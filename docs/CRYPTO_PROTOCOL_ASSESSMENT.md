# Device-to-device encryption assessment

## Decision

No candidate was selected for integration. None of the reviewed packages
currently provides a maintained, reviewed protocol implementation with a
supported API for both browser React and Capacitor Android. Wiring together
different protocol implementations for web and Android would create an
unreviewed interoperability and key-lifecycle layer, so this pass does not
label the application end-to-end encrypted.

## Candidate review

| Candidate | Evidence | Assessment |
| --- | --- | --- |
| Signal `libsignal` / `@signalapp/libsignal-client` | [Upstream repository](https://github.com/signalapp/libsignal); package declares `AGPL-3.0-only`, Rust/Node bridge, and optional Windows/macOS/Linux Node packages | Official Signal Protocol implementation and active upstream, but the published JS package is a native Node binding, not a supported browser or Capacitor Android library. AGPL distribution obligations also need owner review. Not a cross-platform fit. |
| `@wireapp/proteus` | [npm package](https://www.npmjs.com/package/@wireapp/proteus); latest package metadata reviewed was 9.13.0, `GPL-3.0`, published in March 2022 | TypeScript implementation of the Axolotl/Proteus protocol, but the package release is stale relative to current protocol/library maintenance expectations and GPL-3.0 obligations require distribution review. Not selected. |
| `@privacyresearch/libsignal-protocol-typescript` | [npm package](https://www.npmjs.com/package/@privacyresearch/libsignal-protocol-typescript); latest package metadata reviewed was 0.0.16, `GPL-3.0-only` | Third-party TypeScript port with no evidence in the package metadata of current Signal maintenance or a current independent audit. Not selected. |
| Prose JavaScript SDK | [`@prose-im/prose-sdk-js`](https://www.npmjs.com/package/@prose-im/prose-sdk-js), `MPL-2.0`, WebAssembly distribution | A full messaging SDK rather than a narrowly supported protocol library for this application's Supabase transport and media/key lifecycle. Its package metadata alone does not establish that it meets this application's protocol, platform, and audit requirements. Not selected. |

## Current threat model and actual behavior

Assets are private chat text and media, device identity material, session
secrets, room membership, and invitation credentials. The intended trust
boundary treats Supabase database/storage and FCM as untrusted for plaintext;
the browser/Android client is the plaintext endpoint. Intercepted invitation
links, unauthorized or revoked devices, a stolen device, and a malicious
server/storage operator are in scope. A compromised operating system,
malicious app update, rooted device, or active XSS is not mitigated by
application-layer encryption.

The current implementation does **not** meet that threat model: it uses one
exportable AES-GCM room key, stores a browser copy in local storage, and
includes the raw JWK in the invitation payload. A person or system that
obtains that link can recover the shared key and decrypt captured room data.
There is no authenticated device handshake, forward secrecy, ratchet,
cryptographic replay defense, or independent-device protocol test. AES-GCM
alone does not make the current design E2EE.

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
revocation, recovery, and room deletion. Until these pass against the chosen
library in browser and Android builds, remote private content must not be
described as protected from the service operator.
