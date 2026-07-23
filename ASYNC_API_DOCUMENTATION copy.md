# Async Image Generation API (RTX6000)

This API provides high-throughput, fault-tolerant text-to-image generation using an **Asynchronous Job Pattern**. It utilizes high-performance NVIDIA RTX-PRO-6000 GPUs on Modal. Clients submit a generation request, receive a `job_id`, and poll for status until the generated PNG is available.

---

## Base URL

| Tier | Description | Base URL |
|------|-------------|----------|
| **RTX6000** | High Performance, RTX 6000 Ada | `https://mariecoderinc--sdxl-multi-model-rtx6000-omniinferencertx-dad1ae.modal.run` |

---

## Available Models

The RTX6000 endpoint hosts the following SDXL and Illustrious checkpoints:

| Model ID | File / Checkpoint Name | Description | Category | Cost (Credits) |
|----------|------------------------|-------------|----------|----------------|
| `wai-illustrious` | `waiIllustriousSDXL_v170.safetensors` | High-quality illustrations with custom High-Res Fix | Premium | 1.00 |
| `nova-3d-cg-xl` | `nova3DCGXL_ilV80.safetensors` | Optimized for 3D/CGI art with automatic quality tags | Premium | 1.00 |
| `nova-furry-xl` | `novaFurryXL_ilV140.safetensors` | Optimized for furry art and anthropomorphic characters | Standard | 0.25 |
| `scyrax-pastel` | `scyraxPastelCore_v121.safetensors` | Soft, pastel color palettes and dreamy atmospheres | Standard | 0.25 |
| `rin-anime-blend` | `rinAnimeBlendArblend_v30.safetensors` | A smooth blend of popular anime models | Standard | 0.25 |
| `rin-anime-popcute` | `rinAnimepopcute_v30.safetensors` | Bright, vibrant, and cute anime style with popping colors | Standard | 0.25 |
| `crystal-cuteness` | `CrystalCuteness.safetensors` | Adorable and sparkling aesthetics for high-quality cute art | Standard | 0.25 |
| `veretoon-v10` | `veretoon_v10.safetensors` | Vibrant toon-style illustrations with clean outlines | Standard | 0.25 |
| `perfect-illustrious`* | `perfectrsbmixIllustrious_definitivelambda.safetensors` | High-quality Illustrious mix (unseeded) | Standard | 0.25 |
| `gray-color`* | `graycolor_v17.safetensors` | Gray-color styling checkpoint (unseeded) | Standard | 0.25 |
| `animij-v7`* | `animij_v7.safetensors` | Animij checkpoint (unseeded) | Standard | 0.25 |
| `swijtspot-no1`* | `swijtspot_no1.safetensors` | Swijtspot checkpoint (unseeded) | Standard | 0.25 |
| `chenkin-noob-xl`* | `ChenkinNoob-XL-V0.5.safetensors` | Optimized FlowMatchEuler model (unseeded) | Standard | 0.25 |

*\*Note: Models marked with an asterisk are available on the backend endpoint but are currently unseeded in Firestore and not exposed on the front-end user interface.*

---

## Behavior Notes & Model-Specific Optimizations

The RTX6000 backend implements automatic parameter tuning and prompt processing for specific models to ensure optimal quality:

### 1. Automated Defaults & Optimizations
- **`wai-illustrious`**:
  - **Hires-Fix**: Automatically enabled (`true`) to improve details and textures.
- **`chenkin-noob-xl`**:
  - **Scheduler**: Automatically optimized for `FlowMatchEuler`.
  - **CFG Scale**: Tuned to `4.0`.
  - **Steps**: Defaults to `25`.
  - **Hires-Fix**: Automatically disabled (`false`) since its RF architecture provides sufficient native detail.
- **`nova-3d-cg-xl`**:
  - **Hires-Fix**: Automatically enabled (`true`) for premium 3D/CGI detail.
  - **Prompt Enhancers**: Automatically appends quality tags: `, 3d render, cgi, masterwork, ultra detailed, cinematic lighting`.

### 2. Aspect Ratio & Dimensions
- Default render size is `1024x1024` unless both `width` and `height` are supplied or overridden by `aspect_ratio`.
- If `aspect_ratio` is supplied, it overrides `width` and `height` with preset proportions optimized for SDXL (e.g. `16:9` -> `1344x768`, `1:1` -> `1024x1024`).

---

## DreamBees Backend Integration

The RTX6000 API is integrated into the DreamBees backend via the multi-model SDXL endpoint handler.

### 1. Model Conventions
In `functions/src/lib/modelConventions.ts`, the `SDXL_ENDPOINT` should point to the RTX6000 backend:

