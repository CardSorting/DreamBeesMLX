#!/usr/bin/env python3
"""
DreamBees MLX Metal Automated Benchmark Runner
Executes 10 standardized test cases against electron/mlx/mlx_image_daemon.py
Generates output images in tests/benchmarks/outputs/ and compiles benchmark_results.json
"""

import sys
import os
import json
import time
import subprocess

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BENCHMARK_DIR = os.path.join(PROJECT_ROOT, "tests", "benchmarks")
CONFIG_PATH = os.path.join(BENCHMARK_DIR, "suite_config.json")
OUTPUT_DIR = os.path.join(BENCHMARK_DIR, "outputs")
RESULTS_PATH = os.path.join(BENCHMARK_DIR, "benchmark_results.json")
DAEMON_PATH = os.path.join(PROJECT_ROOT, "electron", "mlx", "mlx_image_daemon.py")

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    if not os.path.exists(CONFIG_PATH):
        print(f"Error: Config not found at {CONFIG_PATH}")
        sys.exit(1)

    with open(CONFIG_PATH, "r") as f:
        config = json.load(f)

    test_cases = config.get("test_cases", [])
    print(f"============================================================")
    print(f"🚀 DreamBees MLX Metal Benchmark Suite (10 Test Cases)")
    print(f"Daemon Script: {DAEMON_PATH}")
    print(f"Output Dir:    {OUTPUT_DIR}")
    print(f"============================================================\n")

    results = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_tests": len(test_cases),
        "successful_tests": 0,
        "failed_tests": 0,
        "total_duration_ms": 0,
        "results": []
    }

    suite_start = time.time()

    for idx, test in enumerate(test_cases, 1):
        test_id = test.get("id")
        name = test.get("name")
        prompt = test.get("prompt")
        seed = test.get("seed")
        width = test.get("width", 512)
        height = test.get("height", 512)
        steps = test.get("steps", 2)

        output_file = os.path.join(OUTPUT_DIR, f"{test_id}.png")
        print(f"[{idx}/{len(test_cases)}] Running '{name}' ({test_id})...")

        req_payload = {
            "action": "generate",
            "payload": {
                "prompt": prompt,
                "model_id": config.get("model", "flux2-klein-4b"),
                "width": width,
                "height": height,
                "steps": steps,
                "guidance_scale": 1.0,
                "seed": seed,
                "output_path": output_file
            }
        }

        test_start = time.time()
        
        proc = subprocess.Popen(
            [sys.executable, DAEMON_PATH],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        stdout_data, stderr_data = proc.communicate(json.dumps(req_payload) + "\n")
        test_duration = int((time.time() - test_start) * 1000)

        step_telemetry = []
        final_complete = None
        has_error = False
        error_msg = ""

        for line in stdout_data.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
                msg_type = msg.get("type")
                payload = msg.get("payload", {})
                if msg_type == "progress":
                    step_telemetry.append(payload)
                elif msg_type == "complete":
                    final_complete = payload
                elif msg_type == "error":
                    has_error = True
                    error_msg = payload.get("error", "Unknown error")
            except Exception:
                pass

        success = (proc.returncode == 0) and not has_error and os.path.exists(output_file) and os.path.getsize(output_file) > 0

        test_result = {
            "test_id": test_id,
            "name": name,
            "category": test.get("category"),
            "prompt": prompt,
            "seed": seed,
            "output_path": output_file,
            "success": success,
            "duration_ms": test_duration,
            "steps_count": len(step_telemetry),
            "step_telemetry": step_telemetry,
            "error": error_msg if has_error else None
        }

        if success:
            results["successful_tests"] += 1
            print(f"    ✅ PASS • Duration: {test_duration}ms • Image: {os.path.basename(output_file)}")
        else:
            results["failed_tests"] += 1
            print(f"    ❌ FAIL • Error: {error_msg or stderr_data}")

        results["results"].append(test_result)
        print("------------------------------------------------------------")

    results["total_duration_ms"] = int((time.time() - suite_start) * 1000)

    with open(RESULTS_PATH, "w") as rf:
        json.dump(results, rf, indent=2)

    print(f"\n============================================================")
    print(f"📊 BENCHMARK SUITE COMPLETE")
    print(f"Total Tests:   {results['total_tests']}")
    print(f"Passed:        {results['successful_tests']} / {results['total_tests']}")
    print(f"Total Time:    {(results['total_duration_ms'] / 1000.0):.2f}s")
    print(f"Report Saved:  {RESULTS_PATH}")
    print(f"============================================================")

if __name__ == "__main__":
    main()
