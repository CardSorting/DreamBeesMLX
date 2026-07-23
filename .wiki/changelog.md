# Changelog

## 2026-06-14 — Native Android Application Scaffold

### Files Changed

- `android/settings.gradle.kts`
- `android/build.gradle.kts`
- `android/gradle.properties`
- `android/app/build.gradle.kts`
- `android/app/proguard-rules.pro`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/java/com/dreambees/android/MainActivity.kt`
- `android/app/src/main/java/com/dreambees/android/domain/models/AspectRatio.kt`
- `android/app/src/main/java/com/dreambees/android/domain/models/DreamBeeModel.kt`
- `android/app/src/main/java/com/dreambees/android/domain/models/DreamTrailMode.kt`
- `android/app/src/main/java/com/dreambees/android/domain/models/Generation.kt`
- `android/app/src/main/java/com/dreambees/android/domain/models/UserWallet.kt`
- `android/app/src/main/java/com/dreambees/android/domain/repositories/DreamBeesRepository.kt`
- `android/app/src/main/java/com/dreambees/android/domain/services/PromptRules.kt`
- `android/app/src/main/java/com/dreambees/android/domain/services/ZapCostPolicy.kt`
- `android/app/src/main/java/com/dreambees/android/core/DreamBeesCoreState.kt`
- `android/app/src/main/java/com/dreambees/android/core/DreamBeesEngine.kt`
- `android/app/src/main/java/com/dreambees/android/infrastructure/MockDreamBeesRepository.kt`
- `android/app/src/main/java/com/dreambees/android/ui/DreamBeesAndroidApp.kt`
- `android/app/src/main/res/drawable/ic_dreambees.xml`
- `android/app/src/main/res/values/colors.xml`
- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/values/styles.xml`
- `android/app/src/main/res/xml/backup_rules.xml`
- `android/app/src/main/res/xml/data_extraction_rules.xml`
- `android/README.md`
- `ROADMAP.md`
- `.wiki/index.md`
- `.wiki/changelog.md`

### Verified Android App Changes

- Added a standalone native Android project under `android/` using Kotlin, Android Gradle Plugin, and Jetpack Compose.
- Added a launchable Android application with package/namespace `com.dreambees.android` and app label `DreamBees`.
- Added a Compose `MainActivity` that renders `DreamBeesAndroidApp()`.
- Added pure domain models for aspect ratio choices, DreamBees AI style models, DreamTrail modes, generation stages, generation requests, generation history items, and user wallet/Zaps display.
- Added pure domain services for prompt trimming/submission validation and Zap cost calculation.
- Added `DreamBeesRepository` as a domain repository contract for model loading and generation creation.
- Added core state/orchestration in `DreamBeesCoreState` and `DreamBeesEngine`, including selected model, prompt, selected aspect ratio, DreamTrail mode, generation progress, generation history, create gating, and blocking reason copy.
- Added `MockDreamBeesRepository` as the initial infrastructure adapter with built-in DreamBees style data and mock generated-history output; it performs no Firebase, Firestore, Cloud Functions, or storage calls.
- Added a native Compose UI inspired by the Electron app:
  - Styles feed for selecting DreamBees visual styles.
  - Generator screen with prompt input, DreamTrail mode chips, aspect ratio chips, selected style summary, Create button, Zaps copy, progress states, and preview panel.
  - Profile/history screen with credits, demo sign-in copy, and recent mock creations.
  - Bottom navigation for `Styles`, `Create`, and `Profile`.
- Added Android resources for icon, theme, colors, app name, backup rules, and data extraction rules.
- Added `android/README.md` with build commands and explicit future integration notes for Firebase Auth, Firestore, Cloud Functions callable generation requests, Room/local persistence, and real image previews.
- Updated `ROADMAP.md` to record Android as part of the DreamBees multi-client center of gravity and to add Android verification guidance.

### Architecture Notes

- New Android Domain files are pure Kotlin and do not import Android, Firebase, filesystem, or network APIs.
- New Android Core files coordinate domain state transitions and do not implement low-level persistence or cloud behavior.
- New Android Infrastructure currently consists of a mock repository adapter only; production Firebase integration is intentionally deferred behind the `DreamBeesRepository` contract.
- New Android UI files depend on Compose and render state/dispatch intentions; they do not directly call Firebase or Cloud Functions.
- Existing Electron, React/Vite, Firebase Functions, Next.js web portal, and root npm package files were not modified for the Android scaffold.

