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

export interface StorageStats {
  dbSizeBytes: number;
  imageCacheSizeBytes: number;
  totalSizeBytes: number;
  maxQuotaBytes: number;
  itemCount: number;
}

const DEFAULT_DISK_QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB Max Image Cache Quota
const MIN_FREE_DISK_BYTES = 500 * 1024 * 1024; // 500 MB Free Disk Pressure Warning

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

/**
 * World-Class Atomic File Writer:
 * Writes to a .tmp file, performs fsync, and renames atomically to destination path.
 * Eliminates corrupted 0-byte or truncated image artifacts if process crashes mid-write.
 */
function atomicWriteFileSync(destPath: string, buffer: Buffer): void {
  const tmpPath = `${destPath}.tmp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  try {
    const fd = fs.openSync(tmpPath, 'w');
    fs.writeFileSync(fd, buffer);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fs.renameSync(tmpPath, destPath);
  } catch (err) {
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
    throw err;
  }
}

export class LiteDatabase {
  private db!: Database.Database;
  private dbPath: string;
  private saveStmt!: Database.Statement;
  private getStmt!: Database.Statement;
  private setSettingStmt!: Database.Statement;
  private getSettingStmt!: Database.Statement;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(app.getPath('userData'), 'lite.sqlite');
    this.initDatabaseWithSelfHealing();
  }

  /**
   * Forensic Recovery Protocol:
   * Checks integrity on startup. If corrupt, quarantines database to .corrupt file
   * and restores from .bak if valid.
   */
  private initDatabaseWithSelfHealing() {
    try {
      this.db = new Database(this.dbPath, { timeout: 5000 });
      this.initPragmasAndSchema();
      this.verifyIntegrity();
      this.compileStatements();
      this.backup();
      this.enforceDiskQuotaBytes();
    } catch (err) {
      console.error('[database] CRITICAL: SQLite initialization failed:', err);
      this.healCorruptDatabase();
    }
  }

  private healCorruptDatabase() {
    console.warn('[database] Initiating forensic database self-healing protocol...');
    try {
      if (this.db && this.db.open) {
        try { this.db.close(); } catch {}
      }

      if (fs.existsSync(this.dbPath)) {
        const corruptPath = `${this.dbPath}.corrupt_${Date.now()}`;
        fs.renameSync(this.dbPath, corruptPath);
        console.warn(`[database] Quarantined corrupted DB file to: ${corruptPath}`);
      }

      const backupPath = `${this.dbPath}.bak`;
      if (fs.existsSync(backupPath)) {
        try {
          const testDb = new Database(backupPath, { readonly: true });
          const testCheck = testDb.pragma('integrity_check');
          testDb.close();

          if (testCheck === 'ok') {
            fs.copyFileSync(backupPath, this.dbPath);
            console.log('[database] Successfully restored clean database from backup!');
          }
        } catch (backupErr) {
          console.warn('[database] Backup file invalid/corrupt:', backupErr);
        }
      }

      this.db = new Database(this.dbPath, { timeout: 5000 });
      this.initPragmasAndSchema();
      this.compileStatements();
      console.log('[database] Database self-healing complete. Operating cleanly.');
    } catch (healErr) {
      console.error('[database] FATAL: Self-healing failed, reinitializing empty DB:', healErr);
      this.db = new Database(this.dbPath, { timeout: 5000 });
      this.initPragmasAndSchema();
      this.compileStatements();
    }
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
        
        // Backup every 24 hours
        if (!fs.existsSync(backupPath) || Date.now() - fs.statSync(backupPath).mtimeMs > 86400000) {
          this.checkpoint();
          fs.copyFileSync(this.dbPath, backupPath);
          console.log('[database] Survival backup snapshot updated:', backupPath);
        }
      }
    } catch (err) {
      console.warn('[database] Backup skipped/failed:', err);
    }
  }

  private verifyIntegrity() {
    const integrity = this.db.pragma('integrity_check');
    if (integrity !== 'ok') {
      throw new Error(`Integrity check failed: ${JSON.stringify(integrity)}`);
    }
    console.log('[database] Integrity verified: OK');
  }

  private initPragmasAndSchema() {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -2000'); // ~2MB RAM cache limit
    this.db.pragma('temp_store = MEMORY');
    this.db.pragma('mmap_size = 0');
    this.db.pragma('wal_autocheckpoint = 500'); // ~2MB WAL checkpoint
    this.db.pragma('auto_vacuum = INCREMENTAL');

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

      CREATE INDEX IF NOT EXISTS idx_generations_createdAt ON generations(createdAt DESC);
    `);
  }

  /**
   * Disk Space Pressure Guard:
   * Inspects free macOS filesystem bytes before heavy disk operations.
   */
  public checkDiskPressure(): { freeBytes: number; lowDiskPressure: boolean } {
    try {
      const userDataDir = app.getPath('userData');
      if (typeof fs.statfsSync === 'function') {
        const stats = fs.statfsSync(userDataDir);
        const freeBytes = Number(stats.bavail) * Number(stats.bsize);
        return {
          freeBytes,
          lowDiskPressure: freeBytes < MIN_FREE_DISK_BYTES,
        };
      }
    } catch (err) {
      console.warn('[database] Disk pressure query failed:', err);
    }
    return { freeBytes: Number.MAX_SAFE_INTEGER, lowDiskPressure: false };
  }

  /**
   * Base64 Image Externalizer: Converts giant Base64 strings to disk files atomically.
   */
  private offloadBase64Image(id: string, rawUrl: string): string {
    if (typeof rawUrl === 'string' && rawUrl.startsWith('data:image/')) {
      try {
        const match = rawUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (match) {
          const ext = match[1] || 'png';
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const genDir = path.join(app.getPath('userData'), 'generations');
          if (!fs.existsSync(genDir)) {
            fs.mkdirSync(genDir, { recursive: true });
          }
          const filePath = path.join(genDir, `${id}.${ext}`);
          atomicWriteFileSync(filePath, buffer);
          console.log(`[database] Base64 image offloaded atomically to: ${filePath}`);
          return `file://${filePath}`;
        }
      } catch (err) {
        console.warn('[database] Failed to offload base64 image atomically:', err);
      }
    }
    return rawUrl;
  }

  public saveGeneration(data: GenerationRecord) {
    const { lowDiskPressure } = this.checkDiskPressure();
    if (lowDiskPressure) {
      console.warn('[database] Low disk space detected! Enforcing aggressive eviction before write...');
      this.enforceDiskQuotaBytes(DEFAULT_DISK_QUOTA_BYTES / 2);
    }

    const id = requireString(data?.id, 'id', 256);
    const prompt = typeof data.prompt === 'string' ? data.prompt.slice(0, 10000) : '';
    const rawImageUrl = typeof data.imageUrl === 'string' ? data.imageUrl : '';
    const imageUrl = this.offloadBase64Image(id, rawImageUrl).slice(0, 4096);
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

    this.enforceDiskQuotaBytes();
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

  /**
   * World-Class LRU Disk Byte Quota Engine:
   * Measures total byte size of image cache directory.
   * Evicts oldest LRU generated files and purges database metadata in an atomic transaction
   * until disk footprint drops below target threshold (80% of budget).
   */
  public enforceDiskQuotaBytes(maxBytes: number = DEFAULT_DISK_QUOTA_BYTES) {
    try {
      const genDir = path.join(app.getPath('userData'), 'generations');
      if (!fs.existsSync(genDir)) return;

      const files = fs.readdirSync(genDir);
      let totalBytes = 0;
      const fileStats: Array<{ name: string; fullPath: string; size: number; mtime: number }> = [];

      for (const file of files) {
        if (file.startsWith('.')) continue;
        const fullPath = path.join(genDir, file);
        try {
          const stat = fs.statSync(fullPath);
          totalBytes += stat.size;
          fileStats.push({ name: file, fullPath, size: stat.size, mtime: stat.mtimeMs });
        } catch {}
      }

      if (totalBytes > maxBytes) {
        const targetBytes = Math.floor(maxBytes * 0.8); // Reclaim down to 80% quota
        let bytesToReclaim = totalBytes - targetBytes;
        console.log(`[database] Disk cache quota exceeded (${(totalBytes / 1024 / 1024).toFixed(1)}MB > ${(maxBytes / 1024 / 1024).toFixed(1)}MB). Reclaiming ${(bytesToReclaim / 1024 / 1024).toFixed(1)}MB...`);

        // Sort by modification time ascending (LRU)
        fileStats.sort((a, b) => a.mtime - b.mtime);

        const idsToDelete: string[] = [];
        const filesToUnlink: string[] = [];

        for (const fileItem of fileStats) {
          if (bytesToReclaim <= 0) break;
          filesToUnlink.push(fileItem.fullPath);
          bytesToReclaim -= fileItem.size;

          // Infer ID from filename (e.g., gen_123.png -> gen_123)
          const baseName = path.basename(fileItem.name, path.extname(fileItem.name));
          idsToDelete.push(baseName);
        }

        // Unlink files from disk
        for (const filePath of filesToUnlink) {
          try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch (e) {
            console.warn(`[database] Failed to delete cache file ${filePath}:`, e);
          }
        }

        // Atomic SQLite Metadata Purge
        if (idsToDelete.length > 0) {
          const deleteTx = this.db.transaction((ids: string[]) => {
            const stmt = this.db.prepare('DELETE FROM generations WHERE id = ? OR imageUrl LIKE ?');
            for (const id of ids) {
              stmt.run(id, `%${id}%`);
            }
          });
          deleteTx(idsToDelete);
          console.log(`[database] LRU Quota Eviction complete: Purged ${idsToDelete.length} items from disk & SQLite`);
        }

        this.optimizeDatabase();
      }
    } catch (err) {
      console.warn('[database] LRU disk quota enforcement error:', err);
    }
  }

  /**
   * Storage Analytics API:
   * Computes accurate byte sizes for SQLite database file, WAL logs, and image assets.
   */
  public getStorageStats(): StorageStats {
    let dbSizeBytes = 0;
    let imageCacheSizeBytes = 0;
    let itemCount = 0;

    try {
      if (fs.existsSync(this.dbPath)) {
        dbSizeBytes += fs.statSync(this.dbPath).size;
      }
      const walPath = `${this.dbPath}-wal`;
      if (fs.existsSync(walPath)) {
        dbSizeBytes += fs.statSync(walPath).size;
      }
    } catch {}

    try {
      const genDir = path.join(app.getPath('userData'), 'generations');
      if (fs.existsSync(genDir)) {
        const files = fs.readdirSync(genDir);
        for (const file of files) {
          if (file.startsWith('.')) continue;
          try {
            imageCacheSizeBytes += fs.statSync(path.join(genDir, file)).size;
          } catch {}
        }
      }
    } catch {}

    try {
      const countRow = this.db.prepare('SELECT COUNT(*) as count FROM generations').get() as { count: number };
      itemCount = countRow?.count || 0;
    } catch {}

    return {
      dbSizeBytes,
      imageCacheSizeBytes,
      totalSizeBytes: dbSizeBytes + imageCacheSizeBytes,
      maxQuotaBytes: DEFAULT_DISK_QUOTA_BYTES,
      itemCount,
    };
  }

  /**
   * 1-Click User Cache Purging:
   * Clears cached image files from disk, resets generations table, and vacuums SQLite file.
   */
  public purgeCache(): { freedBytes: number } {
    const beforeStats = this.getStorageStats();
    try {
      const genDir = path.join(app.getPath('userData'), 'generations');
      if (fs.existsSync(genDir)) {
        const files = fs.readdirSync(genDir);
        for (const file of files) {
          if (file.startsWith('.')) continue;
          try { fs.unlinkSync(path.join(genDir, file)); } catch {}
        }
      }

      this.db.exec('DELETE FROM generations;');
      this.optimizeDatabase();
      console.log('[database] Complete image cache purge executed cleanly.');
    } catch (err) {
      console.warn('[database] Purge cache failed:', err);
    }

    const afterStats = this.getStorageStats();
    return {
      freedBytes: Math.max(0, beforeStats.totalSizeBytes - afterStats.totalSizeBytes),
    };
  }

  /**
   * WAL Truncation & Disk Vacuuming: Reclaims unallocated database space back to OS.
   */
  public optimizeDatabase() {
    try {
      this.db.pragma('wal_checkpoint(TRUNCATE)');
      this.db.pragma('incremental_vacuum(100)');
      console.log('[database] WAL Checkpoint (TRUNCATE) & Incremental Vacuum complete');
    } catch (err) {
      console.warn('[database] Optimization failed:', err);
    }
  }

  public checkpoint() {
    this.optimizeDatabase();
  }

  public close() {
    if (this.db && this.db.open) {
      this.optimizeDatabase();
      this.db.close();
      (this as any).saveStmt = undefined;
      (this as any).getStmt = undefined;
      (this as any).setSettingStmt = undefined;
      (this as any).getSettingStmt = undefined;
      console.log('[database] Database connection closed safely');
    }
  }
}


