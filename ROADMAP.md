# ROADMAP.md

## 1. Project Center of Gravity

**Core Purpose:**  
**DreamBees** is an AI image generation platform consisting of native creator clients, a Firebase cloud backend, and a Next.js web portal. Users describe what they want, pick a visual style, and receive generated images — stored locally on-device and optionally synced to the cloud.

**Primary Users / Operators:**  
DreamBees Lite desktop and Android app users, plus operators maintaining Firebase Cloud Functions and the download/marketing web portal.

**Canonical Architecture:**  
**DreamBees** is an AI image generation platform consisting of an Electron + React desktop app, a native Android Kotlin/Jetpack Compose app surface, a Firebase Cloud Functions backend, and a Next.js web portal. Users describe what they want, pick a visual style, and receive generated images — stored locally on-device and optionally synced to the cloud. The desktop/web surfaces are built with Vite/Next.js and npm; the Android surface builds with Gradle.

**Canonical Workflows:**  
Preserve creator flows — verify web/desktop logic via `npm run test`; verify Android native shell via `gradle -p android :app:assembleDebug` when Android tooling is available.

**Primary Runtime / Operational Center:**  
Containerized runtime — Docker/Docker Compose manifests define operational center

**What This Project Must Not Become:**  
Uncontrolled client proliferation where desktop, Android, web, and backend generation contracts drift without documented ownership, shared product language, or verified build paths.

## 2. Roadmap Health

**Status:** Coherent

**Summary:**  
DreamBees now has an initial native Android application scaffold alongside the existing Electron desktop app, Firebase backend, and web portal.

**Why This Status:**  
- ROADMAP.md created from gathered evidence
- Schema established for long-horizon steering
- Native Android scaffold was added in a separate `android/` Gradle project without disrupting existing Electron, Functions, or web paths

**Primary Risk:**  
Client drift between Electron, Android, and web generation experiences if shared product concepts and backend contracts are not kept explicit.

**Primary Opportunity:**  
Use the Android app as a clean native-client boundary for shared DreamBees product concepts while keeping Firebase generation, billing, and storage contracts centralized.

## 3. Strategic Narrative

**DreamBees** is an AI image generation platform consisting of native creator clients, a Firebase cloud backend, and a Next.js web portal. Users describe what they want, pick a visual style, and receive generated images — stored locally on-device and optionally synced to the cloud. The new Android surface should stay inspired by the Electron app’s Style Feed, Generator, and Profile/History workflows while integrating backend services through explicit adapters instead of duplicating cloud logic.

## 4. Now

### 1. Keep native client contracts aligned

**Goal:**  
Ensure Electron, Android, and web generation clients share the same style-selection, prompt, aspect-ratio, Zap-cost, history, and generation request vocabulary before deeper Firebase integration.

**Evidence:**  
`src/pages/ModelFeed.tsx`, `src/pages/Generator.tsx`, `src/contexts/LiteContext.tsx`, `android/app/src/main/java/com/dreambees/android/domain/`, `android/app/src/main/java/com/dreambees/android/core/`

**Center-of-Gravity Impact:**  
Strengthens

### 2. Integrate Android through adapters, not duplicated backend logic

**Goal:**  
Replace the Android mock repository with Firebase Auth, Firestore model/history loading, callable `api` generation requests, and local persistence through infrastructure adapters that implement domain contracts.

**Evidence:**  
`android/app/src/main/java/com/dreambees/android/domain/repositories/DreamBeesRepository.kt`, `android/app/src/main/java/com/dreambees/android/infrastructure/MockDreamBeesRepository.kt`, `functions/src/handlers/dreamtrail.ts`, `functions/src/handlers/generation.ts`

**Center-of-Gravity Impact:**  
Strengthens

### 3. Preserve web/desktop build health while expanding mobile

**Goal:**  
Continue verifying existing web/desktop work with `npm run test` and verify Android with `gradle -p android :app:assembleDebug` when mobile files change.

**Evidence:**  
`package.json`, `android/build.gradle.kts`, `android/app/build.gradle.kts`

**Center-of-Gravity Impact:**  
Strengthens

## 5. Next

- Add Android Firebase/Auth/Firestore/Functions adapters behind `DreamBeesRepository`.
- Add native Android local persistence for on-device generation history.
- Decide which shared client concepts need generated contracts or shared documentation to prevent Electron/Android/web drift.

## 6. Later

- Prepare Android release signing, Play Store packaging, deep-link auth, and production mobile analytics after cloud integration is real.

