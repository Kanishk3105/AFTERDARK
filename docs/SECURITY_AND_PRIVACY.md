# Security and Privacy

## Implemented

- Adults-only confirmation.
- AES-GCM text sealing.
- Room-scoped in-app message filtering.
- IndexedDB local history and media storage.
- Time-limited encoded invitation payloads.

## Known limitations

- Device key exchange and rekeying are incomplete.
- Room membership is not authorized by a backend.
- A third phone may open a copied link until server-side one-time validation exists.
- Screenshots and external camera recording cannot be prevented.
- Media and text do not have a complete server-side deletion lifecycle.
- Supabase Realtime and authenticated storage require credentials and deployment.

## Rules

No service-role key, signing key or private user media may be committed.
