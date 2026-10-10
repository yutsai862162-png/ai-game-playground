# Public preview verification — 2026-10-10

## Current conclusion

The pinned external preview successfully loads the approved hero and passes two short browser checks (Chromium and WebKit mobile emulation). **The current revision is NOT fully accepted: the longer WebKit regression closed its page/context in two runs and remains unresolved.** Do not replace this statement with the older revision's 12/12 result.

Preview game source: `58e5eecf9a6412a6bf81563cf86ff9ffa27ef3b8`.

Preview URL:
https://rawcdn.githack.com/yutsai862162-png/ai-game-playground/58e5eecf9a6412a6bf81563cf86ff9ffa27ef3b8/game/index.html

This is a third-party, commit-pinned preview of existing public repository files, not a change to the official Pages deployment. The provider may first show its own confirmation screen. In both fresh browser contexts, clicking the visible **Open the page** button opened the game. No bypass cookie was inserted and no login or private information was submitted. The provider does not guarantee uptime.

## Reproduced and fixed

At the prior `6393797` revision, all 22 PNG requests completed but the normalized walking renderer fell back to Canvas art. The preview provider returned 301 redirects for images to `raw.githubusercontent.com`. Because the loader did not request CORS permission, `getImageData` raised a tainted-canvas error. Both Chromium and WebKit reproduced it.

A separate diagnostic image with `crossOrigin = 'anonymous'` was readable in both engines, and the image server returned `Access-Control-Allow-Origin: *`.

The production fix is only three added lines in `game/hero-assets.js`: two explanatory comments and `img.crossOrigin = 'anonymous'` **before** assigning `src`. No image pixels, movement constants, input handling, collision, story or storage logic were changed. Normal cross-origin permission is requested; browser security is not disabled.

## External preview checks: 2 passed / 0 failed

Run: `38043546480`, job `114188415094`, success.
https://github.com/yutsai862162-png/ai-game-playground/actions/runs/38043546480

Test/workflow commit: `b0cf73b989d667f6a953d273b81efe791b38343b`.
Artifact: `11666504680`, hero-public-preview-evidence.
Artifact SHA-256: `ab3bf5e98b4e84b9cd1b2a5b27a6b4015bd298752016e5e801ddbae444f3280c`.

These tests navigate the actual external HTTPS URL. They do not replace remote requests with local image bytes or renderer stubs.

Both engines verified:
- HTML HTTP 200; remote renderer SHA-256 identical to the repository file.
- Actual CDN redirects followed; all 22 images loaded, zero failed images.
- `HeroAssets.status()`: `walkingReady: true`, `geometryError: null`, `revision: walk-polish-1`.
- Start button and intro finished with emulated mobile taps.
- The hero moved using real browser keyboard events.
- Backpack opens/closes and manual save writes a progress record.
- No uncaught JavaScript errors.
- Screenshots of confirmation, title, brother dialogue and map are in the artifact.

Scope: Playwright 1.56.1 on a Linux runner, iPhone 13 device profile and 844x390 viewport. This is not physical iPhone Safari, subjective touch feel, audio or FPS acceptance. This remote check does not play the entire chapter.

## Full regression: NOT all green

Run: `38043510736`, source `58e5eecf9a6412a6bf81563cf86ff9ffa27ef3b8`.
https://github.com/yutsai862162-png/ai-game-playground/actions/runs/38043510736

Initial job `114188308643`: 7 of the 8 original integration cases passed; `webkit-full-game` failed with `Target page, context or browser has been closed` while progressing through the chapter. Artifact `11666940490` preserves this attempt.

One rerun, same source and test code, job `114189452415`: again 7/8 passed; the full WebKit case closed its page/context earlier in the route. Artifact `11667051413` preserves the rerun. No test assertions were weakened and no gameplay functions were bypassed to manufacture a pass.

Chromium's complete chapter, NPCs, shoe side quest, shopping, save/reload and ending passed in both attempts. Slow-loading, all-images-missing fallback, and blocked-storage cases passed in both engines. The exact cause of the long-run WebKit closure has not been established; do not claim it is definitely either a game bug or runner-only failure.

Because the first test command exited unsuccessfully, the four geometry cases in the following command were **not executed on this revision**. Their earlier success remains evidence for the previous revision only.

## Unchanged and pending

- The approved `game/game.js` comparison passed with identical bytes.
- All 22 PNG originals are unchanged; no re-upload is needed.
- `game/story.js`, `game/style.css` and root `index.html` are unchanged in this round.
- `main` was reread and remains `1e0757ad75fb77ab8dbaa67d7c9edd5ce2762454`.
- No merge, Pages source change, repository visibility change or official deployment occurred.
- Native left-facing shoe-sole repair, neutral idle art, family character replacement and physical iPhone acceptance remain pending.
- Next technical task: capture page-crash/browser-disconnect and process diagnostics for the long WebKit run; compare the same route against the previous revision before attributing the cause. Retain current fallback and approved controls.
