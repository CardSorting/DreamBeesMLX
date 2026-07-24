# 🤖 AGENTS.md — AI Agent Operating Protocol

Welcome, AI Agent! This document contains formal instructions, constraints, tool protocols, and execution guidelines for LLMs (Claude, Antigravity, Cursor, LangChain, AutoGen, CrewAI) interacting with **DreamBees MLX Studio**.

---

## 🎯 Repository Overview for Agents

- **Project Name**: DreamBees MLX Studio
- **Primary Function**: Sovereign, 100% on-device AI Image Generation & Benchmarking Engine for macOS on Apple Silicon (M1/M2/M3/M4).
- **Core Technologies**: Node.js 20+, TypeScript, Electron 41+, Python 3.10+, MLX (`mlx`, `mflux`, `diffusers`), SQLite (`better-sqlite3`).
- **Primary MCP Server Entry**: `node /Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/mcp_server/dist/index.js`
- **Sidecar Daemon Script**: `python3 /Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/electron/mlx/mlx_image_daemon.py`

---

## ⚡ Agent Execution Rules & Constraints

1. **Hardware Scoping**:
   - Execution MUST run on Apple Silicon macOS (`darwin arm64`).
   - Do NOT pass parameters exceeding 3GB VRAM cache without checking `dreambees_get_metal_diagnostics`.

2. **Touchless Dependency Resolver**:
   - If Python MLX dependencies are missing, do NOT fail tool execution. The daemon automatically invokes `ensure_touchless_dependencies()` to auto-install `mlx`, `mflux`, `diffusers`, and `Pillow` silently.

3. **MCP Tool Invocations**:
   - Prefer calling `dreambees_generate_image` for image generation requests.
   - Prefer calling `dreambees_list_models` to verify model readiness before initiating multi-image batch runs.

4. **JSON-RPC Communication**:
   - Standard stdio JSON-RPC transport protocol.
   - All tool responses return structured JSON with image output file paths and Base64 data URLs.

---

## 📚 Key Agent Documentation Links

- 🛠️ [Formal Tool API Reference](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/docs/AGENT_TOOL_REFERENCE.md)
- 🔌 [Agent Framework Integration Guide (LangChain, CrewAI, AutoGen)](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/docs/AGENT_INTEGRATION.md)
- 📊 [AI Agent Automated Benchmarking Protocol](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/docs/AGENT_BENCHMARKING.md)
- 🎨 [Curated AI Agent Prompt Library](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/docs/AGENT_PROMPT_LIBRARY.md)
- 🏛️ [System Architecture & Sequence Diagrams](file:///Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/ARCHITECTURE.md)
