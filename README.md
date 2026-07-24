# 🐝 DreamBees MLX Studio

![macOS Apple Silicon](https://img.shields.io/badge/Platform-macOS_Apple_Silicon-black?logo=apple&style=flat-square)
![Metal 3.0 Accelerated](https://img.shields.io/badge/GPU-Apple_Metal_3.0-purple?logo=apple&style=flat-square)
![License Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square)
![MCP Server Protocol](https://img.shields.io/badge/MCP-Protocol_v1.6.0-green.svg?style=flat-square)
![100% On-Device](https://img.shields.io/badge/Privacy-100%25_On--Device-emerald.svg?style=flat-square)

**DreamBees MLX Studio** is a sovereign, 100% on-device AI Image Generation Studio and Model Context Protocol (MCP) Engine engineered natively for **macOS on Apple Silicon (M1/M2/M3/M4)**.

It delivers instant, private AI image synthesis using **Apple's Metal GPU framework** and **MLX array architecture** (`mflux` and `mlx`). Zero subscription fees, zero cloud API keys, zero remote telemetry.

---

## ⚡ Key Architecture & Features

- ** 100% Native Apple Silicon Acceleration**: Directly targets Apple Silicon's Unified Memory Architecture (UMA) via Metal GPU arrays with low process priority (`nice -n 10`) and 3GB VRAM cache capping (`mx.set_cache_limit`) for maximum desktop fluidity without UI lag.
- **✨ 2026 Open-Weights Model Suite**:
  - **FLUX.2 Klein (4B & 9B)** (`mlx-community/flux2-klein-4b-4bit`) — Real-time rectified flow DiT by Black Forest Labs.
  - **Sana 2.0 Sprint** (`SceneWorks/Sana_1600M_1024px_mlx`) — Sub-second 4K linear-attention DiT (~0.4s – 1.2s).
  - **Wan2.1 T2I (1.3B)** (`Wan-AI/Wan2.1-T2I-1.3B-MLX`) — High aesthetic quality and rich color depth.
  - **Stable Diffusion 3.5 Turbo** (`argmaxinc/mlx-stable-diffusion-3.5-large-4bit-quantized`) — Multi-head DiT architecture.
- **🔬 TAESD Sub-Millisecond Neural Latent Streaming**: Sub-millisecond 16-to-3 RGB TAESD neural matrix projection (`taesd_fast_latent_decode`) for real-time intermediate preview frames with **0% VAE GPU overhead**.
- **📈 Flow Velocity Vectoring & Signal-to-Noise Telemetry**: Computes flow-matching velocity ($v_t$) and Signal-to-Noise Ratio ($SNR_{dB}$) on every step pass.
- **🤖 Touchless Auto-Provisioning & Environment Resolver**: `TouchlessEnvironmentResolver` automatically detects system Python environments, self-heals `pip` via `ensurepip`, and constructs an isolated virtualenv at `~/Library/Application Support/DreamBees Lite/python_env/` with `mlx`, `mflux`, `diffusers`, and `Pillow` installed silently in the background on demand.
- **🧙 Ergonomic Touchless Onboarding Wizard**: Glassmorphic onboarding modal featuring LM Studio style preset cards (**Fast Speed** vs **Ultra Quality**), Diffusionbee style Unified Memory diagnostic bar (`16 GB Unified Memory Available`), Ollama style expandable live terminal accordion, and Adobe CC style 1-Click Starter Canvas Showcase.
- **🤖 Official Model Context Protocol (MCP) Server**: Exposes MCP tools (`dreambees_generate_image`, `dreambees_list_models`, `dreambees_run_benchmark`, `dreambees_get_metal_diagnostics`) over stdio JSON-RPC for external AI agents (Claude Desktop, Antigravity, Cursor, Continue.dev).
- **📊 10-Test Standardized Benchmark Suite**: Automated benchmark runner (`tests/benchmarks/run_benchmarks.py`) testing 10 diverse artistic styles and producing JSON reports (`benchmark_results.json`).

---

## 📚 Comprehensive Documentation Directory

| Audience / Purpose | Guide | Focus Area |
|---|---|---|
| 🤖 **AI Agents Protocol** | [`AGENTS.md`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/AGENTS.md) | Root instructions and rules for LLM Autonomous Agents |
| 🛠️ **Agent Tool Reference** | [`docs/AGENT_TOOL_REFERENCE.md`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/docs/AGENT_TOOL_REFERENCE.md) | Formal JSON Schema specs & payloads for all 4 MCP tools |
| 🔌 **Agent Framework Integration** | [`docs/AGENT_INTEGRATION.md`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/docs/AGENT_INTEGRATION.md) | Code integration for Claude, Antigravity, Cursor, LangChain, CrewAI, AutoGen |
| 📊 **Agent Benchmarking Protocol** | [`docs/AGENT_BENCHMARKING.md`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/docs/AGENT_BENCHMARKING.md) | Programmatic benchmark execution & KPI formulas ($it/s$, $ms/step$, VRAM) |
| 🎨 **Agent Prompt Library** | [`docs/AGENT_PROMPT_LIBRARY.md`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/docs/AGENT_PROMPT_LIBRARY.md) | Structured prompt formulas for Photorealism, UI 3D, Fine Art, and Sci-Fi |
| 🏛️ **System Architecture** | [`ARCHITECTURE.md`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/ARCHITECTURE.md) | High-level topology, Mermaid sequence diagrams, memory management, and process IPC |
| 🤝 **Open-Source Contributors** | [`CONTRIBUTING.md`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/CONTRIBUTING.md) | Development setup, PR guidelines, code standards, and verification commands |
| 📜 **Code of Conduct** | [`CODE_OF_CONDUCT.md`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/CODE_OF_CONDUCT.md) | Contributor Covenant v2.1 community standards |
| 🛡️ **Security & Privacy Policy** | [`SECURITY.md`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/SECURITY.md) | Security architecture, disclosure policy, zero-telemetry, and local data isolation |
| ❓ **FAQ & Troubleshooting** | [`docs/FAQ.md`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/docs/FAQ.md) | Hardware requirements, memory optimization, TAESD latent previews, and troubleshooting |
| 💼 **Executives & Stakeholders** | [`docs/STAKEHOLDER_ONBOARDING.md`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/docs/STAKEHOLDER_ONBOARDING.md) | Privacy compliance, cloud cost elimination, ROI, and security posture |
| 👨‍💻 **Developers & Engineers** | [`docs/DEVELOPER_ONBOARDING.md`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/docs/DEVELOPER_ONBOARDING.md) | Architecture, stdio IPC protocol, Touchless Resolver, and build workflows |
| 🎨 **Artists & Creative End-Users** | [`docs/NON_TECHNICAL_USER_GUIDE.md`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/docs/NON_TECHNICAL_USER_GUIDE.md) | 1-minute quick start, presets, Studio Canvas navigation, and FAQ |
| 🤖 **AI Agents & MCP Integration** | [`mcp_server/README_MCP.md`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/mcp_server/README_MCP.md) | Model Context Protocol server setup for Claude Desktop, Antigravity, Cursor |
| 📊 **QA & Performance Engineers** | [`tests/benchmarks/README.md`](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/tests/benchmarks/README.md) | 10-Test automated MLX Metal benchmark runner and performance reporting |

---

## 📁 Repository Structure

```
DreamBeesMLX/
├── src/                          # Electron Renderer — React 19 + Vite + Tailwind CSS
│   ├── components/
│   │   ├── StudioCanvas.tsx      # Main interactive canvas with TAESD latent preview & step snapshot inspector
│   │   ├── TouchlessInstallerWizard.tsx # Glassmorphic touchless setup wizard & memory gauge
│   │   ├── FirstRenderShowcase.tsx # 1-click starter template showcase
│   │   ├── ModelHub.tsx          # MLX Model Catalog & Downloader UI
│   │   ├── GalleryView.tsx       # Offline artwork gallery & lightbox modal
│   │   └── HardwareMonitor.tsx   # Apple Silicon Metal GPU & Memory diagnostic widget
│   └── main.tsx                  # React entry point
├── electron/                     # Electron Main Process & Native Bridges
│   ├── mlx/
│   │   └── mlx_image_daemon.py   # Python MLX Image Daemon (TAESD Latent Decoding & Telemetry IPC)
│   ├── environment_resolver.ts   # Touchless virtual environment auto-provisioner
│   ├── sidecar_supervisor.ts     # Process supervisor & nice -n 10 scheduling
│   ├── model_downloader.ts       # Chunked resumable HuggingFace MLX downloader
│   ├── database.ts               # Local SQLite database manager (better-sqlite3)
│   └── main.ts                   # Main process entry point & IPC router
├── mcp_server/                   # Model Context Protocol (MCP) Server for AI Agents
│   ├── src/index.ts              # MCP Stdio Server implementation (@modelcontextprotocol/sdk)
│   └── README_MCP.md             # Integration guide for Claude Desktop, Antigravity, Cursor
└── tests/
    └── benchmarks/               # 10-Test Automated Benchmark Suite
        ├── suite_config.json     # Standardized test prompts & seeds manifest
        ├── run_benchmarks.py     # Python automated test runner
        ├── outputs/              # Rendered PNG benchmark images
        └── benchmark_results.json # Benchmark performance JSON report
```

---

## 🚀 Quick Start & Development

### 1. Run Electron App locally
```bash
npm install
npm run dev
```

### 2. Build MCP Server for AI Agents
```bash
npm run build:mcp
```

### 3. Run 10-Test MLX Metal Benchmark Suite
```bash
python3 tests/benchmarks/run_benchmarks.py
```

### 4. Package macOS Desktop Application
```bash
npm run build
```

---

## 🤖 MCP Server Setup (Claude Desktop / Antigravity / Cursor)

Add the following block to your `claude_desktop_config.json` or `mcp_config.json`:

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

## 🛡️ Telemetry & Sovereignty

DreamBees MLX operates **100% offline** on your Mac's Apple Silicon Metal GPU. All model weights, database records, and generated image files remain exclusively on your local disk (`~/Library/Application Support/DreamBees Lite/`).
