# 🔌 Agent Framework Integration Guide

Step-by-step integration code examples for connecting **DreamBees MLX MCP Server** to popular AI Agent frameworks (**Claude Desktop**, **Antigravity**, **Cursor**, **LangChain**, **CrewAI**, and **AutoGen**).

---

## 1. Claude Desktop / Claude Code Setup

Add to your `claude_desktop_config.json`:
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

## 2. Antigravity / Gemini CLI Setup

In your `.gemini/config` or workspace `.agents/mcp_config.json`:
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

## 3. LangChain Python Agent Tool Integration

```python
from langchain_community.tools import StructuredTool
import subprocess
import json

def generate_local_image(prompt: str, steps: int = 2) -> str:
    """Generate image locally on Apple Silicon Metal GPU via DreamBees MLX."""
    cmd = [
        "node",
        "/Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/mcp_server/dist/index.js"
    ]
    # MCP stdio JSON-RPC call
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "dreambees_generate_image",
            "arguments": {"prompt": prompt, "steps": steps}
        }
    }
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    out, _ = proc.communicate(json.dumps(payload) + "\n")
    return out

dreambees_tool = StructuredTool.from_function(
    func=generate_local_image,
    name="dreambees_generate_image",
    description="Generates local AI artwork on Apple Silicon Metal GPU"
)
```

---

## 4. CrewAI Multi-Agent System Tool Integration

```python
from crewai.tools import tool
import subprocess
import json

@tool("DreamBees Local Image Generator")
def dreambees_image_generator(prompt: str) -> str:
    """Generate high quality AI images locally on Apple Silicon Mac without cloud fees."""
    # Stdio MCP invocation
    req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "dreambees_generate_image",
            "arguments": {"prompt": prompt, "model_id": "flux2-klein-4b"}
        }
    }
    proc = subprocess.Popen(
        ["node", "/Users/bozoegg/Downloads/DreamBeesAIArt-clean-main/mcp_server/dist/index.js"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        text=True
    )
    stdout, _ = proc.communicate(json.dumps(req) + "\n")
    return stdout
```