## 7. Discovery

## 8. Maintenance Gravity

### Hotspots

| Area | Symptom | Risk | Recommended Action |
|---|---|---|---|
| Multi-client generation UX | Electron, web, and Android can express the same creator concepts independently | Medium | Keep shared generation vocabulary documented and test adapter contracts when client behavior changes |
| Android cloud integration | Current Android repository is a mock adapter | Medium | Add Firebase/Functions adapters behind `DreamBeesRepository` before treating Android as production |

### Repeated Friction

### Documentation Gaps

- Android setup and build instructions now exist in `android/README.md`; production Firebase integration details are still future work.

### Agent Confusion Points

## 9. Centralization & Code Soup Audit

**Overall Code Soup Risk:** Medium

### Canonical Path Integrity

**Assessment:**  
Code soup risk: Low — see code_soup_pre_audit.

### Authority Boundaries

**Assessment:**  
Firebase Cloud Functions remain the backend authority for generation, billing, and data access. Electron and Android clients should call backend contracts through adapters rather than reimplementing backend rules.

### Structural Drift

**Assessment:**  
Recent changes from git evidence:
- firebase.json
- package.json
- src/contexts/LiteContext.tsx
- web/src/app/auth/page.tsx
- web/src/app/dashboard/page.tsx
- web/src/app/generator/Generator.css
- web/src/app/generator/page.tsx
- web/src/app/layout.tsx
- android/settings.gradle.kts
- android/app/build.gradle.kts
- android/app/src/main/java/com/dreambees/android/

### Agent Coherence

**Assessment:**  
Recent commits: 27c776d I've successfully diagnosed and resolved all the issues causing the Next.js Turbopack build failure during the hosting predeploy   step. Here's a summary of the fixes applied:; 1a7d302  I have successfully mirrored the generation features from the Vite-based application to the Next.js web application.; e12caa9 # Walkthrough - Removing the Ideogram Model

### Centralization Recommendation

Converge duplicate client concepts through documented contracts and repository interfaces; keep Android infrastructure adapters separate from pure domain/core state.

## 10. Decision Log

### 2026-06-14 — Native Android app scaffold added

**Decision:**  
Add a standalone Kotlin/Jetpack Compose Android application under `android/` inspired by the Electron app’s Model Feed, Generator, and Profile/History flows.

**Reason:**  
The project now needs a native Android surface without destabilizing the existing Electron, Firebase Functions, or Next.js code paths.

**Impact:**  
Strengthens the native-client strategy while increasing the need for explicit shared generation contracts and adapter boundaries.

**Follow-up:**  
Replace the mock Android repository with Firebase/Auth/Firestore/Functions adapters and add local persistence before production release work.

### 2026-06-14 — Initial roadmap bootstrap

**Decision:**  
Adopt ROADMAP.md at workspace root as the steering surface for DreamBees AI Art — **DreamBees** is an AI image generation platform consisting of a native desktop app, a Firebase cloud backend, and a Nex — application · Vitest.

**Reason:**  
Adopt ROADMAP.md as the long-horizon steering surface for DreamBees AI Art — **DreamBees** is an AI image generation platform consisting of a native desktop app, a Firebase cloud backend, and a Nex — application · Vitest.

**Impact:**  
Route DreamBees AI Art — **DreamBees** is an AI image generation platform consisting of a native desktop app, a Firebase cloud backend, and a Nex — application · Vitest strategic work through Now/Next/Later — max 5 Now items.

**Follow-up:**  
Run roadmap checkpoints after meaningful direction changes.

## 11. Recent Checkpoint

**Date:** 2026-06-14

**Checkpoint Summary:**  
Added a native Android app scaffold under `android/` and updated steering to recognize DreamBees as a multi-client AI image generation platform with Electron, Android, Firebase backend, and web portal surfaces.

**Moved:**  
- None

**Added:**  
- Native Android Kotlin/Jetpack Compose client surface in roadmap scope
- Android verification command: `gradle -p android :app:assembleDebug`

**Updated:**  
- Center of gravity, Now items, maintenance gravity, code soup audit, and decision log to account for Android client expansion

**Archived:**  
- None

**Code Soup Risk:** Medium  
Medium because the project now has multiple client surfaces that can drift unless shared generation concepts stay explicit.

**Recommended Next Move:**  
Integrate Android through Firebase/Functions adapters behind domain repository contracts while preserving existing web/desktop verification.

## 12. Archive
