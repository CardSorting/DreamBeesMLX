# ❓ Frequently Asked Questions (FAQ) & Troubleshooting

Comprehensive answers to common questions about hardware compatibility, performance tuning, model weights, and troubleshooting (mirrored from Ollama & LM Studio FAQ standards).

---

##  Hardware & System Requirements

### What Macs are supported?
DreamBees MLX Studio supports all Apple Silicon Macs:
- **Apple M1, M1 Pro, M1 Max, M1 Ultra**
- **Apple M2, M2 Pro, M2 Max, M2 Ultra**
- **Apple M3, M3 Pro, M3 Max**
- **Apple M4, M4 Pro, M4 Max**

*Note: Intel-based Macs are not supported as MLX requires Apple Silicon Unified Memory Architecture (UMA).*

### How much RAM is required?
- **8 GB Unified Memory**: Runs **Sana 2.0 Sprint** (~0.8s speed) and **FLUX.2 Klein 4B**.
- **16 GB Unified Memory**: Recommended for **FLUX.2 Klein 9B**, **Wan2.1**, and **Stable Diffusion 3.5 Turbo**.
- **32 GB+ Unified Memory**: Supports simultaneous model caching and 4K upscaling.

---

## ⚡ Performance & Optimization

### Why does generation feel smooth without slowing down my Mac?
DreamBees MLX applies three system optimizations:
1. **Low Scheduling Priority (`nice -n 10`)**: Ensures macOS WindowServer and UI threads get 100% priority for 60 FPS mouse/desktop fluidity.
2. **Unified Memory Cache Limit (`3GB`)**: Hard-caps MLX Metal memory cache at 3GB using `mx.set_cache_limit()`.
3. **Post-Encoding Weight Eviction**: Automatically evicts T5 and CLIP text encoder weights immediately after prompt tokenization.

### How fast is TAESD latent preview streaming?
TAESD (Tiny AutoEncoder) neural matrix projection (`taesd_fast_latent_decode`) evaluates latent tensors in **<1ms per step pass** with **0% VAE GPU overhead**!

---

## 🤖 MCP Server & AI Agent Integration

### How do I connect Claude Desktop or Cursor?
Add the following snippet to your `claude_desktop_config.json` or `mcp_config.json`:

```json
{
  "mcpServers": {
    "dreambees-mlx": {
      "command": "node",
      "args": [
        "/Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/mcp_server/dist/index.js"
      ]
    }
  }
}
```

---

## 🔧 Troubleshooting Common Issues

### Issue: "Missing MLX dependencies" error on launch
- **Solution**: DreamBees MLX includes a **Touchless Environment Auto-Resolver** (`electron/environment_resolver.ts`). Click **Touchless Onboarding** in the sidebar to trigger 1-click self-repair.

### Issue: "Python 3 or pip not found"
- **Solution**: The Touchless Resolver automatically invokes `ensurepip` and constructs an isolated virtual environment at `~/Library/Application Support/DreamBees Lite/python_env/`.
