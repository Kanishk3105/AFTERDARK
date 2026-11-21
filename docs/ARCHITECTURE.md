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
per device and cryptographic authorization of devices is not implemented.

## Invitations and notifications

Web invites use the current hosted origin. Android invites use the registered
`afterdark://join` scheme and the Capacitor App plugin routes cold/warm links to
the join screen. Device testing is still required.

Push token refresh and revocation are wired to the room membership. The server
dispatch currently has only the chat-message event wired from the UI; game,
turn, trophy and presence event producers are not implemented. Realtime game
state synchronization is also not implemented, and Anywhere mode stays
disabled.
