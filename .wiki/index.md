# Sovereign Knowledge Ledger

## Project State Index

This ledger records verified project changes made during implementation work. Entries are factual and map directly to files changed in the working tree.

## Current Verified Change Set

- `android/` was added as a standalone native Android Gradle project for DreamBees.
- `android/settings.gradle.kts`, `android/build.gradle.kts`, `android/gradle.properties`, and `android/app/build.gradle.kts` define the Android build: Android application plugin `8.7.3`, Kotlin Android plugin `2.0.21`, Compose compiler plugin `2.0.21`, namespace/application ID `com.dreambees.android`, compile/target SDK `35`, min SDK `26`, and AndroidX enabled.
- `android/app/src/main/AndroidManifest.xml` defines a launchable portrait `MainActivity`, app label `DreamBees`, INTERNET and ACCESS_NETWORK_STATE permissions, backup/data extraction resources, and the `Theme.DreamBeesAndroid` theme.
- `android/app/src/main/java/com/dreambees/android/MainActivity.kt` starts the Compose UI with `DreamBeesAndroidApp()`.
- Android Domain files were added under `android/app/src/main/java/com/dreambees/android/domain/` for pure DreamBees concepts: aspect ratios, AI style models, DreamTrail modes, generation request/history/stage models, user wallet display, repository contract, prompt rules, and Zap cost policy.
- Android Core files were added under `android/app/src/main/java/com/dreambees/android/core/` for app state and orchestration: selected model, prompt, DreamTrail mode, aspect ratio, wallet, generation stage/progress, history, submit gating, block reasons, progress updates, and generation completion state.
- `android/app/src/main/java/com/dreambees/android/infrastructure/MockDreamBeesRepository.kt` implements the Android repository contract with built-in model data and mock generation history creation; it is explicitly a starter adapter and does not call Firebase.
- `android/app/src/main/java/com/dreambees/android/ui/DreamBeesAndroidApp.kt` implements the native Jetpack Compose app inspired by the Electron app: Styles feed, Create/generator screen, Profile/history screen, DreamBees dark theme, bottom navigation, prompt entry, DreamTrail mode chips, aspect ratio chips, style cards, Zaps copy, progress preview, and local mock history rendering.
- Android resources were added for the app icon vector, app colors, app name, no-action-bar theme, backup rules, and data extraction rules.
- `android/README.md` documents the new Android app purpose, layer structure, build command, and future Firebase/Auth/Firestore/Functions/local persistence adapter work.
- Verification performed for the Android app: `gradle -p /Users/bozoegg/Desktop/DreamBeesv12/android :app:assembleDebug --no-daemon --stacktrace` completed successfully after adding AndroidX Gradle properties and fixing the Compose `CardPanel` receiver type.
- `ROADMAP.md` was updated to recognize DreamBees as a multi-client platform with Electron, Android, Firebase backend, and web portal surfaces, and to add Android verification/follow-up integration guidance.

## Prior Verified Change Set

- `src/pages/Generator.tsx` received additional generation-page UX/navigation audit passes focused on familiar, non-technical creation patterns.
- The generation page now includes grouped prompt starter tabs, a prompt quality checklist, a prompt strength indicator, a readiness checklist, dynamic workflow step states, quick route shortcuts, a next-best-action panel, goal-based creation starter cards, a sticky create summary, clearer disabled CTA copy, offline/sign-in/style readiness messaging, and expanded preview empty/loading guidance.
- The generation contract remains unchanged: the page still calls the existing `useLite().generate(prompt)` function, still delegates generation behavior to `LiteContext`, and still consumes generation/page state from `useLite()`.
- `src/pages/ModelFeed.tsx` was redesigned as a clearer style-selection workflow for non-technical users.
- The model selection contract remains unchanged: the page still consumes `availableModels`, `selectedModel`, `setSelectedModel`, and `currentUser` from `useLite()`; selection still stores `lite_selected_model`; authenticated users still continue to `/generate`; unauthenticated users still go to `/auth`.
- `src/pages/UserProfile.tsx` was redesigned as a full-width profile and image-history dashboard for non-technical users.
- The profile/history contract remains unchanged: the page still consumes `currentUser`, `logout`, `localHistory`, and `addToast` from `useLite()`; tier display still uses `calculateTier()` and `USER_TIERS`; optional system status still uses `window.electronAPI.lite.health()`.
- No Domain, Core, backend Infrastructure, Firebase, or Electron generation orchestration files were modified during this pass.
- Verification performed after the latest generation-page pass: `npm exec tsc -- --noEmit --pretty false` completed without reported TypeScript errors, and `npm run build` completed successfully with Vite production output for app, Electron main, and Electron preload bundles.

## Ledger Files

- [`changelog.md`](./changelog.md) — chronological record of verified changes.