# Architecture

## Frontend

- React 19 and React Router.
- TypeScript strict compilation.
- Zustand persisted stores.
- Framer Motion UI transitions.
- Tailwind design tokens.

## Local data

- Dexie IndexedDB stores messages, media blobs and prompt history.
- Local room, preferences and game state use Zustand persistence.

## Synchronization

- `BroadcastChannel` provides same-origin, same-browser tab synchronization.
- It does not provide separate-phone internet synchronization.
- Supabase remains the documented remote integration boundary.

## Encryption

Web Crypto AES-GCM encrypts text with a locally stored room JWK. This is not
yet a complete device-to-device cryptographic protocol. The key is not managed
per device and server-side authorization is not implemented.
