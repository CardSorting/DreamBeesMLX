# 🛡️ Security Policy & Vulnerability Disclosure

At **DreamBees MLX**, security and user data sovereignty are fundamental design principles.

---

## 🔒 Security Architecture & Guarantees

1. **100% On-Device Local Execution**:
   - Zero telemetry, zero analytics tracking, and zero remote logging.
   - All AI inference occurs strictly on local Apple Silicon Metal GPU hardware.
2. **Offline-First Isolation**:
   - Prompts, intermediate latent preview frames, and final generated PNG files are written directly to local disk (`~/Library/Application Support/DreamBees Lite/`).
3. **Local Database Security**:
   - Local database records are stored in a sandboxed, isolated SQLite database file (`better-sqlite3`).

---

## 🐛 Reporting a Vulnerability

If you discover a security vulnerability or security bug, please report it responsibly:

- **Email**: `security@dreambees.ai`
- **Response SLA**: We acknowledge security reports within **24 hours** and aim to release patches within **72 hours**.

Please **do not** open public GitHub issues for undisclosed security vulnerabilities.
