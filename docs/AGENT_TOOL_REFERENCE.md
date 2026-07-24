# 🛠️ MCP Tool API Reference for AI Agents

Formal JSON Schema definitions, input parameter specifications, and response payloads for all Model Context Protocol (MCP) tools provided by the **DreamBees MLX MCP Server**.

---

## 1. `dreambees_generate_image`

Execute local Apple Silicon Metal GPU image generation with real-time TAESD preview and step telemetry.

### Input Schema
```json
{
  "type": "object",
  "properties": {
    "prompt": {
      "type": "string",
      "description": "The textual prompt description for the image to generate"
    },
    "model_id": {
      "type": "string",
      "default": "flux2-klein-4b",
      "description": "MLX model ID (e.g. flux2-klein-4b, sana-2-sprint, wan2.1-1.3b)"
    },
    "width": {
      "type": "integer",
      "default": 512,
      "description": "Image width in pixels"
    },
    "height": {
      "type": "integer",
      "default": 512,
      "description": "Image height in pixels"
    },
    "steps": {
      "type": "integer",
      "default": 2,
      "description": "Number of inference diffusion steps"
    },
    "seed": {
      "type": "integer",
      "description": "Optional entropy seed integer"
    }
  },
  "required": ["prompt"]
}
```

### Output Response Example
```json
{
  "status": "success",
  "output_path": "/tmp/dreambees_mcp_1721815000000_42.png",
  "duration_ms": 15847,
  "model_id": "flux2-klein-4b",
  "seed": 42,
  "width": 512,
  "height": 512,
  "metal_accelerated": true,
  "preview_data_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

---

## 2. `dreambees_list_models`

List available Apple Silicon MLX models, readiness status, precision, and VRAM requirements.

### Input Schema
```json
{ "type": "object", "properties": {} }
```

### Output Response Example
```json
{
  "models": [
    {
      "id": "flux2-klein-4b",
      "name": "FLUX.2 Klein 4B",
      "provider": "Black Forest Labs / MLX",
      "precision": "4-bit Quantized",
      "status": "ready",
      "vram_required_gb": 3.1
    },
    {
      "id": "sana-2-sprint",
      "name": "Sana 2.0 Sprint",
      "provider": "SceneWorks / MLX",
      "precision": "4-bit Quantized",
      "status": "ready",
      "vram_required_gb": 2.8
    }
  ]
}
```

---

## 3. `dreambees_run_benchmark`

Run the 10-test MLX Metal benchmark suite or fetch recent benchmark results report.

### Input Schema
```json
{
  "type": "object",
  "properties": {
    "run_fresh": {
      "type": "boolean",
      "default": false,
      "description": "Run fresh benchmark suite or return cached report"
    }
  }
}
```

---

## 4. `dreambees_get_metal_diagnostics`

Fetch Apple Silicon Metal GPU hardware diagnostics, active VRAM, peak memory, and cache limits.

### Input Schema
```json
{ "type": "object", "properties": {} }
```

### Output Response Example
```json
{
  "status": "ready",
  "diagnostics": {
    "mlx_available": true,
    "metal_available": true,
    "device": "metal",
    "backend": "apple_mlx",
    "active_vram_mb": 2087,
    "peak_vram_mb": 3569,
    "cache_vram_mb": 3047
  }
}
```
