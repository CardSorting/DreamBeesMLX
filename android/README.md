# DreamBees Android

Native Android application inspired by the DreamBees Electron desktop app.

This app is a Kotlin + Jetpack Compose implementation of the core DreamBees Lite experience:

- **Styles feed** inspired by the Electron `/` Model Feed page.
- **Generator** inspired by `/generate`, including prompt entry, DreamTrail modes, shape selection, Zaps copy, progress messaging, and a preview area.
- **Profile/history** inspired by `/profile`, including credits and recent creations.
- **Layered package structure** aligned with the repository's JoyZoning guidance:
  - `domain/` — pure models, repository contracts, prompt rules, Zap cost policy.
  - `core/` — app state and orchestration rules.
  - `infrastructure/` — mock repository and future adapter location for Firebase/Cloud Functions/local persistence.
  - `ui/` — Android/Compose presentation.

## Build

From the repository root:

```bash
gradle -p android :app:assembleDebug
```

Or from inside this directory:

```bash
gradle :app:assembleDebug
```

The project expects an Android SDK plus Gradle access to the Android Gradle Plugin and Jetpack Compose dependencies. If those dependencies are not already cached, Gradle will need network access to `google()`, `mavenCentral()`, and `gradlePluginPortal()`.

## Current integration status

The first native app uses `MockDreamBeesRepository` so it can run without Firebase credentials. The package boundaries are prepared for follow-up adapters:

- Firebase Auth sign-in.
- Firestore model/history loading.
- Cloud Functions callable `api` requests for `createGenerationRequest`.
- Local Room persistence for on-device history.
- Real image previews from DreamBees storage/CDN.