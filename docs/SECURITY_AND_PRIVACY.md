# Security and Privacy

## Implemented

- Adults-only confirmation.
- AES-GCM text sealing for locally stored text content.
- A versioned Supabase migration binds room membership to the authenticated anonymous Supabase user and provides server-side room creation, invitation consumption, revocation and two-member enforcement.
- Room-scoped RLS for chat, game sessions, card history and room reads.
- IndexedDB local history and media storage.
- Time-limited encoded invitation payloads.

## Known limitations

- Anonymous Supabase identity persists in browser storage; device-bound key storage, key exchange, rotation and a complete end-to-end key lifecycle are not implemented.
- Supabase membership is only active when the project is configured, migrations are applied and anonymous sign-in is enabled. Live project authorization has not been verified.
- The invitation's embedded room key is not cryptographically authenticated by the server; server one-time validation does not make a copied invite safe to share.
- Screenshots and external camera recording cannot be prevented.
- Media blobs remain local to the sending installation; remote media storage and recipient retrieval are not implemented.
- Timed local media expiry starts on first view and is persisted locally. Server-side deletion, view-once enforcement and attachment access revocation are not implemented.
- Realtime message relaying is not enabled as a verified production feature. Game-state synchronization, authenticated storage and server-side FCM dispatch are not implemented.
- Local AES-GCM sealing does not constitute end-to-end encryption because room-key exchange and protected key storage are incomplete.

## Rules

No service-role key, signing key or private user media may be committed.
