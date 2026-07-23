# Async Image Generation API (ZIT / Z-Image Base - RTX6000)

This service hosts the **Z-Image-Turbo (ZIT)** and **Z-Image Base** text-to-image models on Modal behind an asynchronous HTTP API. It utilizes high-performance NVIDIA RTX Pro 6000 GPUs. Clients submit a generation request, receive a `job_id`, then poll for status until the generated PNG is available. DreamBees should register these endpoints as backend model IDs `z-image-turbo-rtx6000` and `z-image-base-rtx6000`.

## Base URL

| Service | Tier | Base URL |
|---------|------|----------|
| **Z-Image-Turbo (ZIT)** | **RTX6000** | `https://mariecoderinc--zit-rtx6000-stable-fastapi-app.modal.run` |
| **Z-Image Base** | **RTX6000** | `https://mariecoderinc--zit-rtx6000-stable-base-fastapi-app.modal.run` |

There is no authentication layer in the current FastAPI app. CORS is open for browser clients.

---

## Model

| Model ID | Description |
|----------|-------------|
| `z-image-turbo-rtx6000` | Z-Image-Turbo (ZIT) uint4 SDNQ model (optimized for 1-9 steps) |
| `z-image-base-rtx6000` | Z-Image Base model (optimized for exactly 28 steps) |

---

## Behavior Notes

- Jobs are stored in Modal state and generated in the background by the Modal worker.
- Completed images are stored as `{job_id}.png` in the Modal volume and returned as raw PNG bytes.
- **Step Capping & Safety**:
  - **Turbo Model**: Steps > 9 are capped at 9 to prevent pipeline out-of-bounds crashes (`IndexError`). Recommended steps: 8.
  - **Base Model**: Steps > 28 are capped at 28 to prevent pipeline out-of-bounds crashes. Recommended steps: 28.
- Default render size is `1024x1024` unless custom dimensions or `aspect_ratio` is supplied.
- **Dynamic Negative Prompting**: Universal and subject-aware negative prompts (e.g. human face adjustments, outdoor vs. indoor styling constraints) are automatically generated and appended based on the positive prompt.

---

## DreamBees Backend Integration

Add Z-Image-Turbo and Z-Image Base as premium backends using the new RTX 6000 endpoints.

### Model conventions

In `functions/src/lib/modelConventions.ts`, add:

```ts
export const MODEL_IDS = {
    // ...
    ZIT_TURBO: 'z-image-turbo-rtx6000',
    ZIT_BASE: 'z-image-base-rtx6000'
} as const;

export const MODEL_ENDPOINTS = {
    // ...
    [MODEL_IDS.ZIT_TURBO]: 'https://mariecoderinc--zit-rtx6000-stable-fastapi-app.modal.run',
    [MODEL_IDS.ZIT_BASE]: 'https://mariecoderinc--zit-rtx6000-stable-base-fastapi-app.modal.run'
} as const;

export const MODEL_GENERATION_PARAMS = {
    // ...
    [MODEL_IDS.ZIT_TURBO]: {
        defaultSteps: 8,
        defaultCfg: 0.0,
        hiresFix: false
    },
    [MODEL_IDS.ZIT_BASE]: {
        defaultSteps: 28,
        defaultCfg: 5.0,
        hiresFix: false
    }
} as const;
```

Also add `z-image-turbo-rtx6000` and `z-image-base-rtx6000` to the `PREMIUM` list under `MODEL_CATEGORIES` since they are charged like higher-cost RTX6000 models.

### Firestore model seed

Add Firestore model documents in `functions/src/scripts/seed_models.cjs`:

```js
{
    id: 'z-image-turbo-rtx6000',
    name: 'Z-Image Turbo RTX 6000',
    description: 'Ultra-fast anime & general image generation powered by Z-Image-Turbo on RTX 6000.',
    type: 'Image',
    order: 19,
    isActive: true
},
{
    id: 'z-image-base-rtx6000',
    name: 'Z-Image Base RTX 6000',
    description: 'High-quality image generation powered by Z-Image Base on RTX 6000.',
    type: 'Image',
    order: 20,
    isActive: true
}
```

### Worker request body

The worker request body layout for the endpoints:

```json
{
  "prompt": "1girl, solo, anime style, colorful",
  "steps": 8,
  "width": 1024,
  "height": 1024,
  "aspect_ratio": "1:1",
  "negative_prompt": ""
}
```

For intended defaults, add explicit branches in the worker execution handler:

```ts
else if (modelId === 'z-image-turbo-rtx6000') {
    finalSteps = steps || 8;
    finalCfg = cfg || 0.0;
    hires_fix = false;
} else if (modelId === 'z-image-base-rtx6000') {
    finalSteps = steps || 28;
    finalCfg = cfg || 5.0;
    hires_fix = false;
}
```

### Contract sweep

If using `scripts/model-contract-sweep.mjs`, add:

