# Async Image Generation API (Anima)

This service hosts the **Anima** text-to-image model on Modal behind an asynchronous HTTP API. Clients submit a generation request, receive a `job_id`, then poll for status until the generated PNG is available. DreamBees should register this endpoint as backend model ID `anima`.

## Base URL

| Tier | Description | Base URL |
|------|-------------|----------|
| **A100** | High performance GPU endpoint | `https://mariecoderinc--anima-inference-animainference-web.modal.run` |

There is no authentication layer in the current FastAPI app. CORS is open for browser clients.

---

## Model

| Model ID | Description |
|----------|-------------|
| `anima` | Anima Base v1.0 Diffusers (`circlestone-labs/Anima-Base-v1.0-Diffusers`) |
| `kiwimix` | Kiwimix checkpoint loaded from `kiwimixAnima_v1.safetensors` |
| `hassaku` | Hassaku checkpoint loaded from `hassakuAnima_v1Style.safetensors` |

The service supports multiple models. `model` can be `"anima"`, `"kiwimix"`, or `"hassaku"`. If omitted, it defaults to `"anima"`.

---

## Behavior Notes

- Jobs are stored in Modal state and generated in the background by the `AnimaInference` worker.
- Completed images are stored as `{job_id}.png` in the Modal volume and returned as raw PNG bytes.
- **Dynamic Model Loading**: Switching model targets (e.g. from `anima` to `kiwimix`) will trigger a dynamic weights reload in the worker, adding approximately 10-15 seconds of latency to the first request. Subsequent requests for the same model are processed instantly.
- Default render size is `1024x1024` unless `width` and `height` are both supplied.
- `aspect_ratio`, `seed`, and `webhook_url` are accepted by the request schema for compatibility, but the current worker does not apply them.
- `cfg`, `scheduler`, `pag_scale`, and `sag_scale` are accepted by the schema. The current Anima pipeline call uses `prompt`, `steps`, `width`, and `height`; scheduler/guidance values are retained for API compatibility.
- Short or minimal prompts may be expanded automatically before generation. Prompts are normalized and prefixed with Anima quality tags.

---

## DreamBees Backend Integration

Add Anima as its own backend model instead of letting it fall through to the shared SDXL endpoint.

### Model conventions

In `functions/src/lib/modelConventions.ts`, add:

```ts
export const MODEL_IDS = {
    // ...
    ANIMA: 'anima'
} as const;

export const MODEL_ENDPOINTS = {
    // ...
    [MODEL_IDS.ANIMA]: 'https://mariecoderinc--anima-inference-animainference-web.modal.run'
} as const;

export const MODEL_GENERATION_PARAMS = {
    // ...
    [MODEL_IDS.ANIMA]: {
        defaultSteps: 30,
        defaultScheduler: 'FlowMatchEuler',
        defaultCfg: 4.5,
        hiresFix: false
    }
} as const;
```

Also add `anima` to the appropriate `MODEL_CATEGORIES` list. If it should use normal image-generation pricing, add it to `STANDARD`; if it should be charged like the higher-cost A100 models, add it to `PREMIUM`.

### Firestore model seed

Add a Firestore model document in `functions/src/scripts/seed_models.cjs`:

```js
{
    id: 'anima',
    name: 'Anima',
    description: 'Anime illustration model powered by circlestone-labs/Anima Base v1.0.',
    type: 'Image',
    order: 18,
    isActive: true
}
```

### Worker request body

The existing non-Z image request body is compatible with Anima once `getModelEndpoint("anima")` routes to the Anima URL:

```json
{
  "prompt": "1girl, solo, anime style, colorful",
  "model": "anima",
  "negative_prompt": "",
  "steps": 30,
  "cfg": 4.5,
  "width": 1024,
  "height": 1024,
  "scheduler": "FlowMatchEuler"
}
```

The Anima endpoint accepts the extra compatibility fields already sent by the DreamBees worker, including `negative_prompt`, `cfg`, and `scheduler`. `hires_fix` is not part of the documented Anima schema, so leave it false for `anima`.

For intended Anima defaults, add an explicit branch near the existing `wai-illustrious`, `z-image-turbo-a100`, and `nova-3d-cg-xl` model handling:

```ts
else if (modelId === 'anima') {
    finalSteps = steps || 30;
    finalCfg = cfg || 4.5;
    finalScheduler = scheduler || 'FlowMatchEuler';
    hires_fix = false;
}
```

### Contract sweep

If using `scripts/model-contract-sweep.mjs`, add:

```js
const ANIMA_ENDPOINT = 'https://mariecoderinc--anima-inference-animainference-web.modal.run';
```

Route `anima` to `ANIMA_ENDPOINT`, include `anima` in the default model list, and use this body shape:

```js
{
  prompt: `backend contract test for anima, small golden bee icon on a clean studio table`,
  negative_prompt: 'low quality, blurry, watermark',
  model: 'anima',
  steps: 30,
  cfg: 4.5,
  scheduler: 'FlowMatchEuler',
  width: 1024,
  height: 1024
}
```

