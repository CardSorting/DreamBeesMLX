# Admin Generation API

Internal HTTP API for running **any DreamBees image model** without Firebase user authentication and **without Zap/credit deduction**. Intended for admin tooling, showcase scripts, model QA, and internal batch jobs.

This is a **separate Cloud Function** (`adminGeneration`) from the public `api` callable. It shares the same generation worker pipeline but writes queue documents with `isAdminBypass: true` and `cost: 0`.

---

## Base URLs

| Environment | URL |
|-------------|-----|
| **Cloud Function (direct)** | `https://us-central1-dreambees-alchemist.cloudfunctions.net/adminGeneration` |
| **Hosting rewrite** | `https://dreambeesai.com/admin/generation` |

All paths below are relative to either base URL.

---

## Authentication

No Firebase ID token or API key is required.

Protect requests with the `ADMIN_GENERATION_KEY` secret (set in Firebase Functions secrets / `.env` for emulators):

```http
X-Admin-Generation-Key: your_admin_generation_security_key
```

Alternatively, a Firebase Bearer token with `role: admin` custom claim is accepted.

| Header | Required | Description |
|--------|----------|-------------|
| `X-Admin-Generation-Key` | Yes* | Shared admin secret (`ADMIN_GENERATION_KEY`) |
| `Authorization` | Yes* | `Bearer <firebase-id-token>` with admin role |
| `Content-Type` | POST only | `application/json` |

\* One of the two auth methods is required.

---

## Available Models

All backend model IDs are supported:

| Model ID | Tier | Notes |
|----------|------|-------|
| `wai-illustrious` | PREMIUM | Hires fix enabled |
| `nova-3d-cg-xl` | PREMIUM | 3D/CGI quality tags |
| `z-image-turbo-a100` | FAST | 1–9 steps |
| `anima` | STANDARD | Anima family (Modal) |
| `hassaku` | STANDARD | Anima family |
| `kiwimix` | STANDARD | Anima family |
| `nova-furry-xl` | STANDARD | SDXL |
| `scyrax-pastel` | STANDARD | SDXL |
| `rin-anime-blend` | STANDARD | SDXL |
| `rin-anime-popcute` | STANDARD | SDXL |
| `crystal-cuteness` | STANDARD | SDXL |
| `veretoon-v10` | STANDARD | SDXL |

**Admin cost for all models: 0 Zaps** (credits are never debited).

---

## Endpoints

### `GET /models`

List all supported models with default generation parameters.

**Response `200`**

```json
{
  "success": true,
  "count": 13,
  "models": [
    {
      "id": "wai-illustrious",
      "tier": "PREMIUM",
      "retailCostZaps": 1,
      "adminCostZaps": 0,
      "defaultSteps": 30,
      "defaultCfg": 7,
      "defaultScheduler": "DPM++ 2M Karras",
      "hiresFix": true
    }
  ]
}
```

---

### `POST /generate`

Submit an image generation job. Returns immediately with a `requestId`; poll `/jobs/{requestId}` for completion.

**Request body**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `prompt` | string | Yes | — | Positive prompt (min 5 chars) |
| `modelId` | string | No | `wai-illustrious` | Any valid model ID |
| `negative_prompt` | string | No | `""` | Negative prompt |
| `aspectRatio` | string | No | `4:5` | `1:1`, `4:5`, `5:4`, `3:4`, `4:3`, `2:3`, `3:2`, `9:16`, `16:9` |
| `steps` | number | No | model default | 10–50 (Z-Image Turbo: 1–9) |
| `cfg` | number | No | model default | 1.0–20.0 |
| `scheduler` | string | No | model default | e.g. `DPM++ 2M Karras`, `FlowMatchEuler` |
| `seed` | number | No | `-1` | Random if `-1` |
| `idempotencyKey` | string | No | — | Stable key → stable `requestId` (`admin_{key}`) |

**Example**

```json
{
  "prompt": "1girl, solo, anime style, colorful lighting, masterpiece",
  "modelId": "anima",
  "aspectRatio": "1:1",
  "steps": 30,
  "cfg": 4.5,
  "scheduler": "FlowMatchEuler"
}
```

**Response `202`**

```json
{
  "success": true,
  "requestId": "admin_1719000000000_abc123",
  "modelId": "anima",
  "costZaps": 0,
  "creditBypass": true,
  "status": "queued",
  "pollUrl": "/jobs/admin_1719000000000_abc123"
}
```

**Error responses**