```js
const ZIT_TURBO_ENDPOINT = 'https://mariecoderinc--zit-rtx6000-stable-fastapi-app.modal.run';
const ZIT_BASE_ENDPOINT = 'https://mariecoderinc--zit-rtx6000-stable-base-fastapi-app.modal.run';
```

Route the models to their respective endpoints and sweep using appropriate steps (`8` for Turbo, `28` for Base).

---

## 1. Submit Generation Job

**Endpoint:** `POST {BASE_URL}/generate`

Submits a background generation job and returns immediately.

### Request Body

```json
{
  "prompt": "1girl, solo, anime style, colorful",
  "steps": 8,
  "aspect_ratio": "1:1",
  "width": 1024,
  "height": 1024,
  "seed": null,
  "webhook_url": null,
  "negative_prompt": null
}
```

### Request Fields

| Field | Type | Required | Default | Constraints / Notes |
|-------|------|----------|---------|---------------------|
| `prompt` | string | Yes | none | Must be non-empty. |
| `steps` | integer or null | No | `8` (Turbo) / `28` (Base) | Minimum `1`, maximum `50`. Will be capped at `9` for Turbo and `28` for Base to prevent model crashes. |
| `width` | integer or null | No | `1024` | Minimum `64`, maximum `2048`. Snapped to multiples of 8. |
| `height` | integer or null | No | `1024` | Minimum `64`, maximum `2048`. Snapped to multiples of 8. |
| `aspect_ratio` | string or null | No | `null` | Allowed values: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `21:9`, `9:21`. Overrides width and height dimensions. |
| `seed` | integer or null | No | `null` | Manual random seed. |
| `webhook_url` | string or null | No | `null` | URL endpoint for completion callbacks. |
| `negative_prompt` | string or null | No | `null` | Optional extra negative keywords. |

### Success Response

Status: `202 Accepted`

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued"
}
```

### Validation Errors

FastAPI returns `422 Unprocessable Entity` for invalid requests, such as missing `prompt` or step values out of limits `[1, 50]`.

---

## 2. Poll Status / Get Result

**Endpoint:** `GET {BASE_URL}/result/{job_id}`

Poll this endpoint until the response is either a completed PNG image or a terminal failure JSON response.

### Queued / Generating Response

Status: `200 OK`

```json
{
  "status": "generating",
  "updated_at": 1705512345.123
}
```

`status` can be:

| Status | Meaning |
|--------|---------|
| `queued` | The request is accepted but GPU execution has not started. |
| `generating` | GPU pipeline execution is active. |
| `completed` | The job finished. The endpoint returns the raw PNG bytes. |
| `failed` | The job failed. The response includes `error` details. |

### Completed Response

Status: `200 OK`

Headers:

```text
Content-Type: image/png
```

Body: raw PNG bytes.

### Failed Response

Status: `200 OK`

```json
{
  "status": "failed",
  "error": "Resolution 2048x2048 exceeds maximum allowed pixels.",
  "updated_at": 1705512345.999
}
```

### Missing Job

Status: `404 Not Found`

Returned when `job_id` is unknown.

---

## 3. Health Endpoints

### Health check

**Endpoint:** `GET {BASE_URL}/health`

Returns:

```json
{
  "status": "healthy",
  "service": "z-image-turbo-rtx6000-async-api",
  "env": "production-2026",
  "torch": "2.11.0"
}
```

---

## Curl Example

```bash
BASE_URL="https://mariecoderinc--zit-rtx6000-stable-fastapi-app.modal.run"

curl -sS -X POST "$BASE_URL/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A futuristic city on Mars, anime style, cinematic lighting",
    "steps": 8,
    "aspect_ratio": "16:9"
  }'
```

Example polling command:

```bash
curl -i "$BASE_URL/result/<job_id>" --output result.png
```

---

## Python Example

```python
import time
from pathlib import Path
import requests

BASE_URL = "https://mariecoderinc--zit-rtx6000-stable-fastapi-app.modal.run"

def generate_image(prompt: str, output_path: str = "output.png") -> Path:
    submit_resp = requests.post(
        f"{BASE_URL}/generate",
        json={
            "prompt": prompt,
            "steps": 8,
            "aspect_ratio": "1:1",
        },
        timeout=180,
    )
    submit_resp.raise_for_status()
    job_id = submit_resp.json()["job_id"]
    print(f"Job submitted: {job_id}")

    while True:
        result_resp = requests.get(f"{BASE_URL}/result/{job_id}", timeout=30)
        result_resp.raise_for_status()

        content_type = result_resp.headers.get("content-type", "")
        if content_type.startswith("image/png"):
            path = Path(output_path)
            path.write_bytes(result_resp.content)
            print(f"Image saved to {path}")
            return path

        status_data = result_resp.json()
        status = status_data["status"]
        if status == "failed":
            raise RuntimeError(status_data.get("error", "generation failed"))

        print(f"Status: {status}")
        time.sleep(5)

if __name__ == "__main__":
    generate_image("A futuristic city on Mars, anime style, cinematic lighting")
```
