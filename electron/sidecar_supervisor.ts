import { spawn, ChildProcess } from 'child_process';
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
  private heartbeatTimer: any = null;

  constructor(private scriptPath: string) {
    super();
  }

  public start(): void {
    if (this.child || this.isInitializing) return;
    this.isInitializing = true;

    try {
      this.child = spawn('python3', [this.scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.child.stdout?.on('data', (data: any) => {
        const lines = data.toString('utf-8').split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line.trim());
            this.emit('message', parsed);
          } catch {
            // Non-JSON output (e.g. standard python prints)
            this.emit('log', line.trim());
          }
        }
      });

      this.child.stderr?.on('data', (data: any) => {
        this.emit('log_error', data.toString('utf-8').trim());
      });

      this.child.on('exit', (code: any, signal: any) => {
        this.child = null;
        this.stopHeartbeat();
        this.emit('exit', { code, signal });
      });

      this.startHeartbeat();
      this.isInitializing = false;
    } catch (error) {
      this.isInitializing = false;
      this.emit('error', error);
    }
  }

  public sendCommand(action: string, payload: Record<string, any> = {}): boolean {
    if (!this.child || !this.child.stdin || this.child.stdin.destroyed) {
      return false;
    }
    const msg = JSON.stringify({ action, payload }) + '\n';
    this.child.stdin.write(msg);
    return true;
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
      this.child.kill('SIGTERM');
      this.child = null;
    }
  }
}
