# Database Schema

## Local IndexedDB

| Table | Keys | Purpose |
|---|---|---|
| `messages` | `id`, `roomId`, `createdAt` | Chat persistence |
| `media` | `id`, `createdAt` | Local media blobs |
| `history` | `id`, `gameId`, `seenAt` | Prompt encounter history |

## Planned Supabase entities

- `rooms`
- `room_members`
- `device_keys`
- `pairing_invitations`
- `game_sessions`
- `game_turns`
- `game_cards`
- `card_history`
- `content_packs`
- `chat_messages`
- `media_records`
- `trophies`
- `user_trophies`
- `preferences`
- `notification_settings`
- `game_results`
- `scenario_progress`
- `custom_challenges`
- `device_notifications`
