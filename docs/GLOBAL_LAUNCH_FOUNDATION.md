# Guardian Global Launch Foundation

## Authoritative direction

- Product brand: **毛孩生活中心 / Pet Life Center**.
- Platform: **PWA with Capacitor mobile shells for Android and iOS**.
- Architecture baseline: Jules branch `jules-14790070014898110856-7f67a0aa`, starting at `40573174da3de1a9e048be11553717eacf69c884`.
- Product data remains local-first. No account, cloud sync, AI diagnosis, tracking, government API or insurance integration is claimed.

## Verified Guardian architecture

The synchronized baseline contains Timeline aggregation and messaging, Observation, Context, Insight, Case Journey, Guardian Today, Attachment, Shared Media, Reminder selection, Reminder Center, Care Home Dashboard and Health Timeline modules with associated tests.

## Internationalization foundation

- Supported locale identifiers: `zh-TW` and `en-US`.
- Traditional Chinese is the complete fallback locale.
- First launch detects `navigator.languages`; unsupported languages fall back to `zh-TW`.
- A legacy saved value of `en` is normalized to `en-US`.
- Manual choice is available in Settings and saved as `maohai-app-locale`.
- `Intl.DateTimeFormat` and `Intl.NumberFormat` wrappers are provided.
- Weight and temperature display conversion is provided while canonical values remain kg and Celsius.
- User-generated content is never translated.

### Translation coverage

The synchronized Jules branch already externalized the main dashboard, journal, pet editor and community vocabulary into paired dictionaries. This foundation adds public-site content and locale infrastructure. It does **not** claim complete extraction: a scan at implementation start found 1,340 source lines containing Han characters, including the zh-TW dictionary, tests, comments, mock content and remaining hard-coded UI/service text.

Highest-priority remaining extraction areas are Settings, notifications, reports, reminder editor, calendar, health subviews, relaxation player, senior care, event center, visual comparison and service-produced presentation messages. These should move feature-by-feature with regression tests; user content and persisted values must remain untouched.

## Public website

Route: `/website`

Sections:

- Hero and product philosophy
- Guardian Today
- Verified feature overview
- Case Journey
- Timeline, memories, attachments and backup positioning
- PWA installation guidance
- FAQ
- Privacy, terms and contact
- SEO, Open Graph and Twitter card metadata

Explicitly excluded claims: AI diagnosis, treatment recommendations, cloud sync, accounts, government integration, insurance integration, user tracking and any unfinished capability.

## Design-token foundation

`src/design-tokens.css` defines launch colors, typography, spacing, radii, shadows, focus styling, buttons, cards, responsive reference breakpoints and reduced-motion behavior. The warm companion theme is the default. Existing screens were not redesigned.

## Verification commands

```bash
npm ci
npm run test -- --run
npm run lint
npm run build
```

Visual implementation remains subject to owner review and final visual acceptance.
