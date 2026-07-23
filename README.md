# DreamBees AI Art

**DreamBees** is an AI image generation platform consisting of a native desktop app, a Firebase cloud backend, and a Next.js web portal. Users describe what they want, pick a visual style, and receive generated images — stored locally on-device and optionally synced to the cloud.

---

## Repository Structure

```
DreamBeesv12/
├── src/                  # Electron renderer — React + Vite frontend
├── electron/             # Electron main process + SQLite database
├── functions/            # Firebase Cloud Functions (Node.js 24)
├── web/                  # Next.js marketing / download portal
├── public/               # Static assets
├── scripts/              # Build & release automation scripts
└── build/                # Electron builder assets (icons, etc.)
```

---

## Apps

### 🖥️ Desktop App (`src/` + `electron/`)

A native macOS desktop application built with **Electron 41** and **React 19**.

**Pages:**
- `/` — Model Feed: browse and select an AI style
- `/generate` — Generator: write a prompt, pick a shape, create an image
- `/profile` — User Profile: view history, credits, account, check for updates
- `/detail/:id` — Generation Detail: full-size image view
- `/auth` — Authentication

**Key frontend features:**
- **DreamTrail** — prompt refinement engine (`src/lib/dreamtrail.ts`): assisted, balanced, and creative modes
- **Generation flow** — multi-stage progress tracking with real-time previews (`src/lib/generationFlow.ts`)
- **Aspect ratio selector** — square, portrait, landscape, and widescreen presets
- **Local history** — all generations written to on-device SQLite, merged with Firestore history
- **Credit system** — "Zaps" currency; unlimited or numeric balance displayed live
- **Offline detection** — gracefully blocks generation and surfaces UI feedback when offline
- **Keyboard shortcuts** — `Cmd/Ctrl + Enter` to generate

**Electron main process (`electron/main.ts`):**
- Single-instance lock enforcement
- Local Google OAuth flow via a self-hosted HTTP bridge server on `127.0.0.1:3000` (Firebase popup → token handover → IPC)
- Custom URL protocol (`dreambees://`) for deep-link auth on macOS and Windows/Linux
- CSP and request header hardening for all Firebase/Google API traffic
- Navigation and new-window allowlist enforcement
- Persistent forensic log with 5 MB rotation (`~/Library/Application Support/DreamBees Lite/forensic.log`)
- 512 MB V8 heap cap

**Local database (`electron/database.ts`):**
- `better-sqlite3` with WAL journal mode, integrity checks on startup, and a rotation backup on every launch
- Tables: `generations`, `settings`, `migrations`
- Memory-safe pragmas: `mmap_size=0`, `cache_size=-2000`, `max_page_count=50000`

---

### ☁️ Cloud Functions (`functions/`)

Firebase Cloud Functions deployed on **Node.js 24** (`us-central1`).

**Handlers:**
| File | Purpose |
|---|---|
| `handlers/dreamtrail.ts` | Primary generation endpoint — routes prompts to AI providers |
| `handlers/generation.ts` | Generation lifecycle management |
| `handlers/billing.ts` | Stripe billing and credit management |
| `handlers/data.ts` | Firestore data access layer |
| `handlers/developer.ts` | Developer tooling and diagnostics |
| `handlers/diagnostic.ts` | System health and diagnostics |

**Workers:**
| File | Purpose |
|---|---|
| `workers/image.ts` | Image processing (sharp), upload to Backblaze B2 via AWS S3 SDK |
| `workers/queues.ts` | Task queue management |
| `workers/recovery.ts` | Stuck/failed generation recovery |
| `workers/cleanup.ts` | Stale data cleanup |

**Triggers:**
- `triggers/walletGuard.ts` — Firestore trigger that enforces credit limits

**AI Providers integrated:**
- Google Gemini (`@google/genai`, `@google-cloud/vertexai`)
- Anthropic Claude (`@anthropic-ai/sdk`)
- OpenRouter (`@openrouter/sdk`)
- Replicate (`replicate`)

**Supporting services:**
- **Storage**: Backblaze B2 (via AWS S3 SDK)
- **Payments**: Stripe
- **Real-time**: Pusher
- **Schema validation**: Zod
- **Token counting**: js-tiktoken

---

### 🌐 Web Portal (`web/`)

A **Next.js** static site (`/web`) deployed to Firebase Hosting (`dreambees-alchemist`). Serves as the marketing page and download portal for the desktop app. Built with `next export` into `web/out/`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 41 |
| Renderer | React 19, Vite 7, TypeScript 5 |
| Styling | Tailwind CSS v4, vanilla CSS |
| Routing | React Router v7 |
| Animations | Framer Motion |
| Local DB | better-sqlite3 (WAL mode) |
| Backend | Firebase Cloud Functions (Node.js 24) |
| Auth | Firebase Auth (Google OAuth) |
| Database | Firestore |
| Realtime DB | Firebase Realtime Database |
| Storage | Backblaze B2 (S3-compatible) |
| Payments | Stripe |
| Web portal | Next.js |
| Hosting | Firebase Hosting |
| Linting | ESLint 9, TypeScript ESLint |
| Testing | Vitest, @testing-library/react |

---

## Getting Started

### Prerequisites

- Node.js v20 or higher
- npm
- Firebase CLI (`npm install -g firebase-tools`)

### Desktop App — Development

```bash
# Install dependencies
npm install

# Start Vite + Electron dev server
npm run dev
```

### Desktop App — Production Build (macOS)

```bash
# Build renderer + package Electron app (unsigned)
npm run build:electron

# Build + notarize (requires Apple Developer credentials)
npm run build:electron:notarized
```

### Cloud Functions — Development

```bash
cd functions
npm install
npm run build       # TypeScript compile
npm run serve       # Start local emulator
npm run deploy      # Deploy to Firebase
```

### Web Portal — Development

```bash
cd web
npm install
npm run dev         # Next.js dev server
npm run build       # Static export to web/out/
```

### Full Firebase Deploy (hosting + functions)

```bash
npm run deploy:firebase
```

---

## Environment Variables

**Root (`.env`)** — consumed by Vite and the Electron main process:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_DREAMTRAIL_API_PROXY_TARGET=   # Optional: defaults to https://dreambees-alchemist.web.app
VITE_DREAMTRAIL_API_PROXY_PATH=     # Optional
```

**Functions (`functions/.env`)** — consumed by Cloud Functions:

```
B2_KEY_ID=
B2_APP_KEY=
B2_BUCKET=
B2_ENDPOINT=
B2_REGION=
B2_PUBLIC_URL=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
OPENROUTER_API_KEY=
OPENROUTER_DREAMTRAIL_MODEL=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
FIREBASE_DATABASE_URL=
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite + Electron dev mode |
| `npm run build` | Build renderer only |
| `npm run build:electron` | Full Electron build (no signing) |
| `npm run build:electron:notarized` | Full Electron build with notarization |
| `npm run build:web:release:firebase` | Build Next.js web portal |
| `npm run deploy:firebase` | Build everything and deploy to Firebase |
| `npm run prepare:electron-downloads` | Stage DMG/installer for Firebase Hosting |
| `npm run test` | Run Vitest unit tests |
| `npm run verify:electron` | TypeScript check + build + verify output |

---

## License

Licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) for details.

---

Built with ❤️ by the DreamBees team.
