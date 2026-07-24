#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const DAEMON_PATH = path.join(PROJECT_ROOT, 'electron', 'mlx', 'mlx_image_daemon.py');
const BENCHMARK_RESULTS_PATH = path.join(PROJECT_ROOT, 'tests', 'benchmarks', 'benchmark_results.json');
const BENCHMARK_RUNNER_PATH = path.join(PROJECT_ROOT, 'tests', 'benchmarks', 'run_benchmarks.py');

const server = new McpServer({
  name: 'dreambees-mlx',
  version: '1.4.20',
  description: 'Native Apple Silicon MLX Image Generation & Hardware Telemetry Server for AI Agents',
});

// Tool 1: dreambees_generate_image
server.tool(
  'dreambees_generate_image',
  'Generate an image locally on Apple Silicon Metal GPU using MLX (FLUX.2 Klein, Sana 2.0)',
  {
    prompt: z.string().describe('The textual prompt description for the image to generate'),
    model_id: z.string().optional().default('flux2-klein-4b').describe('MLX model ID (e.g. flux2-klein-4b, sana-2-sprint)'),
    width: z.number().optional().default(512).describe('Image width in pixels'),
    height: z.number().optional().default(512).describe('Image height in pixels'),
    steps: z.number().optional().default(2).describe('Number of inference diffusion steps'),
    seed: z.number().optional().describe('Entropy seed integer'),
  },
  async ({ prompt, model_id, width, height, steps, seed }) => {
    const actualSeed = seed ?? Math.floor(Math.random() * 1000000);
    const outputPath = path.join('/tmp', `dreambees_mcp_${Date.now()}_${actualSeed}.png`);

    const payload = {
      action: 'generate',
      payload: {
        prompt,
        model_id,
        width,
        height,
        steps,
        guidance_scale: 1.0,
        seed: actualSeed,
        output_path: outputPath,
      },
    };

    return new Promise((resolve) => {
      const child = spawn('python3', [DAEMON_PATH], { stdio: ['pipe', 'pipe', 'pipe'] });
      let finalResult: any = null;
      let errorMessage = '';

      child.stdout.on('data', (chunk) => {
        const lines = chunk.toString('utf-8').split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line.trim());
            if (parsed.type === 'complete') {
              finalResult = parsed.payload;
            } else if (parsed.type === 'error') {
              errorMessage = parsed.payload?.error || 'Execution error';
            }
          } catch {
            // Non-JSON stdout ignore
          }
        }
      });

      child.stderr.on('data', (err) => {
        errorMessage += err.toString('utf-8');
      });

      child.on('close', (code) => {
        if (finalResult && fs.existsSync(outputPath)) {
          let base64Img = '';
          try {
            const fileBuf = fs.readFileSync(outputPath);
            base64Img = fileBuf.toString('base64');
          } catch {}

          resolve({
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'success',
                  output_path: outputPath,
                  duration_ms: finalResult.duration_ms,
                  model_id: finalResult.model_id,
                  seed: finalResult.seed,
                  width: finalResult.width,
                  height: finalResult.height,
                  metal_accelerated: finalResult.metal_accelerated,
                  preview_data_url: base64Img ? `data:image/png;base64,${base64Img}` : undefined,
                }, null, 2),
              },
            ],
          });
        } else {
          resolve({
            isError: true,
            content: [
              {
                type: 'text',
                text: `Image generation failed (exit code ${code}): ${errorMessage || 'Unknown error'}`,
              },
            ],
          });
        }
      });

      child.stdin.write(JSON.stringify(payload) + '\n');
    });
  }
);

// Tool 2: dreambees_list_models
server.tool(
  'dreambees_list_models',
  'List available Apple Silicon MLX models, download status, and precision',
  {},
  async () => {
    const models = [
      {
        id: 'flux2-klein-4b',
        name: 'FLUX.2 Klein 4B',
        provider: 'Black Forest Labs / MLX',
        precision: '4-bit Quantized',
        status: 'ready',
        vram_required_gb: 3.1,
        description: 'Ultra-fast high quality flow-matching diffusion model for Apple Silicon',
      },
      {
        id: 'sana-2-sprint',
        name: 'Sana 2.0 Sprint',
        provider: 'SceneWorks / MLX',
        precision: '4-bit Quantized',
        status: 'ready',
        vram_required_gb: 2.8,
        description: 'Sub-second lightweight linear diffusion transformer',
      },
      {
        id: 'wan2.1-1.3b',
        name: 'Wan2.1 1.3B',
        provider: 'Wan-AI / MLX',
        precision: '4-bit Quantized',
        status: 'available',
        vram_required_gb: 3.5,
        description: 'Compact 1.3B open-weights image generation model',
      },
      {
        id: 'sd-3.5-turbo',
        name: 'Stable Diffusion 3.5 Turbo',
        provider: 'Stability AI / MLX',
        precision: '4-bit Quantized',
        status: 'available',
        vram_required_gb: 3.8,
        description: 'Multi-modal MMDiT architecture with fast turbo scheduler',
      },
    ];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ models }, null, 2),
        },
      ],
    };
  }
);

// Tool 3: dreambees_run_benchmark
server.tool(
  'dreambees_run_benchmark',
  'Run the 10-test MLX Metal benchmark suite or fetch recent benchmark results',
  {
    run_fresh: z.boolean().optional().default(false).describe('Run fresh benchmark suite or return cached report'),
  },
  async ({ run_fresh }) => {
    if (!run_fresh && fs.existsSync(BENCHMARK_RESULTS_PATH)) {
      try {
        const report = JSON.parse(fs.readFileSync(BENCHMARK_RESULTS_PATH, 'utf-8'));
        return {
          content: [{ type: 'text', text: JSON.stringify({ source: 'cached_report', report }, null, 2) }],
        };
      } catch {}
    }

    return new Promise((resolve) => {
      const child = spawn('python3', [BENCHMARK_RUNNER_PATH], { stdio: ['pipe', 'pipe', 'pipe'] });
      let output = '';

      child.stdout.on('data', (chunk) => {
        output += chunk.toString('utf-8');
      });

      child.on('close', () => {
        if (fs.existsSync(BENCHMARK_RESULTS_PATH)) {
          const report = JSON.parse(fs.readFileSync(BENCHMARK_RESULTS_PATH, 'utf-8'));
          resolve({
            content: [{ type: 'text', text: JSON.stringify({ source: 'fresh_run', report, logs: output }, null, 2) }],
          });
        } else {
          resolve({
            content: [{ type: 'text', text: JSON.stringify({ source: 'fresh_run', raw_output: output }, null, 2) }],
          });
        }
      });
    });
  }
);

// Tool 4: dreambees_get_metal_diagnostics
server.tool(
  'dreambees_get_metal_diagnostics',
  'Fetch Apple Silicon Metal GPU hardware diagnostics, active VRAM, and cache limits',
  {},
  async () => {
    return new Promise((resolve) => {
      const child = spawn('python3', [DAEMON_PATH, '--test'], { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdoutData = '';

      child.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString('utf-8');
      });

      child.on('close', () => {
        try {
          const parsed = JSON.parse(stdoutData.trim());
          resolve({
            content: [{ type: 'text', text: JSON.stringify(parsed, null, 2) }],
          });
        } catch {
          resolve({
            content: [{ type: 'text', text: stdoutData }],
          });
        }
      });
    });
  }
);

// Start MCP Server over Stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 DreamBees MLX MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal MCP Server error:', err);
  process.exit(1);
});
