# Test and Acceptance Plan

## Automated unit tests

- Pairing codes, invitation expiry and malformed tokens.
- Truth or Dare transitions, strikes, swaps and five-step progression.
- Card fingerprints, duplicate removal, intensity and excluded themes.
- Trophy progress and unlock uniqueness.
- Encryption wrappers where Web Crypto is available.
- Media expiry calculations and settings persistence.

## Integration tests

- Room creation and join.
- Two-member authorization.
- Cross-room message isolation.
- Realtime game turn delivery.
- Media metadata and expiry.
- Room deletion and revocation.

## End-to-end journeys

1. New user creates a room and joins through the invitation.
2. Six Questions alternates roles and reveals results.
3. Truth or Dare progresses through all twist levels.
4. Five-Step Terminal pauses, resumes and completes step by step.
5. Chat sends a photo, video and voice note.
6. Disappearing media expires on the recipient.
7. Internet disconnect and reconnection preserve game state.
8. A third device is rejected.
9. Card history survives restart.
10. Unpair deletes applicable room access.

## Release gate

A feature is COMPLETE only after UI, state, persistence, error handling,
security, automated tests and build verification are present.