### Verification Evidence

- First Android build attempt failed at `:app:checkDebugAarMetadata` because AndroidX dependencies required `android.useAndroidX=true`.
- Added `android/gradle.properties` with `android.useAndroidX=true`, `android.nonTransitiveRClass=true`, and JVM args.
- Second Android build attempt reached Kotlin compilation and identified an invalid `@Composable Column.() -> Unit` receiver in `CardPanel`.
- Updated `CardPanel` to use `@Composable ColumnScope.() -> Unit` and imported `ColumnScope`.
- Final verification command completed successfully:

```bash
gradle -p /Users/bozoegg/Desktop/DreamBeesv12/android :app:assembleDebug --no-daemon --stacktrace
```

### Follow-up

- Replace `MockDreamBeesRepository` with Firebase Auth, Firestore, callable Cloud Functions, and local persistence adapters before treating Android as production-ready.
- Add Android tests for `DreamBeesEngine`, `PromptRules`, and `ZapCostPolicy` once the project adds a test dependency set.

## 2026-04-29 — Generation Page Next-Action and Goal-Based Creation Pass

### Files Changed

- `src/pages/Generator.tsx`
- `.wiki/index.md`
- `.wiki/changelog.md`

### Verified UI Changes in `src/pages/Generator.tsx`

- Added a next-best-action panel below the shortcut strip that tells the user exactly what to do next based on current state.
- The next-best-action panel now provides familiar CTA routing for common blockers:
  - signed-out users get a `Sign in` action to `/auth`.
  - users without a selected style get a `Choose style` action to `/`.
  - users without prompt text get a `Write prompt` anchor action to `#image-prompt`.
  - ready users get a `Create image` action that invokes the existing generation handler.
  - offline or currently-generating states show disabled status actions.
- Added a goal-based creation starter panel titled `What do you want to make?`.
- Added goal cards for `Start from scratch`, `Make a character`, `Build a scene`, and `Show a product`.
- Goal cards seed the prompt textarea with familiar starter structures only when appropriate; they remain UI guidance and do not change backend prompt processing.
- Added a sticky create summary inside the control form so users retain a visible create/readiness affordance while moving through the form.
- Added responsive CSS for the next-action panel, goal panel, goal cards, and sticky create summary.

### Architecture Notes

- Affected layer: UI page composition in `src/pages/Generator.tsx`.
- No Domain, Core, backend Infrastructure, Firebase, Electron, moderation, billing, or persistence logic was modified.
- The existing generation call path remains delegated to `generate(cleanPrompt)` from `LiteContext`.
- Existing routes are reused: `/auth`, `/`, `/profile`, and `#image-prompt`.
- No new dependencies were introduced.

### Verification Evidence

- `npm exec tsc -- --noEmit --pretty false` completed without reported TypeScript errors after this pass.
- `npm run build` completed successfully after this pass, producing Vite production output for app, Electron main, and Electron preload bundles.

## 2026-04-29 — Generation Page Guided UX and Readiness Audit Pass

### Files Changed

- `src/pages/Generator.tsx`
- `.wiki/index.md`
- `.wiki/changelog.md`

### Verified UI Changes in `src/pages/Generator.tsx`

- Re-audited the generation page and strengthened the existing task-oriented creation flow with more familiar guided-creation patterns for non-technical users.
- Replaced the single flat prompt-example row with grouped prompt starter tabs:
  - `Quick starts`
  - `Characters`
  - `Products`
- Added multiple starter prompts per group so users can begin from recognizable examples instead of writing from a blank canvas.
- Added a visible prompt strength/guide indicator showing how many helpful prompt details are currently included.
- Added a collapsible writing-help checklist for:
  - `Subject`
  - `Style`
  - `Mood`
  - `Details`
- Added dynamic workflow state handling so the four-step strip can reflect current progress across `Describe`, `Choose style`, `Generate`, and `Review`.
- Added a quick-route shortcut strip for `Write prompt`, `Choose style`, `Open history`, and readiness status.
- Added a generation readiness checklist for `Signed in`, `Style selected`, `Prompt added`, and `Online`.
- Updated the primary create button logic and copy so disabled states explain the blocking condition:
  - offline users see `Reconnect to create`.
  - signed-out users see `Sign in to create`.
  - users without a selected style see `Choose a style first`.
  - users without prompt text see `Describe your image first`.
