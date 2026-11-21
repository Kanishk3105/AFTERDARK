# Security and Privacy

## Implemented code

- On Android, the room-key JWK is stored through
  `@aparajita/capacitor-secure-storage`, which encrypts data using an
  Android-Keystore-generated AES-GCM key. Existing localStorage room keys are
  migrated to secure storage on first native read.
- Text is AES-GCM sealed before local persistence and before chat relay.
- Photo, video and voice bytes are AES-GCM sealed before local persistence or
  upload. The encrypted container has a version marker, a random 96-bit nonce
  and the authenticated ciphertext/tag. Authentication failure rejects reads.
- The app fails closed for text encryption errors; it does not persist the
  plaintext as a success-shaped fallback.
- Private remote media uses a non-public Storage bucket. Upload goes through
  an authenticated Edge Function; retrieval calls a server authorization RPC.
  The service-role key remains server-side.
- `claim_media_view` uses a row lock, checks room membership and expiry, starts
  timed expiry on first view, and consumes view-once records atomically.
- A cleanup Edge Function retries deletion of expired/consumed Storage objects
  and metadata. It must be scheduled by deployment configuration.
- Room revocation archives the room, revokes active membership/invitations,
  increments the revocation version and deletes registered push tokens.
- Push messages contain generic text only; notification preferences and quiet
  hours are evaluated server-side.

## Important cryptographic boundary

**AFTERDARK is not currently safe to describe as complete end-to-end
encrypted.** The app still uses one AES-GCM room key, exported into the
invitation link and imported by the joining device. This is not an authenticated
device-to-device handshake or an established ratcheting protocol. It does not
provide forward secrecy, cryptographic replay protection, authenticated device
identity, or safe per-device revocation/key rotation. A copied invitation
contains the room key until it expires. Do not send sensitive content over
remote chat until this is replaced by a reviewed protocol.

The Android key-storage plugin protects the local key at rest; it does not fix
the invitation key exchange. Browser fallback storage is localStorage and is
not protected by a device keystore. Key recovery and multi-device rotation are
not implemented.

The cryptographic tests cover AES-GCM round-trip, authenticated tamper
rejection, random nonce collision sampling, media bytes and behavior after
local key rotation/import. They do **not** prove two independently
authenticated Signal/MLS devices, replay resistance, or end-to-end key
agreement.

## Media lifecycle limitations

- The server consumes a view-once authorization before streaming. If delivery
  is interrupted after the claim, the recipient may not be able to retry.
- The cleanup Edge Function requires a scheduled invocation. Deployment steps
  are in `SETUP_AND_DEPLOYMENT.md`; until configured, expired objects remain in
  private storage even though access is denied.
- Screenshots and external-camera recording cannot be prevented.
- Local timed expiry is a best-effort cleanup in addition to server authority;
  it is not a screenshot-protection guarantee.

## Security rules

Never commit service-role keys, Firebase service-account JSON, cleanup secrets,
Android signing keys, or private user media. Keep remote media encrypted before
upload. Never expose a Storage public URL for private room media.
