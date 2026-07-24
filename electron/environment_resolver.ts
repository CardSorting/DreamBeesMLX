import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export interface EnvironmentResolutionResult {
  pythonPath: string;
  isReady: boolean;
  provisioned: boolean;
  error?: string;
}

export class TouchlessEnvironmentResolver {
  private baseDir: string;
  private venvDir: string;
  private venvPython: string;

  constructor() {
    const userData = app?.getPath('userData') || path.join(process.env.HOME || '', 'Library', 'Application Support', 'DreamBees Lite');
    this.baseDir = userData;
    this.venvDir = path.join(userData, 'python_env');
    this.venvPython = path.join(this.venvDir, 'bin', 'python3');
  }

  public async resolveEnvironment(): Promise<EnvironmentResolutionResult> {
    try {
      // 1. Check if local isolated virtual environment is already provisioned & ready
      if (fs.existsSync(this.venvPython) && this.verifyMLX(this.venvPython)) {
        return { pythonPath: this.venvPython, isReady: true, provisioned: true };
      }

      // 2. Check if system python has MLX ready
      const systemPython = this.findSystemPython();
      if (systemPython && this.verifyMLX(systemPython)) {
        return { pythonPath: systemPython, isReady: true, provisioned: false };
      }

      // 3. Auto-provision dedicated isolated venv (100% Touchless)
      const targetPython = systemPython || 'python3';
      fs.mkdirSync(this.baseDir, { recursive: true });

      if (!fs.existsSync(this.venvPython)) {
        execSync(`"${targetPython}" -m venv "${this.venvDir}"`, { stdio: 'ignore' });
      }

      // 4. Install MLX, mflux, and diffusers into isolated venv
      const pipPath = path.join(this.venvDir, 'bin', 'pip');
      const installCmd = `"${pipPath}" install mlx mlx-metal mflux diffusers Pillow --quiet`;
      execSync(installCmd, { stdio: 'ignore' });

      if (fs.existsSync(this.venvPython) && this.verifyMLX(this.venvPython)) {
        return { pythonPath: this.venvPython, isReady: true, provisioned: true };
      }

      // Fallback to system python if venv created
      return { pythonPath: systemPython || 'python3', isReady: true, provisioned: false };
    } catch (err: any) {
      return {
        pythonPath: 'python3',
        isReady: false,
        provisioned: false,
        error: err?.message || String(err),
      };
    }
  }

  private findSystemPython(): string | null {
    const candidates = [
      '/opt/homebrew/bin/python3',
      '/usr/local/bin/python3',
      path.join(process.env.HOME || '', '.pyenv', 'shims', 'python3'),
      '/usr/bin/python3',
    ];

    for (const bin of candidates) {
      if (fs.existsSync(bin)) {
        try {
          execSync(`"${bin}" --version`, { stdio: 'ignore' });
          return bin;
        } catch {}
      }
    }
    return null;
  }

  private verifyMLX(pythonPath: string): boolean {
    try {
      execSync(`"${pythonPath}" -c "import mlx.core, mflux, diffusers, PIL"`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}
