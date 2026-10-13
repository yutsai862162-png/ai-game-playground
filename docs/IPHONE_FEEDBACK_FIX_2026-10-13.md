# iPhone feedback follow-up

User feedback: direction controls felt sticky/jumpy; family art appeared unchanged.

## Reproduced and changed

- Holding the pad while another finger touched the map queued an auto-walk path. Releasing the pad could therefore start unexpected movement. Pad ownership now excludes competing map touches and clears existing paths, including a neutral pad grab.
- Tiny movements across the original entry dead zone repeatedly stopped/restarted input. Entry threshold and axis hysteresis are unchanged; active movement now releases at 60% of that threshold. Returning to the center stops movement.
- Reset, dialogue, lost capture, and viewport changes end the owned gesture. An old finger cannot resume movement after reset.
- The pad remains invisible. Brother art, shoe story, movement speed, turn time, and touch-zone geometry are unchanged.

## Family loading

On the previous public commit `6f81a9d765b14cac796df01d8a6378566df107be`, Windows WebKit repeatedly had four family images still loading after the readiness timeout, while all 22 brother images were ready. Network inspection saw redirects followed by HTTP 200 PNG responses with permissive CORS. Local serving of the same original assets loaded successfully. An eventual public map screenshot did show the new mother and sister, so this is not proof that the integration was absent or that every iPhone encounters the same failure.

Original 1024×1536 source PNGs remain untouched and hash-verified. Deterministic 512×768 display copies reduce the four downloads from 7,447,262 to 1,674,643 bytes (about 78%). Runtime bounds are scaled by one half; on-map height and foot placement are unchanged. The map and gallery reuse the same image objects instead of requesting another four images. No paid generation or redesign was used.

Mother and sister use the new standing art on the map. Dad remains seated Canvas art on the map; his new standing art is in the gallery. The future sister-in-law is gallery-only. New walking animation and iPhone acceptance are still outstanding.

## Local verification

- `node tests/touch-drag.cjs`: Chromium and WebKit passed. Covers ownership, center/release jitter, deliberate turns, reset, cross-zone cancellation, and dialogue transitions. Chromium additionally uses real CDP multitouch for map interference and held-pad plus A. WebKit event fixtures are not real iPhone multitouch.
- Protected contracts and ten mutation self-tests passed; family unit tests, JavaScript syntax, actionlint, and whitespace checks passed.
- Family browser: 5/6 passed, including actual mother/sister map draws, missing/slow loading and foot geometry. The remaining WebKit landscape-to-portrait layout failure also occurs on a minimal page without game JavaScript; it remains a failing test.
- Mobile layout: 6/6; geometry: 4/4. Full regression initially 7/8: Chromium had already reached chapter-clear when a final dialogue tap lost its target. The test now accepts that absent target only when the confirmed chapter-clear state is reached; the Chromium full-route rerun passed. WebKit full-route passed in the preceding run.
- Desktop frame sampling showed approximately 60 fps; this is not an iPhone performance measurement.

## Public verification procedure

Run `node tests/family-public-preview.cjs` after pushing the exact candidate commit. It verifies remote code and display-image bytes against that commit, waits for family and brother readiness in Chromium and WebKit, observes actual mother/sister canvas draws, checks invisible controls, and saves map/gallery screenshots. Do not infer public success from a local gallery or HTTP status alone.

CI keeps the WebKit rotation and native crash failures visible. No merge or formal deployment is authorized.
