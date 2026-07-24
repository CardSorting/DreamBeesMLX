# DreamBees MLX Model Context Protocol (MCP) Server

An official Model Context Protocol (MCP) Server enabling AI Agents (Claude Desktop, Antigravity, Cursor, Continue.dev) to control local Apple Silicon MLX image generation, query model statuses, run benchmark suites, and monitor Metal GPU telemetry.

## ✨ 100% Touchless Auto-Provisioning
- **Zero-Touch Dependency Installer**: If your Python environment is missing required packages (`mlx`, `mflux`, `diffusers`, `Pillow`), the server automatically detects and installs them silently in the background on demand.
- **Zero-Touch Configuration**: No manual terminal setup required for users or agents!

## Features & Tools

| Tool | Description |
|---|---|
| `dreambees_generate_image` | Execute local Apple Silicon Metal GPU image generation with FLUX.2 Klein & Sana 2.0 |
| `dreambees_list_models` | Query available MLX models, download status, and precision |
| `dreambees_run_benchmark` | Run 10-test benchmark suite or return cached benchmark report |
| `dreambees_get_metal_diagnostics` | Fetch Apple Silicon Metal VRAM active allocation, peak memory, and cache limits |

---

## 🚀 Touchless Setup Guide

### 1. Build the MCP Server (One-Time)
```bash
npm run build:mcp
```

### 2. Configure in Claude Desktop
Add the following entry to your `claude_desktop_config.json`:
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

### 3. Configure in Antigravity / Cursor / Continue.dev
In your MCP configuration file (`mcp_config.json`):
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

## 🛠️ Example Agent Prompting

Once connected, you can ask your AI Agent:
- *"Generate a 512x512 cyberpunk neon bee using FLUX.2 Klein model via DreamBees MLX MCP tool"*
- *"Run the DreamBees MLX benchmark suite and tell me the average it/s speed"*
- *"Check the active Apple Silicon Metal VRAM allocation"*