| Status | `error` | Meaning |
|--------|---------|---------|
| `400` | `invalid_request` | Bad prompt, unknown model, etc. |
| `403` | `forbidden` | Missing/invalid admin credentials |
| `429` | `rate_limited` | 30 requests / minute per principal+IP |
| `503` | `provider_degraded` | Model substrate circuit breaker open |
| `500` | `enqueue_failed` | Worker queue submission failed |

---

### `GET /jobs/{requestId}`

Poll generation status. Only jobs created via this admin API (`isAdminBypass: true`) are readable.

**Response `200` (in progress)**

```json
{
  "success": true,
  "id": "admin_1719000000000_abc123",
  "status": "processing",
  "stage": "generating",
  "progress": 45,
  "modelId": "anima",
  "imageUrl": null,
  "thumbnailUrl": null,
  "lqip": null,
  "error": null,
  "costZaps": 0,
  "creditBypass": true,
  "createdAt": "2025-06-22T12:00:00.000Z",
  "completedAt": null
}
```

**Response `200` (completed)**

```json
{
  "success": true,
  "id": "admin_1719000000000_abc123",
  "status": "completed",
  "stage": "done",
  "progress": 100,
  "modelId": "anima",
  "imageUrl": "https://cdn.dreambeesai.com/file/.../generated.webp",
  "thumbnailUrl": "https://cdn.dreambeesai.com/file/.../generated_thumb.webp",
  "lqip": "data:image/webp;base64,...",
  "error": null,
  "costZaps": 0,
  "creditBypass": true,
  "createdAt": "2025-06-22T12:00:00.000Z",
  "completedAt": "2025-06-22T12:01:30.000Z"
}
```

**Status values:** `queued` → `processing` → `completed` | `failed`

---

## cURL Examples

### List models

```bash
curl -s "https://us-central1-dreambees-alchemist.cloudfunctions.net/adminGeneration/models" \
  -H "X-Admin-Generation-Key: $ADMIN_GENERATION_KEY"
```

### Generate (Anima)

```bash
curl -s -X POST "https://us-central1-dreambees-alchemist.cloudfunctions.net/adminGeneration/generate" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Generation-Key: $ADMIN_GENERATION_KEY" \
  -d '{
    "prompt": "1girl, solo, anime illustration, soft lighting",
    "modelId": "anima",
    "aspectRatio": "1:1",
    "steps": 30
  }'
```

### Poll status

```bash
REQUEST_ID="admin_1719000000000_abc123"

curl -s "https://us-central1-dreambees-alchemist.cloudfunctions.net/adminGeneration/jobs/$REQUEST_ID" \
  -H "X-Admin-Generation-Key: $ADMIN_GENERATION_KEY"
```

### Via hosting rewrite

```bash
curl -s -X POST "https://dreambeesai.com/admin/generation/generate" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Generation-Key: $ADMIN_GENERATION_KEY" \
  -d '{"prompt":"neon cityscape at night","modelId":"z-image-turbo-a100","aspectRatio":"16:9","steps":8}'
```

---

## How It Differs From the Public API

| | Public `api` (callable) | Admin `adminGeneration` |
|--|---------------------------|-------------------------|
| Auth | Firebase login or `X-API-Key` | `X-Admin-Generation-Key` only |
| Credits | Zaps debited per model tier | **Never debited** (`cost: 0`) |
| Daily limits | Fair-use / anima caps apply | **Bypassed** |
| Abuse guards | User/IP rate limits | Admin rate limit only (30/min) |
| Queue marker | `isApiKeyRequest` optional | `isAdminBypass: true` |
| User ID | Real user UID | `_admin_generation` (system) |

---

## Deployment

1. Set the secret:

```bash
firebase functions:secrets:set ADMIN_GENERATION_KEY
```

2. Deploy the function:

```bash
firebase deploy --only functions:adminGeneration
```

3. (Optional) Deploy hosting rewrites so `/admin/generation/**` routes to the function:

```bash
firebase deploy --only hosting
```

---

## Security Notes

- Keep `ADMIN_GENERATION_KEY` out of client-side code and public repos.
- Jobs are tagged `isAdminBypass` and stored under the system user `_admin_generation`.
- Failed admin jobs do **not** trigger wallet refunds (no credits were charged).
- Non-admin queue jobs cannot be read via `/jobs/{id}` on this endpoint.
- Recommended: restrict Cloud Function ingress to trusted IPs or use only from internal tooling.

---

## Related Docs

- [ASYNC_API_DOCUMENTATION.md](./ASYNC_API_DOCUMENTATION.md) — Modal/Anima async inference API
- Public B2B API quickstart — `/account/api/docs` on the web app
