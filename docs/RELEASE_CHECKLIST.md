# Release Checklist

- [x] Android project created and debug-buildable; APK build is verified locally.
- [ ] Confirm only the required Android permissions are present:
  `INTERNET`, `CAMERA`, `RECORD_AUDIO`, `VIBRATE`, and
  `POST_NOTIFICATIONS`; verify runtime prompts and denial paths on device.
- [ ] Verify custom-scheme invite links on cold and warm app starts and test
  hosted web links on a device without the app.
- [ ] Two physical devices pass pairing and reconnect tests.
- [ ] Run Supabase pgTAP checks for cross-room RLS, pairing limits, media expiry
  and revocation on a local Docker stack and the configured project.
- [ ] Invitation expiry and revocation tested.
- [ ] Media expiry and scheduled storage/metadata cleanup tested with the app
  closed, recipient offline, retry, and transient deletion failures.
- [ ] Realtime chat and game-state synchronization verified on two devices.
- [ ] Notification token lifecycle, category preferences, quiet hours and
  privacy-safe previews verified with Firebase.
- [ ] Complete reviewed E2E key establishment, replay protection, rotation and
  revocation before advertising E2EE or enabling sensitive remote chat.
- [ ] Screenshot disclaimer is accurate.
- [ ] Adults-only content, privacy policy, terms, age gate, data deletion and
  store/distribution requirements reviewed for the selected channel.
- [ ] Signing keys remain outside Git.
- [ ] Production secrets are not in frontend bundles.
- [ ] Update `versionCode`/`versionName` in `android/app/build.gradle`.
- [ ] Configure `AFTERDARK_RELEASE_STORE_FILE`,
  `AFTERDARK_RELEASE_STORE_PASSWORD`, `AFTERDARK_RELEASE_KEY_ALIAS`, and
  `AFTERDARK_RELEASE_KEY_PASSWORD` through a protected local environment or CI
  secret store; never commit them.
- [ ] Build and verify the signed release bundle with `.\gradlew.bat bundleRelease`.
