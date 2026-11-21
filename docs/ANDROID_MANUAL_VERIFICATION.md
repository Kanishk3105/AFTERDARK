# Android Manual Verification Checklist

The current environment has no attached emulator or physical Android device.
This checklist is for owner/device testing; it is not evidence that these flows
have passed. Install the debug build at
`android/app/build/outputs/apk/debug/app-debug.apk` (version 0.1.0).

## Photo

- [ ] Open a paired room's chat and launch Camera > Photo.
- [ ] Confirm Android camera permission prompt and live camera preview.
- [ ] Switch front/rear cameras; confirm the selected camera is used.
- [ ] Capture, inspect preview, retake, and delete.
- [ ] Confirm sending only happens after explicit confirmation.
- [ ] Confirm recipient receives and opens the photo.
- [ ] Repeat after denying camera permission, granting it in Settings, and
  relaunching the app.

## Video

- [ ] Launch Camera > Video and confirm preview and front/rear camera switching.
- [ ] Record, stop, play back, retake, delete, then explicitly send.
- [ ] Confirm recipient can play the received clip with audio.
- [ ] Test maximum duration, low storage, orientation changes, backgrounding,
  process recreation and camera permission denial.

## Gallery and voice

- [ ] Select a photo and a video from Gallery; inspect before sending and verify
  recipient playback.
- [ ] Record voice, stop, preview, retake/delete, send and verify recipient
  playback.
- [ ] Verify microphone denial and grant/retry behavior.
- [ ] **Known current gap:** native voice currently sends immediately on stop;
  preview/retake/delete is not implemented. Remote media blobs are not uploaded,
  so recipient delivery is not currently supported over Supabase.

## Lifecycle, expiry and connectivity

- [ ] Check 5s, 10s and 30s media expiry from first view, including app close,
  restart, device reboot, recipient offline and interrupted download.
- [ ] Check view-once after reopening the chat and from a second device.
- [ ] Check keep-until-deleted, manual deletion, local storage cleanup and
  expired attachment access.
- [ ] Repeat during network loss/recovery and confirm no duplicate message or
  media appears.
- [ ] Check portrait/landscape, keyboard open/close, Android back, app
  background/resume, native resource cleanup and offline navigation.

**Known verification boundary:** only local timed expiry is implemented.
Server-side attachment authorization/deletion and true view-once enforcement
are absent, so those expiry acceptance checks are currently expected to fail.
Do not treat plugin compilation as camera/video/voice verification.
