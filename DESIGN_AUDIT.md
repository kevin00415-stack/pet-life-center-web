# Standalone UI Upgrade — UI Audit Report

This audit documents the visual gaps, hierarchy issues, and technical aspects of the Pet-Life center web modules (Today Dashboard, Daily Journal / Memories, and Pet Profile) before the safe continuation phase.

---

## 1. Weak Visual Hierarchy & Administrative Style
* **Observation:** The main Today Dashboard (`CareHomeView.tsx`) uses multiple grid containers of equal-sized action buttons (`game-actions` and `quick-grid`). They resemble a system administration console rather than a warm, companionship-focused mobile application.
* **Impact:** Users are overwhelmed with equal-priority visual targets. Important urgent actions (like medication delays or upcoming checkups) are not emphasized enough.
* **Fix:** Restructure the primary hero dashboard into a unified, visually engaging card with a dominant pet cover, prominent pet profile photo, basic metadata (age, days together), and high-contrast alert status badges.

## 2. Unfinished & Admin-Like Daily Journal
* **Observation:** Daily recording is currently restricted to a text-heavy Memory creator form (`MemoriesPage.tsx`). It lacks fast, visual status selection.
* **Impact:** Writing a detailed companion diary requires manually typing out feeding, medication, mood, and bodily habits, which increases user friction on mobile devices.
* **Fix:** Turn the memory creation card into a visual, swipeable/scrolling Daily Journal section containing large tap-targets for key metrics:
  - **Mood** (Happy, Calm, Funny, Brave, Miss)
  - **Appetite** (Normal, Low, High, Fasting)
  - **Water Intake** (Normal, Low, High)
  - **Exercise / Activity** (Active, Quiet, Resting)
  - **Bodily Outputs** (Urination, Defecation, Vomiting options)
  - **Medication Completion** checkbox or simple radio items
  These values will serialize nicely into the existing `note` field or a structured schema, ensuring 100% backward compatibility.

## 3. Excessive and Unstructured Spacing
* **Observation:** Margin and padding tokens across cards (`adherence-card`, `cozy-home`, `today-journey`) vary widely. Handheld viewports show either excessive margins on small displays or tight text-wrapping issues.
* **Impact:** Inconsistent padding causes the eye to search for content, reducing older users' speed and readability.
* **Fix:** Define precise spacing multipliers (`--space-xs`, `--space-sm`, `--space-md`, `--space-lg`) in `App.css` and strictly apply them across all modular containers.

## 4. Small Touch Targets and Labels
* **Observation:** Inside `PetEditor.tsx` and date inputs, touch heights are below the recommended 44px threshold. Form fields use small text size (8px–10px) for supplementary instructions.
* **Impact:** Harder to use for older or visually-impaired users under natural, one-handed mobile holding conditions.
* **Fix:** Increase input padding, raise micro-text sizes to at least 12px, and provide larger slider components.

## 5. Overlapping / Overflow Translation Risk
* **Observation:** The translation layer mapping (`en` vs `zh-TW`) works beautifully, but button elements lack fixed-height/min-width flex layouts, causing layout breakage on longer English text values (e.g. "Adherence Rate" vs "今日服藥完成率").
* **Fix:** Utilize CSS Flex/Grid auto-fitting and word-break rules rather than rigid pixel-bounded layouts.

---

This audit acts as the direct blueprint for the Shared UI design implementation in Phase 2 & 3.