- Updated generation submission gating so the page only calls `generate(cleanPrompt)` when prompt text, sign-in, selected style, online status, and non-generating status are all ready.
- Updated selected-style helper copy to mention available styles when no style is selected.
- Expanded the preview header with readiness/status badges.
- Expanded the loading state with familiar progress cues: `Checking prompt`, `Applying style`, and `Saving result`.
- Expanded the empty preview state with direct actions to write a prompt or choose a style.
- Added a `Not sure where to start?` helper box in the prompt guide card.
- Reworked responsive CSS for the added shortcut strip, prompt guide, prompt example tabs, readiness checklist, and preview badges.

### Architecture Notes

- Affected layer: UI page composition in `src/pages/Generator.tsx`.
- Existing backend generation behavior remains delegated to the existing `generate` function from `LiteContext`.
- Existing routes are reused for navigation: `/`, `/profile`, and `/auth`.
- The prompt checklist and grouped starters are presentation guidance only; they do not alter backend prompts, model selection, moderation, billing, Firebase, Electron, Domain, or Core behavior.
- No new dependencies were introduced.

### Verification Evidence

- `npm exec tsc -- --noEmit --pretty false` completed without reported TypeScript errors after the `src/pages/Generator.tsx` changes.
- `npm run build` completed successfully after the `src/pages/Generator.tsx` changes, producing Vite production output for the app bundle plus Electron main and preload bundles.

## 2026-04-29 — Full-Width Profile and History UX Audit Pass

### Files Changed

- `src/pages/UserProfile.tsx`
- `.wiki/index.md`
- `.wiki/changelog.md`

### Verified UI Changes in `src/pages/UserProfile.tsx`

- Replaced the previous narrow atmospheric profile/archive page with a full-width profile and history dashboard.
- Added a clear page header with breadcrumb context: `Studio / Profile & history`.
- Added plain-language page copy explaining that users can manage their account, review local history, and continue creating.
- Added quick navigation actions for `Create image`, `Choose style`, and `Sign out`.
- Replaced atmospheric account language with clearer labels:
  - `Creator level`
  - `Images created`
  - `Current level`
  - `Local history`
  - `System status`
- Added a full-width account overview with user identity, creator-level progress, next milestone copy, and benefit pills.
- Added a dashboard stat grid for total images, current level, images with style info, and local history status.
- Reworked the history area into a dedicated `Your image history` workspace.
- Added search with placeholder text for prompts, image IDs, and style IDs.
- Added visible result counts with `Showing X of Y images`.
- Added filter tabs for `All images`, `Recent`, and `With style info`.
- Added a no-results state with a clear search/filter reset action.
- Added an empty-history state with direct actions to `Create image` and `Choose style`.
- Reworked history cards so prompt text, save date, image ID, and style ID metadata are visible without relying on hover.
- Improved image alt text by using prompt text when available.
- Reworked diagnostics into a secondary `System status` panel with clearer labels:
  - `Local history database`
  - `Desktop app version`
  - `Build type`
- Reworked responsive CSS so the full-width dashboard collapses into tablet and mobile layouts.

### Architecture Notes

- Affected layer: UI page composition in `src/pages/UserProfile.tsx`.
- Existing profile/history data contract remains intact: `currentUser`, `logout`, `localHistory`, and `addToast` are still sourced from `useLite()`.
- Existing tier display source remains intact: `calculateTier()` and `USER_TIERS` are still used for creator-level display.
- Existing optional system status contract remains intact: the page still calls `window.electronAPI.lite.health()` when available.
- Search and filters are presentational UI behavior over existing `localHistory`; no persistence, backend, Electron, Domain, or Core behavior was modified.

### Verification Evidence

- `npm exec tsc -- --noEmit --pretty false` completed without reported errors.
- `npm run build` completed successfully with Vite production output for app, Electron main, and Electron preload bundles.

## 2026-04-29 — Model Selection UX and Navigation Audit Pass

### Files Changed

- `src/pages/ModelFeed.tsx`
- `.wiki/index.md`
- `.wiki/changelog.md`

