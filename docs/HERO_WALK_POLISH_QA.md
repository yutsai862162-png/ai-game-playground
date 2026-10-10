# Hero directional walk polish — verification record

Date: 2026-10-10

## Scope and result

Continued the existing `gpt/hero-art-integration` branch from `ab8260e8c1e756033f742ba69060ad61305870b3`. No new character design, no quest rewrite, no change to approved controls, and no merge or deployment to main.

Tested source: `72b5c6e8c27aea9049ad52884d788c22024d65e5`.
GitHub Actions run: `38025281997`, job `114134762092`, conclusion `success`.
https://github.com/yutsai862162-png/ai-game-playground/actions/runs/38025281997
Evidence artifact: `11659063365`, `hero-integration-evidence`.
Artifact SHA-256: `34bc5b6ec1103bcae12a75f472d94553dc599318796e612433649c2ed11b3406`.

**12 browser cases passed, 0 failed:** the original 8 full-game/fallback cases plus 4 new rendering/partial-asset cases. These are Chromium and WebKit mobile-emulation tests, not physical iPhone acceptance.

## Findings

All walking files have 96x160 canvases, but their nontransparent character heights differ. Measured alpha > 32:

| Direction | Four source heights (pixels) | Previous median displayed height (logical pixels) |
| --- | --- | --- |
| down | 148,145,148,146 | 48.69 |
| up | 138,139,139,139 | 46.04 |
| left | 121,121,119,120 | 39.92 |
| right | 138,138,136,134 | 45.38 |

Equal canvas size did not mean equal visible character size. The left source also still has clipped shoe soles; the previous static v3 acceptance did not establish perfect art quality.

## Rendering changes

Only runtime rendering adapter `game/hero-assets.js` changed:

1. Measure alpha bounds once, after the complete walking set loads. Each direction uses one uniform scale based on its median silhouette height, targeting 49 logical pixels. Do not independently resize the character every animation frame.
2. Align the visible foot baseline, not the transparent PNG canvas bottom, to the original world anchor. Preserve original pixels and aspect ratios.
3. **Temporary left-facing rendering:** mirror the complete, already-approved right-facing walking frames. The original left PNGs remain untouched. This avoids displaying clipped soles without generating a different character. It uses 12 native walking PNGs for 16 logical directional frame slots; all 22 original assets remain stored and loaded. Front-facing shirt text is never mirrored.
4. Read the existing `MOVE_TIME` to display two frames per tile duration. The four-frame loop now spans two tile durations rather than the former one-second loop. Idle still selects frame 0. No input or movement constants are changed.
5. Align the hero's emote-bubble top with the normalized rendered height.
6. Preserve all-or-nothing walking-art switching, slow-load repaint, portrait speaker tracking, and Canvas fallback. Failed bounds measurement also falls back instead of stopping the game.
7. `HeroAssets.status()` reports revision `walk-polish-1` and `leftUsesMirroredRight`; `geometry()` and `frameAt()` expose read-only/testable rendering diagnostics without modifying game state.

## Reproducible checks

- `tests/hero-integration.cjs`: unchanged original 8 cases, all passed again.
- `tests/hero-walk-geometry.cjs`: 4 new cases, all passed.
  - Chromium and WebKit draw all 16 logical slots using the actual adapter and approved images. Alpha measurements at 3x verify heights near 147 display pixels and a common foot baseline. Directional median heights are exactly 49 logical pixels by construction, while small original intra-step silhouette changes remain.
  - The actual renderer uses the expected 12 unique native files for the 16 slots, with explicit left/right mirroring metadata.
  - Frame sequence is `0,1,2,3,0,1,2,3`; stationary samples do not advance frames.
  - One missing walking PNG preserves consistent Canvas map fallback; valid portrait images continue working and the introductory sequence can finish.
- All 22 original PNG SHA-256 values match `game/assets/bro/manifest.json`.
- Workflow compares `game/game.js` with the approved Claude commit: identical bytes.
- Commit comparison confirms no changes to `game/story.js`, `game/style.css`, root `index.html`, or any PNG.
- The downloaded CI tested-source archive was compared with the local edited adapter and new tests: identical bytes.

## Local preview versus full-game testing

A local offline Chromium harness drew the actual Art and PNG adapter using the original PNG bytes embedded in memory. It produced before/after screenshots and a timing GIF, and verified all 16 logical frames share the same measured foot row. This harness is only rendering evidence.

An attempted local loopback full-game run was blocked by the container browser's administrator policy before navigation; it was not counted as a game failure or a passing test. Full HTTP game regression was instead run on the authorized GitHub Actions runner, with the successful results above. No local browser policy was changed.

## Still pending

- Physical iPhone Safari: actual touch feel, toolbar resizing, audio, performance, and subjective gait smoothness.
- The original left-facing v3 PNGs still need native sole/crop repair before removing the mirrored-right fallback. They have not been falsely marked repaired.
- This is timing/alignment polish of approved poses, not newly drawn in-between frames or a dedicated neutral idle pose. Some source pose differences remain small.
- Other family members are still placeholder art; their final appearance is not approved by this change.
- Further chapters are not implemented by this change.
- The development branch is updated, but main and the public Pages publishing source remain unchanged. Publishing requires explicit approval.
