# Design QA — 首頁 3D 主功能按鈕

- Source visual truth: `design-reference.png`, selected warm-island 3D button row
- Generated source assets: `src/assets/feature-icons/health-3d.webp`, `reminder-3d.webp`, `memories-3d.webp`, `music-3d.webp`
- Browser-rendered implementation: `qa-3d-buttons-visible.png`
- Focused side-by-side evidence: `qa-3d-buttons-comparison.png`
- Source pixels: 852 × 1844; focused source crop 808 × 290
- Implementation pixels: 393 × 852; focused implementation crop 367 × 145
- CSS viewport: 393 × 852
- Device scale factor: 1
- Density normalization: source crop downsampled to 367 × 145; implementation compared at native CSS-pixel density
- State: owner-created pet profile, no reminders, home scrolled so the full feature-button row is above the fixed bottom navigation

## Full-view comparison evidence

`qa-3d-buttons-visible.png` shows all four generated icons in the live home screen. The four-column layout remains within the 393px viewport with no horizontal overflow. Each 87.25 × 145px button keeps its working label, helper text, tactile base shadow, and click target. The persistent bottom navigation remains separate when the feature row is in its normal readable scroll position.

## Focused region comparison evidence

`qa-3d-buttons-comparison.png` places the selected reference button row and implementation in one normalized image. Both use:

- four sculpted object icons on cream-and-wood pedestals;
- health clipboard, reminder bell, memories album, and music player metaphors;
- warm ivory, misty blue, muted sage, honey beige, charcoal, and coral accents;
- upper-left lighting, rounded miniature materials, and dimensional elevation;
- Traditional Chinese labels directly below each object.

## Required fidelity surfaces

- Fonts and typography: passed. Existing app typography is preserved; 12px bold labels and 9px helper text remain readable at 393px without truncation.
- Spacing and layout rhythm: passed. Four equal tracks, 6px gaps, 145px button height, consistent radii, pedestal scale, and label spacing match the reference density.
- Colors and visual tokens: passed. Generated assets align with the selected cream/blue/sage/honey palette and existing warm-island tokens.
- Image quality and asset fidelity: passed. Four dedicated 512 × 512 transparent WebP assets replace the earlier generic vector icons. No chroma-key fringe, cropping, stretching, or placeholder imagery is visible. Each asset is 41–48 KB.
- Copy and content: passed. The labels remain 健康紀錄、照護提醒、回憶相簿、舒壓音樂; helper text remains functional and accurate.

## Findings

No actionable P0, P1, or P2 findings remain.

- [P3] The live buttons use slightly slimmer cards than the reference because the production screen also preserves helper text and a 393px responsive width.
  - Impact: negligible; object identity and 3D character remain clear.
  - Follow-up: optional larger two-column layout is available below 350px to protect readability on very narrow screens.

## Interaction and runtime verification

- Production build: passed; all four WebP assets included.
- Lint: passed with no warnings.
- Domain tests: 17 passed.
- Browser console: no React runtime exception. The isolated headless browser reported the same non-app blocked-resource request and missing favicon seen in earlier QA; neither affects the offline UI.
- Primary interactions: all four buttons retain their existing click handlers; measured four buttons, each 87.25 × 145px.
- Responsive overflow: none at 393px.

## Comparison history

- Earlier state: functional feature buttons used small Phosphor vector icons inside generic dimensional tiles.
- User-selected direction: replace those icons with the generated sculpted 3D objects.
- Fix: generated four consistent assets, removed chroma backgrounds, cropped/padded to square, converted to transparent 512px WebP, inserted each into its original working button, and added a pressed-object motion state.
- Post-fix evidence: `qa-3d-buttons-visible.png` and `qa-3d-buttons-comparison.png`; no P0/P1/P2 issue remains.

## Implementation checklist

- [x] Four selected 3D assets generated in one art direction.
- [x] Transparent edges validated.
- [x] Assets compressed and added to the project.
- [x] Original button actions and Chinese labels preserved.
- [x] Pressed-state motion added.
- [x] Build, tests, lint, screenshot, and focused comparison passed.

final result: passed
