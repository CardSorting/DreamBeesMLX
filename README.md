# 🐝 DreamBees MLX Studio

**DreamBees MLX Studio** is a sovereign, 100% on-device, offline-first AI Image Generation Application engineered natively for **macOS on Apple Silicon (M1/M2/M3/M4)**.

It delivers instant, private, sub-second to multi-second AI image synthesis using **Apple's Metal GPU framework** and **MLX array architecture** (`mflux` and `DiffusionKit`). Zero subscription fees, zero cloud API keys, zero remote telemetry.

---

## ⚡ Key Architecture & Features

- ** 100% Native Apple Silicon Acceleration**: Directly targets Apple Silicon's Unified Memory Architecture (UMA) via Metal GPU arrays for maximum bandwidth and inference speed.
- **✨ 2026 Open-Weights Model Suite**:
  - **FLUX.2 Klein (4B & 9B)** (`mlx-community/flux2-klein-4b-4bit`) — Real-time rectified flow DiT by Black Forest Labs.
  - **Sana 2.0 Sprint** (`SceneWorks/Sana_1600M_1024px_mlx`) — Sub-second 4K linear-attention DiT (~0.4s – 1.2s).
  - **Wan2.1 T2I (1.3B)** (`Wan-AI/Wan2.1-T2I-1.3B-MLX`) — High aesthetic quality and rich color depth.
  - **Lumina-Image 2.0 (2B Flow)** (`Alpha-VLLM/Lumina-Image-2.0-MLX`) — Flow transformer for complex multi-concept compositions.
  - **Stable Diffusion 3.5 Large** (`argmaxinc/mlx-stable-diffusion-3.5-large-4bit-quantized`) — Multi-head DiT with triple text encoder.
- **🤖 Touchless Setup Engine**: On first launch, the app automatically provisions recommended default model weights (`Sana 2.0 Sprint`) in the background so you can render artwork immediately out of the box.
- **🛡️ Supervised Sidecar Daemon (`sidecar_supervisor.ts`)**: Electron main process manages a dedicated Python 3 MLX sidecar process (`mlx_image_daemon.py`) over stdio JSON-RPC with 5-second heartbeat pings, stdout forensic logging, and crash auto-recovery.
- **💾 Sovereign Media Storage**: Full-resolution PNG images with embedded generation parameters (seed, prompt, model, steps) saved directly to disk (`~/Library/Application Support/DreamBees Lite/generations/`) and indexed in an optimized on-device SQLite database (`better-sqlite3`).
- **📊 Apple Silicon Hardware Diagnostics**: Real-time monitor displaying CPU/GPU architecture (ARM64), total Unified Memory (RAM), and Metal GPU state.

---

## 📁 Repository Structure

```
DreamBeesMLX/
├── src/                          # Electron Renderer — React 19 + Vite + Tailwind CSS
│   ├── components/
│   │   ├── StudioCanvas.tsx      # Main interactive generator canvas & parameter sliders
│   │   ├── ModelHub.tsx          # MLX Model Catalog & Downloader UI
│   │   ├── GalleryView.tsx       # Offline artwork gallery & lightbox modal
│   │   └── HardwareMonitor.tsx   # Apple Silicon Metal GPU & Memory diagnostic widget
│   ├── pages/                    # React page views & layout routers
│   ├── electron-api.d.ts         # Strongly typed window.electronAPI definitions
│   └── main.tsx                  # React entry point
├── electron/                     # Electron Main Process & Native Bridges
│   ├── mlx/
│   │   └── mlx_image_daemon.py   # Python MLX Image Daemon (JSON-RPC stdio server)
│   ├── sidecar_supervisor.ts     # Process supervisor & crash auto-recovery manager
│   ├── model_downloader.ts       # Chunked resumable HuggingFace MLX downloader
│   ├── database.ts               # Local SQLite database manager (better-sqlite3)
│   ├── main.ts                   # Main process entry point & IPC router
│   └── preload.ts                # Electron context isolation bridge
├── public/                       # Static app icons and assets
└── scripts/                      # Build, signing, and packaging scripts
```

---

## 🛠️ Application Pages & Desktop Navigation

- **`/studio` — Studio Canvas**: Interactive prompt editor, aspect ratio selector (1:1, 3:4, 4:3, 16:9, 9:16), diffusion step slider (1–28), guidance scale, seed randomizer, and live Metal GPU progress bar.
- **`/models` — MLX Model Hub**: Catalog center to browse, download, update, and manage local open-weights image models.
- **`/gallery` — Local Gallery**: On-device artwork gallery with lightbox modal, full-resolution zoom, EXIF parameter inspector, prompt copy action, and Finder reveal.

---

## 🚀 Quick Start & Development

### System Requirements
- **OS**: macOS Monterey 13.0 or newer
- **Hardware**: Mac with Apple Silicon (M1, M1 Pro/Max/Ultra, M2, M3, M4)
- **RAM**: 8 GB Unified Memory minimum (16 GB+ recommended for FLUX.2 & SD 3.5)
- **Runtime**: Node.js 20+ and Python 3.10+

### Setup & Launch

1. **Clone the repository**:
   ```bash
   git clone git@github.com:CardSorting/DreamBeesMLX.git
   cd DreamBeesMLX
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Verify Python MLX Daemon**:
   ```bash
   python3 electron/mlx/mlx_image_daemon.py --test
   # Output: {"status": "ready", "diagnostics": {"mlx_available": true, "metal_available": true, ...}}
   ```

4. **Launch Application in Development Mode**:
   ```bash
   npm run dev
   ```

5. **Build Production Desktop Package**:
   ```bash
   npm run build
   ```

---

## 🔒 Security & Privacy

- **100% Offline-Capable**: Zero external API calls required for image generation.
- **Hardened Electron Security**: Enforces `contextIsolation: true`, `sandbox: false`, strict Content Security Policy (CSP) headers, and navigation allowlist checks.
- **Secret Hardening**: All `.env`, `google-services.json`, API credentials, and model weights are strictly ignored in `.gitignore`.

---

## 📄 License

DreamBees MLX Studio is open source software licensed under the MIT License.
