# Guardian Global Launch Phase 2

## Status

Phase 2 foundation is implemented, but the full-app string migration is not yet complete. This report deliberately does not classify the sprint as release-ready while legacy UI strings remain.

## Internationalization

- Existing `zh-TW` and `en-US` runtime selection, device-language detection, and locale-aware formatting remain in place.
- The veterinary visit panel is now backed by the shared translation dictionaries. User-entered checklist items and clinical notes are never translated.
- Theme labels and supporting copy have translation keys available.
- Protected engines, Guardian Today logic, Case Journey logic, device store, backup format, and storage schema were not modified.

### Remaining untranslated strings

The source audit still finds presentation text or locale literals in these UI files:

- `src/App.tsx`
- `src/CareCalendar.tsx`
- `src/GrowthTracker.tsx`
- `src/HealthTimeline.tsx`
- `src/MemoriesPage.tsx`
- `src/PetAvatar.tsx`
- `src/PetEditor.tsx`
- `src/RelaxPage.tsx`
- `src/ReminderEditor.tsx`
- `src/SettingsPage.tsx`

Chinese text also exists in `domain.ts`, `notifications.ts`, `vet-report.ts`, `local-photo.ts`, and `device-store.ts`. These require a presentation-boundary mapping before migration so domain values, persisted data, notification compatibility, and backup behavior do not change. They were intentionally not modified in this pass.

## Theme implementation

- Runtime themes: Warm, Tech, Medical, Nature, and Game.
- Warm is the default.
- The selected theme is stored as a device preference and applied through `data-theme` on the document root.
- Themes override design tokens only; no business behavior or screen structure changes.
- A Settings selector exposes runtime switching.
- Automated tests cover default initialization and all five switches.

## Locale QA

- Long text: global wrapping prevents unbroken English strings from escaping cards.
- Touch targets: interactive controls receive a minimum 44 px block size.
- Safe areas: header and footer tokens account for device safe-area insets.
- RTL preparation: logical alignment rules were added for common site navigation surfaces. RTL is not advertised as supported because no RTL locale is enabled.
- Date, time, and number formatting: existing `Intl`-based formatters remain the required path. Legacy direct `toLocale*` calls in the files above still require migration.
- Units: the existing formatter supports kg/lb and Celsius/Fahrenheit without changing canonical stored values. A complete user preference UI remains outstanding.

## Trust polish

Shared tokens now provide consistent touch sizing, text wrapping, safe-area behavior, surface colors, ink colors, and theme transitions without redesigning screens.

## Remaining work before release

1. Complete the ten UI-file migrations listed above.
2. Add the unit preference controls and route every displayed weight and temperature through the locale formatter.
3. Add screenshot QA for narrow phones and long English content.
4. Map service/domain status values to translation keys at the UI boundary without changing persisted values.
5. Re-run the full test, build, and lint gates after that migration.

