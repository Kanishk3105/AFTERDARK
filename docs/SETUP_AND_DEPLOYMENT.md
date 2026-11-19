# Setup and Deployment

## Web development

```powershell
npm install
npm run dev
npm test
npm run build
```

## Environment variables

Copy `.env.example` when remote mode is configured. Required names:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

The anon key is public and must have RLS-backed authorization. Never add a
service-role key to `VITE_*` variables or frontend source.

## Supabase setup

1. Create a Supabase project.
2. Apply `supabase/schema.sql`.
3. Configure anonymous or device-bound authentication.
4. Enable Realtime for authorized tables.
5. Configure private storage buckets and RLS.
6. Test with two physical devices.

No credentials or live backend connection are currently available in this repository.