```ts
export function getModelEndpoint(modelId: string): string {
    const SDXL_ENDPOINT = 'https://mariecoderinc--sdxl-multi-model-rtx6000-omniinferencertx-dad1ae.modal.run';
    if (isAnimaFamilyModel(modelId)) {
        return MODEL_ENDPOINTS[MODEL_IDS.ANIMA];
    }
    if (modelId === MODEL_IDS.FLUX_2_DEV || modelId === MODEL_IDS.FLUX_2_KLEIN) {
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'your_cloudflare_account_id';
        return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/${modelId}`;
    }
    return MODEL_ENDPOINTS[modelId as keyof typeof MODEL_ENDPOINTS] || SDXL_ENDPOINT;
}
```

Ensure active models are defined in `MODEL_IDS` and mapped to their appropriate cost tiers under `MODEL_CATEGORIES` (e.g. `PREMIUM` or `STANDARD`).

### 2. Request Parameters Builder
In `functions/src/generation/substrate-request-builder.ts`, the client builds the request payload for the RTX6000 endpoint as follows:

```ts
export const buildSubstrateRequestBody = (params: SubstrateRequestParams): Record<string, unknown> => {
    const {
        modelId,
        prompt,
        negative_prompt = "",
        steps = 30,
        cfg = 7,
        scheduler = "DPM++ 2M Karras",
        aspectRatio,
        width,
        height
    } = params;

    let finalSteps = steps || 30;
    let finalCfg = cfg || 7;
    let finalScheduler = scheduler || "DPM++ 2M Karras";
    let hires_fix = false;
    let finalPrompt = prompt;

    if (modelId === "wai-illustrious") {
        hires_fix = true;
    } else if (modelId === "nova-3d-cg-xl") {
        hires_fix = true;
        const qualityTags = ", 3d render, cgi, masterwork, ultra detailed, cinematic lighting";
        if (!finalPrompt.toLowerCase().includes("3d render")) {
            finalPrompt = `${finalPrompt}${qualityTags}`;
        }
    }

    return {
        prompt: finalPrompt,
        model: modelId || "wai-illustrious",
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
Models are seeded using `functions/src/scripts/seed_models.cjs`. Ensure active RTX6000 models are set to `isActive: true` (e.g. `wai-illustrious`, `nova-3d-cg-xl`, etc.).

---

## 1. Submit Generation Job

**Endpoint:** `POST {BASE_URL}/generate`

Submits a background generation job and returns immediately with a `job_id`.

### Request Body
```json
{
  "prompt": "1girl, solo, anime style, colorful",
  "model": "wai-illustrious",
  "negative_prompt": "low quality, blurry, watermark",
  "steps": 30,
  "cfg": 7.0,
  "scheduler": "DPM++ 2M Karras",
  "width": 1024,
  "height": 1024,
  "aspect_ratio": "16:9",
  "seed": 12345,
  "webhook_url": "https://your-api.com/hooks/image-done"
}
```

### Request Fields

| Field | Type | Required | Default | Constraints / Notes |
|-------|------|----------|---------|---------------------|
| `prompt` | string | Yes | none | Must be non-empty. Supports descriptive tags. |
| `model` | string | No | `wai-illustrious` | Supported values: `nova-furry-xl`, `perfect-illustrious`, `gray-color`, `scyrax-pastel`, `animij-v7`, `swijtspot-no1`, `wai-illustrious`, `rin-anime-blend`, `rin-anime-popcute`, `crystal-cuteness`, `veretoon-v10`, `chenkin-noob-xl`, `nova-3d-cg-xl`. |
| `negative_prompt` | string | No | `""` | Specify text/elements to avoid in the generated image. |
| `steps` | integer | No | `30` | Number of denoising steps. Minimum `1`, maximum `100`. |
| `cfg` | number | No | `7.0` | Classifier-free guidance scale. Minimum `1.0`, maximum `20.0`. |
| `scheduler` | string | No | `DPM++ 2M Karras` | Sampling scheduler. E.g. `DPM++ 2M Karras`, `Euler a`, `FlowMatchEuler`. |
| `width` | integer or null | No | `1024` | Width of the image. Minimum `512`, maximum `2048`. Must be divisible by `8`. |
| `height` | integer or null | No | `1024` | Height of the image. Minimum `512`, maximum `2048`. Must be divisible by `8`. |
| `aspect_ratio` | string or null | No | `null` | Overrides width/height with optimized presets: `1:1`, `16:9`, `9:16`, `21:9`, `9:21`, `3:2`, `2:3`, `4:5`, `5:4`. |
| `seed` | integer or null | No | `null` | Integer for deterministic reproduction. |
| `webhook_url` | string or null | No | `null` | Endpoint URL to call when the job completes or fails. |

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

## 3. Webhooks (Optional)

If a `webhook_url` is provided in the submission request, the backend will POST a status payload to that URL upon completion.

### Success Webhook Payload
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed"
}
```

### Failure Webhook Payload
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error": "Out of Memory (OOM) during high-res pass"
}
```

---

## 4. Health and API Documentation

FastAPI exposes standard health check and Swagger documentation endpoints:

- **Status Page:** `GET {BASE_URL}/` (returns a minimal HTML page indicating the service is online)
- **Ping:** `GET {BASE_URL}/ping` (returns simple text response `pong`)
- **Swagger UI:** `GET {BASE_URL}/docs`
- **OpenAPI Schema:** `GET {BASE_URL}/openapi.json`

---

## Curl Example

### 1. Submit Job
```bash
BASE_URL="https://mariecoderinc--sdxl-multi-model-rtx6000-omniinferencertx-dad1ae.modal.run"

curl -sS -X POST "$BASE_URL/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A futuristic city on Mars, cinematic lighting",
    "model": "wai-illustrious",
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

BASE_URL = "https://mariecoderinc--sdxl-multi-model-rtx6000-omniinferencertx-dad1ae.modal.run"

def generate_image(prompt: str, output_path: str = "output.png") -> Path:
    # 1. Submit Generation Job
    submit_resp = requests.post(
        f"{BASE_URL}/generate",
        json={
            "prompt": prompt,
            "model": "wai-illustrious",
            "aspect_ratio": "16:9",
            "steps": 30
        },
        timeout=120
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
        time.sleep(3)

if __name__ == "__main__":
    generate_image("A futuristic city on Mars, cinematic lighting")
```
