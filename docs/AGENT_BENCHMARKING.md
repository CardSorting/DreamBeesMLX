# 📊 AI Agent Automated Benchmarking & Performance Protocol

This document provides autonomous AI agents with protocols for programmatically evaluating, benchmarking, and monitoring local Apple Silicon Metal GPU inference performance using **DreamBees MLX MCP Tools**.

---

## 🎯 Programmatic Benchmark Execution

AI Agents can invoke the `dreambees_run_benchmark` tool over stdio MCP transport:

### MCP Tool Request
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "dreambees_run_benchmark",
    "arguments": { "run_fresh": true }
  }
}
```

---

## 📈 Metric Calculation Formulas for Agents

Agents parsing `benchmark_results.json` should extract the following primary Key Performance Indicators (KPIs):

1. **Average Iteration Speed ($it/s$)**:
   $$\text{Mean } it/s = \frac{1}{N} \sum_{i=1}^{N} \text{its\_per\_sec}_i$$

2. **Step Computation Latency ($ms/step$)**:
   $$\text{Mean Step Latency} = \frac{1}{N} \sum_{i=1}^{N} \text{step\_ms}_i$$

3. **Peak Metal VRAM Consumption ($MB$)**:
   $$\text{Peak VRAM} = \max_{i=1..N} (\text{peak\_mb}_i)$$

4. **Signal-to-Noise Evolution ($SNR_{dB}$)**:
   $$SNR_{dB} = 10 \cdot \log_{10}\left(\frac{1 - \sigma}{\sigma}\right)$$

---

## 🤖 Python Agent Benchmark Script Example

```python
import subprocess
import json

def run_agent_benchmark():
    cmd = ["node", "/Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/mcp_server/dist/index.js"]
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "dreambees_run_benchmark",
            "arguments": {"run_fresh": false}
        }
    }
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    stdout, _ = proc.communicate(json.dumps(payload) + "\n")
    report = json.loads(stdout)
    print(f"Passed: {report['report']['successful_tests']} / {report['report']['total_tests']}")

if __name__ == "__main__":
    run_agent_benchmark()
```