---

## 1. Submit Generation Job

**Endpoint:** `POST {BASE_URL}/generate`

Submits a background generation job and returns immediately.

### Request Body

```json
{
  "prompt": "1girl, solo, anime style, colorful",
  "model": "anima",
  "negative_prompt": "",
  "steps": 30,
  "cfg": 4.5,
  "scheduler": "FlowMatchEuler",
  "width": 1024,
  "height": 1024,
  "pag_scale": 3.0,
  "sag_scale": 0.75,
  "aspect_ratio": null,
  "seed": null,
  "webhook_url": null
}
```

### Request Fields

| Field | Type | Required | Default | Constraints / Notes |
|-------|------|----------|---------|---------------------|
| `prompt` | string | Yes | none | Must be non-empty. |
| `model` | string | No | `anima` | Supported values: `anima`, `kiwimix`, `hassaku`. Controls which model checkpoint is loaded for inference. |
| `negative_prompt` | string | No | `""` | Used by prompt preprocessing, though the current Anima pipeline does not pass a negative prompt directly. |
| `steps` | integer | No | `30` | Minimum `1`, maximum `100`. |
| `cfg` | number | No | `4.5` | Minimum `1.0`, maximum `20.0`; compatibility field. |
| `scheduler` | string | No | `FlowMatchEuler` | One of `Euler a`, `DPM++ 2M Karras`, `FlowMatchEuler`; compatibility field. |
| `width` | integer or null | No | `1024` | Minimum `512`, maximum `2048`, must be divisible by `8` when supplied. |
| `height` | integer or null | No | `1024` | Minimum `512`, maximum `2048`, must be divisible by `8` when supplied. |
| `pag_scale` | number | No | `3.0` | Minimum `0.0`, maximum `10.0`; compatibility field. |
| `sag_scale` | number | No | `0.75` | Minimum `0.0`, maximum `10.0`; compatibility field. |
| `aspect_ratio` | string or null | No | `null` | Accepted values: `1:1`, `16:9`, `9:16`, `21:9`, `9:21`, `3:2`, `2:3`, `4:5`, `5:4`. Accepted but not currently applied. |
| `seed` | integer or null | No | `null` | Accepted but not currently applied. |
| `webhook_url` | string or null | No | `null` | Accepted but not currently called by the worker. |

### Success Response

Status: `202 Accepted`

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued"
}
```

### Validation Errors

FastAPI returns `422 Unprocessable Entity` for invalid request bodies, such as missing `prompt`, unsupported `model`, invalid `scheduler`, or dimensions outside the allowed range.

---

## 2. Poll Status / Get Result

**Primary endpoint:** `GET {BASE_URL}/result/{job_id}`

**Alias:** `GET {BASE_URL}/jobs/{job_id}`

Poll this endpoint until the response is either a completed PNG image or a terminal failure JSON response.

### Queued / Generating Response

Status: `200 OK`

```json
{
  "status": "generating",
  "updated_at": 1705512345.123,
  "job_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

`status` can be:

| Status | Meaning |
|--------|---------|
| `queued` | The request has been accepted but the worker has not started generation. |
| `generating` | The worker is generating the image. |
| `completed` | The job finished. The endpoint normally returns PNG bytes for this state. |
| `failed` | The job failed. The JSON response includes `error`. |

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
  "updated_at": 1705512345.999,
  "job_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Missing Job

Status: `404 Not Found`

Returned when `job_id` is unknown.

---

## 3. Health Endpoints

### Status Page

**Endpoint:** `GET {BASE_URL}/`

Returns a minimal HTML page:

```html
<html><body><h1>Anima A100 Service</h1><p>Status: Online</p></body></html>
```

### Ping

**Endpoint:** `GET {BASE_URL}/ping`

Returns:

```text
pong
```

### Swagger / OpenAPI

FastAPI exposes generated API documentation at:

- `{BASE_URL}/docs`
- `{BASE_URL}/openapi.json`

---

## Curl Example

```bash
BASE_URL="https://mariecoderinc--anima-inference-animainference-web.modal.run"

curl -sS -X POST "$BASE_URL/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A futuristic city on Mars, anime style, cinematic lighting",
    "model": "anima",
    "steps": 30,
    "width": 1024,
    "height": 1024
  }'
```

Example polling command:

```bash
curl -i "$BASE_URL/result/<job_id>"
```

If the response has `Content-Type: image/png`, save the body to a `.png` file.

---

## Python Example

```python
import time
from pathlib import Path

import requests

BASE_URL = "https://mariecoderinc--anima-inference-animainference-web.modal.run"


def generate_image(prompt: str, output_path: str = "output.png") -> Path:
    submit_resp = requests.post(
        f"{BASE_URL}/generate",
        json={
            "prompt": prompt,
            "model": "anima",
            "steps": 30,
            "width": 1024,
            "height": 1024,
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
