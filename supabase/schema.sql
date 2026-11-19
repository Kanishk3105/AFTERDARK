create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'waiting',
  revocation_version integer not null default 1,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.room_members (
  room_id uuid references public.rooms(id) on delete cascade,
  device_id text not null,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (room_id, device_id)
);

create table if not exists public.pairing_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  code text unique not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  game_id text not null,
  mood_id text not null,
  state jsonb not null default '{}'::jsonb,
  status text not null default 'in-progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key,
  room_id uuid references public.rooms(id) on delete cascade,
  room_code text not null,
  sender_device_id text not null,
  sealed_content text,
  media_id uuid,
  media_expiry text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.card_history (
  room_id uuid references public.rooms(id) on delete cascade,
  card_id text not null,
  fingerprint text not null,
  game_id text not null,
  seen_at timestamptz not null default now(),
  primary key (room_id, card_id)
);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.pairing_invitations enable row level security;
alter table public.game_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.card_history enable row level security;
