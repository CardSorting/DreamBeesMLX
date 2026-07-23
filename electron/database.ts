import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export interface GenerationRecord {
  id: string;
  prompt?: string;
  imageUrl?: string;
  modelId?: string;
  params?: Record<string, unknown>;
  createdAt?: number;
}

function requireString(value: unknown, field: string, maxLength = 2048): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}

function safeJsonParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export class LiteDatabase {
  private db: Database.Database;
  private dbPath: string;
  private saveStmt!: Database.Statement;
  private getStmt!: Database.Statement;
  private setSettingStmt!: Database.Statement;
  private getSettingStmt!: Database.Statement;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(app.getPath('userData'), 'lite.sqlite');
    this.backup(); // Perform a rotation backup on startup
    this.db = new Database(this.dbPath, { timeout: 5000 });
    this.init();
    this.verifyIntegrity();
    this.compileStatements();
  }

  private compileStatements() {
    this.saveStmt = this.db.prepare(`
      INSERT OR REPLACE INTO generations (id, prompt, imageUrl, modelId, params, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    this.getStmt = this.db.prepare(`SELECT * FROM generations ORDER BY createdAt DESC LIMIT ?`);
    this.setSettingStmt = this.db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`);
    this.getSettingStmt = this.db.prepare(`SELECT value FROM settings WHERE key = ?`);
  }

  private backup() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const backupPath = `${this.dbPath}.bak`;
        fs.copyFileSync(this.dbPath, backupPath);
        console.log('[database] Survival backup created:', backupPath);
      }
    } catch (err) {
      console.warn('[database] Backup failed:', err);
    }
  }

  private verifyIntegrity() {
    try {
      const integrity = this.db.pragma('integrity_check');
      if (integrity !== 'ok') {
        console.error('[database] Integrity check FAILED:', integrity);
        // In a real app, we might restore from backup here
      } else {
        console.log('[database] Integrity verified: OK');
      }
    } catch (err) {
      console.error('[database] Integrity check error:', err);
    }
  }

  private init() {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL'); // Balance between speed and safety
    this.db.pragma('cache_size = -2000'); // Limit page cache memory overhead to ~2MB
    this.db.pragma('temp_store = MEMORY'); // Keep temporary tables/indices in memory
    this.db.pragma('mmap_size = 0'); // Disable memory-mapped I/O to restrict VM size expansion
    this.db.pragma('wal_autocheckpoint = 1000'); // Checkpoint automatically after 1000 pages (~4MB)
    this.db.pragma('max_page_count = 50000'); // Limit DB file size to ~200MB to prevent disk stutters

    // Simple migration system
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        version INTEGER NOT NULL,
        appliedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS generations (
        id TEXT PRIMARY KEY,
        prompt TEXT,
        imageUrl TEXT,
        modelId TEXT,
        params TEXT,
        createdAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    this.runMigrations();
  }

  private runMigrations() {
    try {
      const row = this.db.prepare('SELECT MAX(version) as v FROM migrations').get() as { v: number | null } | undefined;
      const currentVersion = row?.v || 0;
      
      // logStartup(`Database version: ${currentVersion}`);
      console.log(`[database] Current version: ${currentVersion}`);
      
      // Example of future migration structure
      // if (currentVersion < 1) {
      //   this.db.exec('ALTER TABLE generations ADD COLUMN meta TEXT');
      //   this.db.prepare('INSERT INTO migrations (version, appliedAt) VALUES (?, ?)').run(1, Date.now());
      // }
    } catch (error) {
      // If migrations table doesn't exist yet (first run), it's handled by CREATE TABLE IF NOT EXISTS
      console.warn('[database] Migration check failed (expected on first run)');
    }
  }

  public saveGeneration(data: GenerationRecord) {
    const id = requireString(data?.id, 'id', 256);
    const prompt = typeof data.prompt === 'string' ? data.prompt.slice(0, 10000) : '';
    const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl.slice(0, 4096) : '';
    const modelId = typeof data.modelId === 'string' ? data.modelId.slice(0, 256) : '';
    const createdAt = Number.isFinite(data.createdAt) ? Number(data.createdAt) : Date.now();
    this.saveStmt.run(
      id,
      prompt,
      imageUrl,
      modelId,
      JSON.stringify(data.params || {}),
      createdAt
    );
  }

  public getGenerations(limit: number = 50) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 1000);
    return this.getStmt.all(safeLimit).map((g: any) => ({
      ...g,
      params: safeJsonParse(g.params)
    }));
  }

  public setSetting(key: string, value: any) {
    const safeKey = requireString(key, 'key', 128);
    this.setSettingStmt.run(safeKey, JSON.stringify(value));
  }

  public getSetting(key: string) {
    const safeKey = requireString(key, 'key', 128);
    const row = this.getSettingStmt.get(safeKey) as any;
    return row ? safeJsonParse(row.value) : null;
  }

  public checkpoint() {
    try {
      this.db.pragma('wal_checkpoint(FULL)');
      console.log('[database] WAL Checkpoint complete');
    } catch (err) {
      console.warn('[database] Checkpoint failed:', err);
    }
  }

  public close() {
    if (this.db.open) {
      this.checkpoint();
      this.db.close();
      // Dereference statements to assist garbage collection
      (this as any).saveStmt = undefined;
      (this as any).getStmt = undefined;
      (this as any).setSettingStmt = undefined;
      (this as any).getSettingStmt = undefined;
      console.log('[database] Database connection closed safely');
    }
  }
}
