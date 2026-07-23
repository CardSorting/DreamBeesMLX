# Async Image Generation API (Anima - RTX6000)

This API provides high-throughput, fault-tolerant text-to-image generation for the **Anima** model family using an **Asynchronous Job Pattern**. It utilizes high-performance NVIDIA RTX-PRO-6000 GPUs on Modal. Clients submit a generation request, receive a `job_id`, and poll for status until the generated PNG is available.

---

## Base URL

| Tier | Description | Base URL |
|------|-------------|----------|
| **RTX6000** | High Performance, RTX 6000 Ada | `https://mariecoderinc--anima-inference-animainference-web.modal.run` |

---

## Available Models

The Anima RTX6000 endpoint hosts the following checkpoint configurations:

| Model ID | File / Checkpoint Name | Description | Category | Cost (Credits) |
|----------|------------------------|-------------|----------|----------------|
| `anima` | `circlestone-labs/Anima-Base-v1.0-Diffusers` | Anime illustration model powered by Anima Base v1.0 | Standard | 0.25 |
| `kiwimix` | `kiwimixAnima_v1.safetensors` | Kiwimix illustration checkpoint | Standard | 0.25 |
| `hassaku` | `hassakuAnima_v1Style.safetensors` | Hassaku checkpoint with clean lines and classical anime style | Standard | 0.25 |

---

## Behavior Notes & Model-Specific Optimizations

The Anima RTX6000 backend implements parameter tuning and dynamic loading behavior:

### 1. Dynamic Model Loading
Switching model targets (e.g. from `anima` to `kiwimix` or `hassaku`) triggers a dynamic weights reload in the worker container. This adds approximately **10-15 seconds of latency** to the first request. Subsequent requests for the same model are processed instantly.

### 2. Automated Defaults & Optimizations
The Anima engine automatically adjusts default parameters if not supplied:
- **Steps**: Defaults to `30`.
- **CFG Scale**: Defaults to `4.5`.
- **Scheduler**: Defaults to `FlowMatchEuler`.
- **Hires-Fix**: Automatically disabled (`false`) for the Anima pipeline.

### 3. Aspect Ratio & Dimensions
- Default render size is `1024x1024` unless both `width` and `height` are supplied.
- While `aspect_ratio` is accepted by the request schema for compatibility, it is not actively applied by the current Anima worker.

---

## DreamBees Backend Integration

Anima and its variations are registered as standard image generation models on the DreamBees backend.

### 1. Model Conventions
In `functions/src/lib/modelConventions.ts`, the Anima endpoint is defined as follows:

```ts
export const MODEL_IDS = {
    // ...
    ANIMA: 'anima',
    HASSAKU: 'hassaku',
    KIWIMIX: 'kiwimix'
} as const;

export const ANIMA_FAMILY_MODELS = [
    MODEL_IDS.ANIMA,
    MODEL_IDS.HASSAKU,
    MODEL_IDS.KIWIMIX
] as const;

export const MODEL_ENDPOINTS = {
    [MODEL_IDS.Z_IMAGE_TURBO]: 'https://mariecoderinc--zit-a100-stable-fastapi-app.modal.run',
    [MODEL_IDS.ANIMA]: 'https://mariecoderinc--anima-inference-animainference-web.modal.run'
} as const;

export function getModelEndpoint(modelId: string): string {
    const SDXL_ENDPOINT = 'https://mariecoderinc--sdxl-multi-model-rtx6000-omniinferencertx-dad1ae.modal.run';
    if (isAnimaFamilyModel(modelId)) {
        return MODEL_ENDPOINTS[MODEL_IDS.ANIMA];
    }
    // ...
}
```

### 2. Request Parameters Builder
In `functions/src/generation/substrate-request-builder.ts`, parameters are built for the Anima family models:

```ts
export const buildSubstrateRequestBody = (params: SubstrateRequestParams): Record<string, unknown> => {
    // ...
    } else if (isAnimaFamilyModel(modelId)) {
        finalSteps = steps || 30;
        finalCfg = cfg || 4.5;
        finalScheduler = scheduler || "FlowMatchEuler";
        hires_fix = false;
    }

    return {
        prompt: finalPrompt,
        model: modelId || "anima",
        negative_prompt,
        steps: finalSteps,
        cfg: finalCfg,
        width,
        height,
        scheduler: finalScheduler,
        hires_fix
    };
};
```

### 3. Firestore Model Seeding
Active Anima models are configured and seeded via `functions/src/scripts/seed_models.cjs`:

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

---

## 1. Submit Generation Job

**Endpoint:** `POST {BASE_URL}/generate`

Submits a background generation job and returns immediately with a `job_id`.