### Verified UI Changes in `src/pages/ModelFeed.tsx`

- Replaced the previous immersive engine gallery with a more familiar style-picker workflow.
- Added a clear page header with breadcrumb context: `Explore / Choose style`.
- Added plain-language page copy explaining that users are choosing the look for their next image and can change it before generating.
- Added quick navigation actions for `Create image` and `History` using existing application routes.
- Added a current-choice summary panel that shows the selected model when present, recommends a starting style when no model is selected, and provides a clear continuation CTA.
- Added beginner-friendly guidance chips explaining when to choose realistic, illustration/anime, or recommended beginner styles.
- Added a searchable style library with a visible count showing how many styles are currently displayed.
- Added category filter tabs for `All styles`, `Best for beginners`, `Realistic`, `Illustration`, and `Creative`.
- Added empty states for both loading models and no matching search/filter results, including a clear reset action for empty search results.
- Reworked model cards to use clearer terminology:
  - `Use this style` as the primary action.
  - `Selected` and `Recommended` badges.
  - Plain-language style labels such as `Photo style`, `Art style`, `Creative`, and `Recommended`.
  - `Best for:` guidance derived from existing model metadata and model text.
- Preserved whole-card selection while adding keyboard accessibility through `role="button"`, `tabIndex={0}`, and Enter/Space handling.
- Reworked responsive CSS so the page collapses from multi-column desktop browsing to simpler tablet/mobile layouts.

### Architecture Notes

- Affected layer: UI page composition in `src/pages/ModelFeed.tsx`.
- Existing model data contract remains intact: `availableModels`, `selectedModel`, `setSelectedModel`, and `currentUser` are still sourced from `useLite()`.
- Existing selection behavior remains intact: `lite_selected_model` is still written to `localStorage`; authenticated users continue to `/generate`; unauthenticated users are redirected to `/auth`.
- Model categorization is presentational decision support only and is derived locally from existing `AIModel` name/description and `getModelMetadata()` output.
- No Domain, Core, Firebase, Electron, or backend generation behavior was modified.

### Verification Evidence

- `npm exec tsc -- --noEmit --pretty false` completed without reported errors.
- `npm run build` completed successfully with Vite production output for app, Electron main, and Electron preload bundles.

## 2026-04-29 — Generation Page UX and Navigation Audit Pass

### Files Changed

- `src/pages/Generator.tsx`
- `.wiki/index.md`
- `.wiki/changelog.md`

### Verified UI Changes in `src/pages/Generator.tsx`

- Replaced the previous atmospheric generator presentation with a more familiar, task-oriented creation page.
- Added a clear page header with breadcrumb navigation: `Explore / Create`.
- Added quick top-level navigation actions for `Models` and `History` using existing application routes.
- Added a four-step workflow strip: `Describe`, `Choose style`, `Generate`, and `Review`.
- Added a left-side control panel with:
  - Explicit `Image description` label.
  - Plain-language prompt placeholder.
  - Character counter with a `1000` character limit.
  - Keyboard helper text for Enter and Shift+Enter behavior.
  - Prompt example buttons that fill the prompt textarea.
  - A selected style/model card with a `Change` link to model selection.
  - A primary `Generate image` button with clearer disabled and loading copy.
- Added a right-side preview area with:
  - Empty state explaining where generated images appear.
  - Accessible loading state with `role="status"` and `aria-live="polite"`.
  - Latest generated image display with prompt caption.
  - Selected model pill when a model is available.
- Added a prompt guide card that explains useful prompt ingredients in non-technical language.
- Added a `Recent creations` library section with a `View full history` link and an empty state when there are not enough local history items.
- Reworked responsive CSS so the layout collapses from a two-column desktop workflow to a single-column mobile workflow.

### Architecture Notes

- Affected layer: UI page composition in `src/pages/Generator.tsx`.
- Existing imports remain within the current frontend boundary: React, React Router, Framer Motion, `useLite`, `getOptimizedImageUrl`, and local icons.
- No new backend, persistence, API, Domain, or Core behavior was introduced.
- Business generation behavior remains delegated to the existing `generate` function from `LiteContext`.

### Verification Evidence

- `npm exec tsc -- --noEmit --pretty false` completed without reported errors.
- `npm run build` completed successfully with Vite production output for app, Electron main, and Electron preload bundles.