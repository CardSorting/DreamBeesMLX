# 📰 Changelog

All notable changes to **DreamBees MLX Studio** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.20] - 2026-07-24

### 🚀 Added
- **TAESD Sub-Millisecond Neural Latent Streaming**: 16-to-3 RGB TAESD matrix projection (`taesd_fast_latent_decode`) for <1ms intermediate previews with 0% VAE GPU overhead.
- **Flow Velocity & SNR Telemetry**: Live flow-matching velocity vector ($v_t$) and Signal-to-Noise Ratio ($SNR_{dB}$) computation per step.
- **Model Context Protocol (MCP) Server**: Official stdio MCP server (`mcp_server/dist/index.js`) exposing tools (`dreambees_generate_image`, `dreambees_list_models`, `dreambees_run_benchmark`, `dreambees_get_metal_diagnostics`) for Claude Desktop, Antigravity, and Cursor.
- **10-Test MLX Metal Automated Benchmark Suite**: Headless Python runner (`tests/benchmarks/run_benchmarks.py`) testing 10 artistic prompt categories and compiling `benchmark_results.json`.
- **Touchless Environment Auto-Resolver**: Isolated virtualenv auto-provisioning at `~/Library/Application Support/DreamBees Lite/python_env/` with `ensurepip` fallback and silent package installation.
- **Ergonomic Touchless Installation Wizard**: Glassmorphic onboarding modal (`TouchlessInstallerWizard.tsx`) with LM Studio style hardware presets, Diffusionbee style memory bar, and Adobe CC style 1-Click Starter Canvas Showcase (`FirstRenderShowcase.tsx`).

### 🛡️ Security & Performance
- Enforced low process scheduling priority (`nice -n 10`) for Python sidecar daemon.
- Hard-capped MLX Unified Memory cache at 3GB (`mx.set_cache_limit`) to preserve 60 FPS WindowServer and desktop fluidity.
- 100% on-device local database storage using `better-sqlite3`.
