# AFTERDARK visual asset integration

## Integration summary

The supplied `public/assets/afterdark/` pack contains 85 individual files: 82 SVG illustrations and 3 WebP photographs. A typed registry in `src/assets/afterdark.ts` maps the exact 21 game IDs, four mood IDs, 14 trophy IDs, six onboarding steps, six story scenes, four intensity levels, chat stickers/media art, and UI decorations. The registry test verifies all 85 paths exist and that game and trophy IDs match application configuration.

Artwork is integrated into the existing splash, onboarding, home, catalogue, mood landing, game detail, gameplay, chat, trophy, loading, and empty-state screens. Text, controls, private answers, consent, expiry selection, and camera previews remain real application UI. Camera decoration is placed behind the live preview; it does not replace it. The `SEXUAL` mood name and the separate-device play security gate are unchanged.

### Verification

- All 85 manifest asset URLs returned HTTP 200 from local Vite; the browser reported zero broken images on the 21-game catalogue.
- `npm test`: 63 tests passed across 10 files.
- `npm run build`: TypeScript check and production build passed. Vite reports its existing large-chunk advisory.
- `npm run android:assemble`: debug APK build passed.
- Screenshots: `docs/screenshots/splash-mobile.png`, `home-mobile.png`, `home-tablet.png`, `home-desktop.png`, and `games-mobile.png`. Home screenshots use generic display names and a placeholder room label; no local room names or codes are included.
- `npm run content:audit` remains reproducible; current baseline is 11,075 valid unique experiences. Near-duplicate detection remains the reported normalized-token-set Jaccard heuristic, not semantic AI detection.
- Browser console had no errors; the existing Apple mobile-web-app meta deprecation warning remains. Physical Android device rendering and camera behavior are not inferred from web screenshots or an APK build.

## Photography inventory and remaining needs

Only these three supplied assets are photographs:

1. `brand/splash-room-background.webp`
2. `moods/platonic-hero.webp`
3. `moods/sexual-hero.webp`

The romantic and fantasy mood heroes, all 21 game covers, all six fantasy environments, the chat background, trophies, onboarding art, intensity art, stickers, and UI decorations are SVG illustrations. They are integrated as illustrations and are not represented as photographs.

### Prioritized photographic opportunities

1. **Home hero:** a warm, intimate, non-explicit couples lifestyle photograph. The current romantic SVG is already appropriate; photography would be an optional enhancement, not a blocker.
2. **ROMANTIC and FANTASY mood heroes:** the current rose/affection and cinematic story illustrations are sufficient. Optional photographic variants could add real-world warmth and environment depth.
3. **Game detail pages:** all 21 distinct SVG covers are in use. If a photo pass is commissioned, prioritize *Truth or Dare*, *Love Quiz*, *Memory Lane*, and the three roulette experiences; retain their distinct game identities and real live titles.
4. **Fantasy story environments:** the six supplied scene illustrations cover the existing story nodes and scenario surface. Optional location photography could enrich the hotel, lounge, villa, rooftop, hallway, and masquerade settings.
5. **Chat background:** the current decorative SVG is intentionally subtle and private-content-safe. Any photographic alternative should be low-contrast, non-identifying, and contain no message text or personal data.

The splash already has a supplied room photograph. Platonic and SEXUAL already have photographic mood heroes. Photos are not needed for trophy badges, stickers, onboarding instructions, intensity selectors, or other small UI decorations; the current illustrations are a better fit for those roles. No explicit imagery is requested or required.
