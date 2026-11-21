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
2. Enable anonymous sign-in in Supabase Auth.
3. Apply the versioned migrations with `supabase db push`; do not use the legacy `supabase/schema.sql` snapshot as a deployment migration.
4. Enable Realtime for `chat_messages`.
5. Add the public project URL and anon key to the app's local `.env` file.
6. Run `.\scripts\verify-supabase.ps1` against local Supabase before deployment.
7. Configure private storage policies before enabling remote media; remote media upload and retrieval are not implemented yet.

Anonymous Supabase auth provides the server identity used by the room membership RPCs. The local app's generated device ID is not an authorization credential. Credentials for a production project are intentionally not included.

## Android debug build

The Android project requires JDK 21 and an installed Android SDK.

```powershell
npm run android:sync
$env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
cd android
.\gradlew.bat assembleDebug
```

The generated APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

## Release signing

No signing key is stored in this repository. Before a release build, the owner must create and back up a long-lived Android upload/signing key, then configure it through local Gradle properties or a CI secret store. Do not generate a temporary key for production releases.