### Request Body
```json
{
  "prompt": "1girl, solo, anime style, colorful",
  "model": "anima",
  "negative_prompt": "low quality, blurry, watermark",
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
| `prompt` | string | Yes | none | Must be non-empty. Prompts are normalized and prefixed with quality tags. |
| `model` | string | No | `anima` | Supported values: `anima`, `kiwimix`, `hassaku`. |
| `negative_prompt` | string | No | `""` | Specify text/elements to avoid. |
| `steps` | integer | No | `30` | Number of denoising steps. Minimum `1`, maximum `100`. |
| `cfg` | number | No | `4.5` | Classifier-free guidance scale. Minimum `1.0`, maximum `20.0`. |
| `scheduler` | string | No | `FlowMatchEuler` | Sampling scheduler: `FlowMatchEuler`, `Euler a`, `DPM++ 2M Karras`. |
| `width` | integer or null | No | `1024` | Width of the image. Minimum `512`, maximum `2048`. Must be divisible by `8`. |
| `height` | integer or null | No | `1024` | Height of the image. Minimum `512`, maximum `2048`. Must be divisible by `8`. |
| `pag_scale` | number | No | `3.0` | Perturbed Attention Guidance scale. Minimum `0.0`, maximum `10.0`. |
| `sag_scale` | number | No | `0.75` | Self-Attention Guidance scale. Minimum `0.0`, maximum `10.0`. |
| `aspect_ratio` | string or null | No | `null` | Accepted for compatibility but not actively applied by the worker. |
| `seed` | integer or null | No | `null` | Accepted for compatibility but not actively applied by the worker. |
| `webhook_url` | string or null | No | `null` | Accepted for compatibility but not actively called by the worker. |

### Success Response
Status: `202 Accepted`
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued"
}
```

### Validation Errors
FastAPI returns `422 Unprocessable Entity` for invalid payloads (e.g. missing `prompt` or dimensions outside bounds).

---

## 2. Poll Status / Get Result

**Primary endpoint:** `GET {BASE_URL}/result/{job_id}`

**Alias endpoint:** `GET {BASE_URL}/jobs/{job_id}`

Poll either endpoint to check the job status or retrieve the completed image.

### Queued / Generating Response (JSON)
Returned with a status code of `200 OK` while the job is still processing:
```json
{
  "status": "generating",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "updated_at": 1705512345.123
}
```

Status transitions:
- `queued`: Request is accepted and waiting for a worker.
- `generating`: Worker is executing the prompt.
- `completed`: Generation succeeded (returns binary PNG bytes).
- `failed`: Job encountered an error.

### Success Response (Binary)
Returned once generation is completed successfully.
- **Status**: `200 OK`
- **Content-Type**: `image/png`
- **Body**: Raw PNG image bytes.

### Failed Response (JSON)
Returned when status is `failed`:
```json
{
  "status": "failed",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "error": "Resolution 2048x2048 exceeds maximum allowed pixels.",
  "updated_at": 1705512345.999
}
```

### Missing Job
Returned when the `job_id` is invalid or expired.
- **Status**: `404 Not Found`

---

## 3. Health and API Documentation

FastAPI exposes standard health check and Swagger documentation endpoints:

- **Status Page:** `GET {BASE_URL}/` (returns a minimal HTML page indicating the service is online)
- **Ping:** `GET {BASE_URL}/ping` (returns simple text response `pong`)
- **Swagger UI:** `GET {BASE_URL}/docs`
- **OpenAPI Schema:** `GET {BASE_URL}/openapi.json`

---

## Curl Example

### 1. Submit Job
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

### 2. Poll Result
```bash
curl -i "$BASE_URL/result/550e8400-e29b-41d4-a716-446655440000"
```
If the header `Content-Type: image/png` is returned, output the stream to a `.png` file.

---

## Python Example (Client)

```python
import time
from pathlib import Path
import requests

BASE_URL = "https://mariecoderinc--anima-inference-animainference-web.modal.run"

def generate_image(prompt: str, output_path: str = "output.png") -> Path:
    # 1. Submit Generation Job
    submit_resp = requests.post(
        f"{BASE_URL}/generate",
        json={
            "prompt": prompt,
            "model": "anima",
            "steps": 30,
            "width": 1024,
            "height": 1024
        },
        timeout=180
    )
    submit_resp.raise_for_status()
    job_id = submit_resp.json()["job_id"]
    print(f"Job submitted successfully. Job ID: {job_id}")

    # 2. Poll result endpoint
    while True:
        result_resp = requests.get(f"{BASE_URL}/result/{job_id}", timeout=30)
        result_resp.raise_for_status()

        content_type = result_resp.headers.get("content-type", "")
        
        # Check if the result is binary image
        if content_type.startswith("image/png"):
            path = Path(output_path)
            path.write_bytes(result_resp.content)
            print(f"Success! Image saved to {path.resolve()}")
            return path

        # Otherwise parse JSON status
        status_data = result_resp.json()
        status = status_data["status"]
        
        if status == "failed":
            raise RuntimeError(f"Generation failed: {status_data.get('error', 'unknown error')}")
        
        print(f"Current Job Status: {status}...")
        time.sleep(5)

if __name__ == "__main__":
    generate_image("A futuristic city on Mars, anime style, cinematic lighting")
```
