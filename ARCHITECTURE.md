# 🏛️ DreamBees MLX System Architecture

This document details the internal system architecture, IPC sequence flows, process supervision, and memory management algorithms in **DreamBees MLX Studio** (mirrored from architectural documentation in projects like Ollama, vLLM, and Electron).

---

## 📐 System High-Level Topology

```mermaid
graph TD
    subgraph UI ["User Interface Layer"]
        Canvas[StudioCanvas.tsx]
        Wizard[TouchlessInstallerWizard.tsx]
        Hub[ModelHub.tsx]
        Gallery[GalleryView.tsx]
    end

    subgraph Main ["Electron Main Process"]
        Resolver[TouchlessEnvironmentResolver]
        Supervisor[SidecarSupervisor]
        DB[(better-sqlite3 Database)]
    end

    subgraph Daemon ["Python Sidecar Process"]
        DaemonScript[mlx_image_daemon.py]
        MLXCore[mlx.core / mflux]
        TAESD[TAESD Latent Decoder]
        MetalGPU[Apple Silicon Metal GPU]
    end

    subgraph MCP ["AI Agent Protocol"]
        MCPServer[mcp_server/dist/index.js]
        Claude[Claude Desktop / Antigravity / Cursor]
    end

    Canvas <-->|IPC Bridge| Main
    Wizard <-->|IPC Bridge| Main
    Claude <-->|Stdio JSON-RPC| MCPServer
    MCPServer <-->|Subprocess Stdio| DaemonScript
    Main <-->|Stdio JSON-RPC| Supervisor
    Supervisor <-->|nice -n 10 process| DaemonScript
    DaemonScript --> MLXCore
    MLXCore --> TAESD
    MLXCore --> MetalGPU
    Main --> DB
```

---

## ⚡ Stdio JSON-RPC Sequence Flow

```mermaid
sequenceDiagram
    autonumber
    participant UI as React UI (StudioCanvas)
    participant Electron as Electron Main Process
    participant Supervisor as SidecarSupervisor
    participant Python as mlx_image_daemon.py (Metal GPU)

    UI->>Electron: window.electronAPI.mlx.generateImage(params)
    Electron->>Supervisor: sidecarSupervisor.generateImage(req)
    Supervisor->>Python: Send JSON-RPC payload over stdin
    loop Diffusion Steps 1..N
        Python->>Python: Compute Denoising Pass on Metal GPU
        Python->>Python: Evaluate TAESD <1ms Neural Projection
        Python->>Supervisor: Emit {"type":"progress", "payload": telemetry}
        Supervisor->>Electron: Forward progress payload
        Electron->>UI: webContents.send('mlx:progress', payload)
    end
    Python->>Supervisor: Emit {"type":"complete", "payload": finalResult}
    Supervisor->>Electron: Forward complete payload
    Electron->>UI: webContents.send('mlx:complete', payload)
```

---

## 💾 Memory & Fluidity Management

1. **Unified Memory Cache Capping**:
   - `mx.set_cache_limit(3 * 1024 * 1024 * 1024)` caps MLX cache at 3GB, preventing VRAM starvation.
2. **Process Scheduling Priority**:
   - Spawns the sidecar process using `nice -n 10` on macOS to guarantee 60 FPS WindowServer and UI responsiveness.
3. **MemorySaver Weight Eviction**:
   - T5 and CLIP text encoder weights are automatically evicted from Unified Memory immediately following prompt token encoding.
