# Setup and Deployment

## Local web development

```powershell
npm install
npm run dev
npm test
npm run build
node .\scripts\report-content-catalogue.mjs
```

`.env.example` contains only the public frontend Supabase URL and anon key.
Never put a service-role key in a `VITE_*` variable.

## Local Supabase and Edge Functions

Docker Desktop is required. From the repository root:

```powershell
npx supabase start
npx supabase db reset --local
npx supabase test db --local
Copy-Item .\supabase\functions\.env.example .\supabase\functions\.env.local
# Fill local-only values in supabase/functions/.env.local.
npx supabase functions serve --env-file .\supabase\functions\.env.local
```

Set local Edge Function values in the ignored `.env.local` file:

```text
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<local anon key printed by supabase status>
SUPABASE_SERVICE_ROLE_KEY=<local service role key printed by supabase status>
MEDIA_CLEANUP_SECRET=<random local secret>
FCM_SERVICE_ACCOUNT_JSON=<one-line Firebase service-account JSON; optional locally>
```

The environment in this development session did not have Docker Desktop
running, so local migrations/pgTAP and Edge Function execution were not
validated here.

## Hosted Supabase activation

1. Create a Supabase project and enable anonymous sign-in.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in local `.env.local`
   for the frontend. The anon key is public; do not use a service-role key.
3. Authenticate and link the project:

   ```powershell
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

4. Configure server-only secrets in the Supabase dashboard or a local,
   untracked `supabase/functions/.env.deploy`:

   ```text
   FCM_SERVICE_ACCOUNT_JSON=<Firebase service account JSON>
   MEDIA_CLEANUP_SECRET=<long random secret>
   ```

   Deploy functions:

   ```powershell
   npx supabase functions deploy media-upload
   npx supabase functions deploy media-view
   npx supabase functions deploy media-cleanup
   npx supabase functions deploy push-notification
   ```

   If using the local env file to set secrets, protect it and run:

   ```powershell
   npx supabase secrets set --env-file .\supabase\functions\.env.deploy
   ```

5. Enable `pg_cron`, `pg_net` and Vault in the project. Store the project URL
   and `MEDIA_CLEANUP_SECRET` in Vault; schedule the following once, replacing
   neither values with committed credentials:

   ```sql
   select cron.schedule(
     'afterdark-media-cleanup',
     '* * * * *',
     $job$
       select net.http_post(
         url := (select decrypted_secret from vault.decrypted_secrets where name = 'afterdark_project_url')
                || '/functions/v1/media-cleanup',
         headers := jsonb_build_object(
           'content-type', 'application/json',
           'x-cleanup-secret',
           (select decrypted_secret from vault.decrypted_secrets where name = 'afterdark_media_cleanup_secret')
         ),
         body := '{}'::jsonb
       );
     $job$
   );
   ```

6. Enable Realtime for `chat_messages` in project settings and run
   `npx supabase test db` in CI or a local Supabase instance. Validate
   room-pairing, media viewing/expiry, cleanup retries and push delivery on the
   actual project before enabling remote play.

The cleanup schedule, Auth providers, Realtime publication and server secrets
are external project configuration; they are not inferred from a successful
frontend build.

## FCM configuration

Set the Android application package to match the Firebase Android app and place
the owner-provided `google-services.json` at `android/app/google-services.json`.
Do not commit this file unless repository policy explicitly permits it; this
project ignores generated/private credentials. Add Firebase service-account
JSON as the Edge Function secret `FCM_SERVICE_ACCOUNT_JSON`. The function
verifies authenticated room membership and sends generic notification copy,
not message contents.

## Android debug build

The Android project requires JDK 21 and an installed Android SDK.

```powershell
npm run android:assemble
```

The generated APK is `android/app/build/outputs/apk/debug/app-debug.apk`.
No physical device or emulator was attached during this pass.

## Release signing

No signing key is stored in this repository. The owner must create and securely
back up the production signing key, then configure it through local Gradle
properties or a CI secret store. Never commit it or use a temporary debug key
for public release.
