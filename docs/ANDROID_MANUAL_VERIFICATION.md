# Android Manual Verification Checklist

The current environment has no attached emulator or physical Android device.
This checklist is for owner/device testing and is not evidence that these flows
have passed. Install the latest debug build at
`android/app/build/outputs/apk/debug/app-debug.apk` (version 0.1.0).

## Camera and photo

- [ ] Open a paired room's chat and launch Camera > Photo.
- [ ] Confirm Android camera permission prompt and live camera preview.
- [ ] Switch front/rear cameras; confirm the selected camera is used.
- [ ] Capture, inspect preview, retake, delete/close.
- [ ] Confirm photo sends only after explicit user confirmation.
- [ ] Confirm recipient receives and opens/decrypts the photo.
- [ ] Repeat after denying camera permission, granting it in Settings, and
  relaunching the app.

## Video

- [ ] Launch Camera > Video and confirm preview and front/rear camera switching.
- [ ] Record, stop, preview/play, retake, delete, then explicitly send.
- [ ] Confirm recipient can decrypt and play the received clip with audio.
- [ ] Test 15-second challenge preset separately from ordinary chat video.
- [ ] Test low storage, orientation changes, backgrounding, process recreation
  and camera/microphone permission denial.

## Gallery

- [ ] Select a photo and a video from Gallery.
- [ ] Confirm selection opens an in-app preview and is not sent automatically.
- [ ] Retake/reselect, close/delete, then explicitly send.
- [ ] Confirm recipient can open/decrypt/play both formats.
- [ ] Test large files, low storage and interrupted upload; confirm no duplicate
  chat message after retry.

## Voice notes

- [ ] Grant microphone permission at point of use; deny and verify graceful
  fallback.
- [ ] Record, stop, preview/playback, retake/delete, explicitly send.
- [ ] Confirm recipient can decrypt and play the voice message.
- [ ] Confirm recording never starts or sends without a user action.

## Disappearing media

- [ ] Test view-once, 5s, 10s, 30s and keep-until-deleted; timers start at first
  authorized view, not at send.
- [ ] Test recipient offline before first view, app close/restart, reboot,
  interrupted download, network loss and expiry while the app is closed.
- [ ] Attempt a second view of view-once media and access after expiry; verify
  server denial.
- [ ] Verify the scheduled cleanup removes expired/consumed Storage objects and
  metadata, including retry after a transient Storage deletion failure.

## Realtime chat and two-phone gaming

- [ ] Pair two separate phones using a single-use invitation. Attempt a third
  device and verify server rejection.
- [ ] With the app installed, open an `afterdark://join#<invite-token>` link
  while the app is closed and while it is already open; both should route to
  invitation acceptance. Verify malformed and expired links are rejected.
- [ ] Open a hosted `https://<site>/join#<invite-token>` link on a device
  without the app and confirm it reaches the web join page. Never test using a
  sender-local `localhost` URL.
- [ ] Exchange text and encrypted media in both directions. Check ordering,
  delivery, duplicate suppression, reconnect and offline behavior.
- [ ] Test all game state, private answer/reveal, turn, score, pause/resume and
  reconnection flows on two separate phones; Pass & Play is not a substitute.
- [ ] Verify unpairing revokes further room and media access on both devices.

## Notifications

- [ ] Install a Firebase-configured build and grant/deny Android notification
  permission.
- [ ] Verify token registration, token refresh, partner-only delivery, each
  enabled category, quiet hours, disabled preferences and token removal after
  room revocation.
- [ ] Confirm previews contain no private message, answer or media content.
- [ ] Confirm the app does not generate redundant foreground notifications.

## Lifecycle and navigation

- [ ] Check portrait/landscape, keyboard open/close, Android back, app
  background/resume, camera/microphone resource cleanup and offline navigation.

**Verification boundary:** none of the physical-device, two-phone, production
Supabase, cleanup-schedule or real FCM checks above has been performed here.
Record device model, Android version, build hash and observed results when
running them.
