# Setup and Deployment

## Local web development

```powershell
npm install
npm run dev
npm test
npm run build
npm run content:audit
```

`.env.example` contains only the public frontend Supabase URL and anon key.
Never put a service-role key in a `VITE_*` variable.

## Local Supabase and Edge Functions

Docker Desktop is required. From the repository root:

```powershell
npx supabase start
npx supabase db reset --local
npx supabase test db --local
npx -y deno test --frozen --lock .\deno.lock `
  .\supabase\functions\_shared\media-cleanup.test.ts `
  .\supabase\functions\_shared\media-upload.test.ts `
  .\supabase\functions\_shared\room-deletion.test.ts `
  .\supabase\functions\_shared\push.test.ts
npx -y deno check --frozen .\supabase\functions\media-view\index.ts `
  .\supabase\functions\media-upload\index.ts `
  .\supabase\functions\room-delete\index.ts `
  .\supabase\functions\push-notification\index.ts
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

The cleanup and notification tests use deterministic adapters and do not need
FCM credentials. Docker-backed SQL/pgTAP and local Storage API integration
require Docker Desktop. The `.github/workflows/supabase-tests.yml` workflow runs
migrations, pgTAP and the Deno adapter tests on GitHub Actions runners.

Remote room content is intentionally disabled by default. The migration
revokes unused legacy invitations and prevents chat, media and direct game
session access until a reviewed E2EE implementation is deployed. Room invitation
links contain only an expiring single-use bearer token and public room code;
they never include encryption keys.

Room deletion revokes room members, invitations, push tokens and notifications
immediately, then queues storage cleanup before cascading room metadata. The
worker waits five minutes before its first storage sweep so an already-started
upload can settle; it leaves failures in a retryable queue. Deploy the
`room-delete` function and schedule the retry worker.

Timed and view-once media uses a two-minute server reservation. The client
reuses its claim token after a failed/interrupted attempt, completes the
reservation only after download and decryption, and releases it after a failed
download/decryption when online. Only one stream can hold a reservation at a
time; if release cannot reach the server, the lease expires after two minutes.
Completion is idempotent for the same token; view-once metadata and storage are
removed by the scheduled cleanup job.

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
   npx supabase functions deploy room-delete
   npx supabase functions deploy push-notification
   ```

   If using the local env file to set secrets, protect it and run:

   ```powershell
   npx supabase secrets set --env-file .\supabase\functions\.env.deploy
   ```

5. Enable `pg_cron`, `pg_net` and Vault in the project. Store the project URL
   and `MEDIA_CLEANUP_SECRET` in Vault; schedule media cleanup as shown below.
   Store the service-role key in Vault as `afterdark_service_role_key` for the
   deletion retry schedule. Do not commit any of these values.

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

   Schedule failed/interrupted room deletion retries every five minutes:

   ```sql
   select cron.schedule(
     'afterdark-room-deletion-retry',
     '*/5 * * * *',
     $job$
       select net.http_post(
         url := (select decrypted_secret from vault.decrypted_secrets where name = 'afterdark_project_url')
                || '/functions/v1/room-delete',
         headers := jsonb_build_object(
           'content-type', 'application/json',
           'authorization',
           'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'afterdark_service_role_key')
         ),
         body := '{"action":"process"}'::jsonb
       );
     $job$
   );
   ```

6. Enable Realtime for `chat_messages` in project settings and run
   `npx supabase test db` in CI or a local Supabase instance. Validate
   room-pairing, media viewing/expiry, cleanup retries and push delivery on the
   actual project. Remote private content remains disabled until its approved
   E2EE protocol is integrated; configuring Supabase alone does not enable it.

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

No signing key is stored in this repository. Release signing is enabled only
when all four environment variables are present:

- `AFTERDARK_RELEASE_STORE_FILE`
- `AFTERDARK_RELEASE_STORE_PASSWORD`
- `AFTERDARK_RELEASE_KEY_ALIAS`
- `AFTERDARK_RELEASE_KEY_PASSWORD`

Create an upload keystore outside the repository. `keytool` prompts for
passwords rather than placing them in shell history:

```powershell
keytool -genkeypair -v `
  -keystore C:\secure\afterdark-upload.jks `
  -alias afterdark-upload `
  -keyalg RSA -keysize 4096 -validity 10000
keytool -list -v -keystore C:\secure\afterdark-upload.jks -alias afterdark-upload
```

Keep at least two secure backups of the keystore and retain the credentials in
a password manager. Losing the signing key can prevent updates to an already
distributed Android application.

Set them in a protected CI secret store or a short-lived local PowerShell
session, then build from `android`:

```powershell
$env:AFTERDARK_RELEASE_STORE_FILE = 'C:\secure\afterdark-release.jks'
$env:AFTERDARK_RELEASE_STORE_PASSWORD = '<from-your-secret-store>'
$env:AFTERDARK_RELEASE_KEY_ALIAS = '<alias-from-your-keystore>'
$env:AFTERDARK_RELEASE_KEY_PASSWORD = '<from-your-secret-store>'
.\gradlew.bat bundleRelease
```

The Gradle build rejects a partial set of signing variables. Never commit the
keystore or passwords. Update `versionCode` and `versionName` in
`android/app/build.gradle` for each release. The current values are `1` and
`0.1.0`. Review [the release checklist](./RELEASE_CHECKLIST.md) before
distribution.
