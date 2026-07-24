# 🤝 Contributing to DreamBees MLX Studio

Thank you for your interest in contributing to **DreamBees MLX Studio**! We welcome contributions from developers, researchers, and designers to advance sovereign, on-device AI image generation for Apple Silicon.

This guide outlines our development standards, workflow, and pull request procedures (mirrored from top open-source projects like Hugging Face, PyTorch, and Ollama).

---

## 📜 Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free community for everyone. Please treat all contributors with respect regardless of technical experience, background, or identity.

---

## 🛠️ Development Setup

### Prerequisites
- Apple Silicon Mac (M1, M2, M3, or M4) running macOS 13.0+
- Node.js >= 20.0
- Python >= 3.10

### Fork & Clone
```bash
git clone https://github.com/YOUR_USERNAME/DreamBeesMLX.git
cd DreamBeesMLX
npm install
```

### Dev Mode
```bash
npm run dev
```

---

## 🧪 Testing & Code Standards

Before submitting a pull request, ensure all verification checks pass cleanly:

### 1. TypeScript Verification
```bash
./node_modules/.bin/tsc --noEmit
```

### 2. Build MCP Server
```bash
npm run build:mcp
```

### 3. Run Automated MLX Metal Benchmark Suite
```bash
python3 tests/benchmarks/run_benchmarks.py
```

---

## 🔀 Pull Request Workflow

1. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Commit Changes**: Use descriptive, atomic commit messages following conventional commits (`feat:`, `fix:`, `docs:`, `perf:`).
3. **Run Pre-Commit Verification**: Ensure zero TypeScript errors and all tests pass.
4. **Submit PR**: Open a pull request against the `main` branch with a clear summary of changes and visual screenshots for UI modifications.
