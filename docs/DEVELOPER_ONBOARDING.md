# 👨‍💻 Developer & Contributor Onboarding Guide

Welcome to the **DreamBees MLX Studio** technical contributor onboarding guide. This document covers system architecture, IPC protocol contracts, environment resolution mechanics, and development workflows.

---

## 🏗️ Architectural Overview

The application is structured into four main layers:

```
+-------------------------------------------------------------------+
|                        REACT RENDERER (Vite)                       |
|           React 19 • Tailwind CSS • Framer Motion • Lucide         |
+-------------------------------------------------------------------+
                                  │
                          Electron IPC Bridge
                                  │
+-------------------------------------------------------------------+
|                       ELECTRON MAIN PROCESS                        |
|   environment_resolver.ts • sidecar_supervisor.ts • database.ts   |
+-------------------------------------------------------------------+
                                  │
                        stdio JSON-RPC IPC
                                  │
+-------------------------------------------------------------------+
|                     PYTHON MLX SIDECAR DAEMON                     |
|           mlx_image_daemon.py • mflux • TAESD • Metal Core         |
+-------------------------------------------------------------------+
```

1. **Frontend UI (React 19 + Vite)**:
   - Located at `src/`. Renders the Studio Canvas, Model Hub, Gallery View, and Hardware Diagnostic Widget.
2. **Electron Main Process**:
   - Located at `electron/`. Manages window lifecycle, isolated SQLite database (`better-sqlite3`), and process supervision (`sidecar_supervisor.ts`).
3. **Touchless Environment Resolver (`electron/environment_resolver.ts`)**:
   - Probes system Python binaries and constructs isolated `python_env` virtualenvs automatically on demand.
4. **Python MLX Daemon (`electron/mlx/mlx_image_daemon.py`)**:
   - Runs native Apple Silicon Metal GPU inference, computes flow-matching velocity ($v_t$) and SNR telemetry, and streams sub-millisecond TAESD latent preview frames.

---

## 🚀 Setting Up Your Local Development Environment

### Prerequisites
- macOS on Apple Silicon (M1/M2/M3/M4)
- Node.js >= 20
- Python 3 >= 3.10

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/DreamBees/DreamBeesMLX.git
cd DreamBeesMLX
npm install
```

### 2. Start Application in Dev Mode
```bash
npm run dev
```

### 3. Verify TypeScript Types
```bash
./node_modules/.bin/tsc --noEmit
```

### 4. Build MCP Server for AI Agents
```bash
npm run build:mcp
```

### 5. Run Automated Benchmark Suite
```bash
python3 tests/benchmarks/run_benchmarks.py
```

---

## 🛰️ IPC Protocol Contracts

### Stdio JSON-RPC Messages (Sidecar Daemon <-> Electron)

#### Request Payload:
```json
{
  "action": "generate",
  "payload": {
    "prompt": "Cyberpunk neon bee hovering over futuristic Tokyo night",
    "model_id": "flux2-klein-4b",
    "width": 512,
    "height": 512,
    "steps": 2,
    "guidance_scale": 1.0,
    "seed": 42,
    "output_path": "/tmp/test.png"
  }
}
```

#### Response Stream (Step Telemetry):
```json
{
  "type": "progress",
  "payload": {
    "step": 1,
    "total_steps": 2,
    "progress_pct": 50,
    "elapsed_ms": 3074,
    "step_ms": 97,
    "its_per_sec": 10.31,
    "sigma_level": 0.5,
    "flow_velocity": 0.5,
    "snr_db": 0.0,
    "vram": { "active_mb": 2087, "peak_mb": 3569, "cache_mb": 3047 }
  }
}
```
