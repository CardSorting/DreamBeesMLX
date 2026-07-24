import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import EventEmitter from 'events';

export interface MLXGenerationRequest {
  id: string;
  prompt: string;
  model_id: string;
  width: number;
  height: number;
  steps: number;
  guidance_scale: number;
  seed: number;
  output_path: string;
}

export class SidecarSupervisor extends EventEmitter {
  private child: ChildProcess | null = null;
  private isInitializing = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private stdoutBuffer = '';

  constructor(private scriptPath: string) {
    super();
    this.setMaxListeners(30);
  }

  public start(): void {
    if (this.child || this.isInitializing) return;
    this.isInitializing = true;
    this.stdoutBuffer = '';

    try {
      const isUnix = process.platform !== 'win32';
      const pythonBin = process.env.PYTHON_PATH || 'python3';
      const command = isUnix ? 'nice' : pythonBin;
      const args = isUnix ? ['-n', '10', pythonBin, this.scriptPath] : [this.scriptPath];

      // Touchless environment PATH expansion for Homebrew, Pyenv, Conda, and User Pythons
      const envPath = [
        process.env.PATH || '',
        '/opt/homebrew/bin',
        '/usr/local/bin',
        path.join(process.env.HOME || '', '.pyenv', 'shims'),
        path.join(process.env.HOME || '', '.local', 'bin'),
      ].join(':');

      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PATH: envPath,
          PYTHONUNBUFFERED: '1',
        },
      });

      this.child = child;

      child.stdout?.on('data', (data: Buffer) => {
        this.stdoutBuffer += data.toString('utf-8');
        const lines = this.stdoutBuffer.split('\n');
        // Keep the last incomplete line in buffer
        this.stdoutBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            this.emit('message', parsed);
          } catch {
            this.emit('log', trimmed);
          }
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        this.emit('log_error', data.toString('utf-8').trim());
      });

      child.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
        this.cleanupChild();
        this.emit('exit', { code, signal });
      });

      child.on('error', (error: Error) => {
        this.emit('error', error);
      });

      this.startHeartbeat();
      this.isInitializing = false;
    } catch (error) {
      this.isInitializing = false;
      this.emit('error', error);
    }
  }

  private cleanupChild(): void {
    this.stopHeartbeat();
    if (this.child) {
      try {
        this.child.stdout?.removeAllListeners();
        this.child.stderr?.removeAllListeners();
        this.child.removeAllListeners();
      } catch {}
      this.child = null;
    }
    this.stdoutBuffer = '';
  }

  public sendCommand(action: string, payload: Record<string, any> = {}): boolean {
    if (!this.child || !this.child.stdin || this.child.stdin.destroyed) {
      return false;
    }
    try {
      const msg = JSON.stringify({ action, payload }) + '\n';
      this.child.stdin.write(msg);
      return true;
    } catch (err) {
      console.warn('[sidecar] Failed to write command to stdin:', err);
      return false;
    }
  }

  public generateImage(req: MLXGenerationRequest): boolean {
    return this.sendCommand('generate', req);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.child) {
        this.sendCommand('ping');
      }
    }, 5000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public stop(): void {
    this.stopHeartbeat();
    if (this.child) {
      try {
        this.child.kill('SIGTERM');
      } catch {}
      this.cleanupChild();
    }
  }
}

