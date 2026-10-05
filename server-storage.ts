import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { isProduction, safeEqual } from "./server-jwt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "data");
const UPLOADS_DIR = path.resolve(__dirname, "uploads");
const DB_FILE = path.join(DATA_DIR, "watermelon_db.json");

/**
 * Append-only audit trail. See `logAudit`.
 *
 * JSON Lines rather than JSON: an append is one `appendFileSync` with no
 * read-modify-write, so a crash mid-write costs the last line instead of
 * the whole file, and the file can be rotated or shipped without parsing it.
 */
const AUDIT_FILE = path.join(DATA_DIR, "audit-log.jsonl");

/** How many recent entries the database keeps for the admin screen. */
const AUDIT_WINDOW = 500;

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Signing key for media URLs. The committed fallback is development-only: with
 * it, anyone who can read this source can mint a valid read URL for any
 * uploaded file, so production must supply its own. assertSecretsConfigured()
 * in server-jwt.ts turns a missing value into a boot failure.
 */
const STORAGE_SECRET =
  process.env.STORAGE_SECRET ||
  (isProduction() ? "" : "watermelon-dev-only-storage-secret-do-not-deploy");

/** Upper bound on how long a signed media URL may stay valid: 7 days. */
export const MAX_SIGNED_URL_TTL_SEC = 86400 * 7;

export interface DatabaseSchema {
  conversations: any[];
  messages: Record<string, any[]>;
  prompts: any[];
  folders: any[];
  knowledge: any[];
  reports: any[];
  trainingCandidates: any[];
  consents: Record<string, any>;
  watermelons: any[];
  auditLogs: any[];
  users: any[];
  otpSessions: Record<string, { code: string; expiresAt: number; attempts: number; phone?: string }>;
  diseaseRecords?: any[];
  /** Uploaded files, keyed by attachment id, so chat can resolve attachment_ids. */
  attachments?: Record<string, any>;
}

/**
 * What a brand-new install starts with.
 *
 * Deliberately almost empty. This seed used to describe a working acoustic
 * ripeness service: a chat thread where the assistant reported 12.2 Brix at
 * 134 Hz, three specimens carrying predicted Brix plus cut-and-taste ground
 * truth signed by a named researcher, a training candidate derived from
 * them, and a reference document tabulating 80-200 Hz against ripeness for
 * five Thai cultivars.
 *
 * None of it was measured and none of it can be. There is no acoustic
 * model, so every knock endpoint answers 503. Seeded records are read back
 * through the same endpoints as real ones, so a farmer comparing their own
 * result against "wm-1" would have been comparing it against fiction, and
 * /research or an export would have carried the invented numbers outward.
 *
 * The demo users stay: an account to sign into is scaffolding, not a
 * measurement. Starter prompts stay minus their invented usage counts.
 * Anything that reports a number a sensor or a person would have had to
 * produce is gone, and stays gone until something produces it.
 */
const defaultSeedData: DatabaseSchema = {
  diseaseRecords: [],
  attachments: {},
  conversations: [],
  messages: {},
  prompts: [
    {
      id: "p-2",
      title: "ตรวจสอบความสุกจากภาพถ่ายรอยแต้มดิน",
      content: "ตรวจสอบภาพแตงโมลูกนี้ ดูสีของรอยแต้มดิน (Ground spot) และสภาพขั้วว่าพร้อมเก็บเกี่ยวหรือยัง",
      category: "ดูลักษณะภายนอก",
      isShared: true,
    },
  ],
  folders: [],
  knowledge: [],
  reports: [],
  trainingCandidates: [],
  consents: {},
  watermelons: [],
  auditLogs: [
    {
      id: "log-1",
      action: "SYSTEM_INIT",
      actorId: "system",
      details: "ระบบฐานข้อมูล Persistent Watermelon AI เริ่มต้นทำงาน",
      timestamp: new Date().toISOString(),
    },
  ],
  users: [
    {
      id: "usr-somchai-01",
      name: "คุณสมชาย เกษตรกรแตงโม",
      phone: "081-234-5678",
      email: "somchai@farmsuphan.com",
      role: "user",
      organization: "แปลงปลูกสุพรรณบุรี",
    },
    {
      id: "usr-dr-wichan-02",
      name: "ดร.วิชาญ วิจัยพืชสวน",
      phone: "089-876-5432",
      email: "dr.wichan@horticulture.ac.th",
      role: "researcher",
      organization: "สถาบันวิจัยพืชสวนแตงไทย",
    },
  ],
  otpSessions: {},
};

class PersistentDatabase {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadFromDisk();
  }

  private loadFromDisk(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("database file does not contain a JSON object");
        }
        // A key that is present but null would crash the first write touching
        // it, so null values fall back to the seed shape instead of merging.
        const merged = structuredClone(defaultSeedData) as unknown as Record<string, unknown>;
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (value !== null && value !== undefined) merged[key] = value;
        }
        return merged as unknown as DatabaseSchema;
      }
    } catch (err) {
      console.warn("⚠️ Could not load database from disk, using seed data:", err);
    }
    // Save seed initially
    this.saveImmediate(defaultSeedData);
    return defaultSeedData;
  }

  public getDb(): DatabaseSchema {
    return this.data;
  }

  public save(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.saveImmediate(this.data);
    }, 200);
  }

  /**
   * Writes any debounced change straight away. Without it, everything written
   * in the 200 ms before the process exits is lost - including a farmer's last
   * chat turn and a just-issued OTP session.
   */
  public flush(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.saveImmediate(this.data);
  }

  private saveImmediate(data: DatabaseSchema): void {
    const serialized = JSON.stringify(data, null, 2);
    const tempPath = DB_FILE + ".tmp";
    try {
      fs.writeFileSync(tempPath, serialized, "utf-8");
      try {
        fs.renameSync(tempPath, DB_FILE);
      } catch {
        // Fallback for Windows EPERM during atomic rename
        fs.copyFileSync(tempPath, DB_FILE);
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // Ignore temp file cleanup errors
        }
      }
    } catch {
      try {
        fs.writeFileSync(DB_FILE, serialized, "utf-8");
      } catch (err) {
        console.error("❌ Failed to persist database to disk:", err);
      }
    }
  }

  /**
   * Records one privileged or security-relevant action.
   *
   * Written twice, on purpose. `auditLogs` in the database keeps the most
   * recent 500 so the admin screen can render a page without reading a file
   * that grows forever - that cap is a display window. `audit-log.jsonl` is
   * the record: append-only, one JSON object per line, never trimmed.
   *
   * Before this, the 500-entry cap was the only copy, so the 501st login
   * silently destroyed the evidence of the first. An audit trail that
   * deletes its own oldest entries cannot answer the question it exists for
   * - who reached this farmer's data, and when.
   *
   * `meta` is optional so the existing call sites keep working, but a new
   * one should pass `requestId` (it ties the entry to the API log line and
   * to whatever the farmer was shown), `resource` for anything addressing a
   * specific record, `outcome` for an attempt that may have been refused,
   * and `reason` when the action reads someone else's data.
   *
   * Never pass an OTP, a token, message content or a file's bytes. The
   * trail records that an action happened, not the material it touched.
   */
  public logAudit(
    action: string,
    actorId: string,
    details: string,
    meta: { requestId?: string; resource?: string; outcome?: "success" | "failure"; reason?: string } = {},
  ) {
    const entry = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      action,
      actorId,
      details,
      timestamp: new Date().toISOString(),
      ...(meta.requestId ? { requestId: meta.requestId } : {}),
      ...(meta.resource ? { resource: meta.resource } : {}),
      ...(meta.outcome ? { outcome: meta.outcome } : {}),
      ...(meta.reason ? { reason: meta.reason } : {}),
    };

    this.appendAuditTrail(entry);

    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > AUDIT_WINDOW) {
      this.data.auditLogs.length = AUDIT_WINDOW;
    }
    this.save();
  }

  /**
   * Appends to the permanent trail.
   *
   * Synchronous and unbuffered: an entry still sitting in a buffer when the
   * process dies is the one most worth having. A failure is reported loudly
   * rather than swallowed - if the trail cannot be written, that is itself
   * the finding - but it does not throw, because losing the request as well
   * would turn a logging fault into an outage.
   */
  private appendAuditTrail(entry: Record<string, unknown>) {
    try {
      fs.appendFileSync(AUDIT_FILE, JSON.stringify(entry) + "\n", "utf-8");
    } catch (err) {
      console.error("❌ AUDIT TRAIL WRITE FAILED - this action is now recorded only in the 500-entry window:", entry.action, err);
    }
  }
}

/** Held by whichever process may write the database. See `acquireWriterLock`. */
const LOCK_FILE = path.join(DATA_DIR, "watermelon_db.lock");

/** Whether a pid is still running. EPERM means it exists under another user. */
function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    return err?.code === "EPERM";
  }
}

/**
 * Refuses to boot a second process that would write this database.
 *
 * Writes go through `saveImmediate`, which serialises the whole in-memory
 * object and renames it over the file. That is atomic - a reader never sees
 * half a file - but atomicity is not isolation. Two processes each hold
 * their own copy of the data, and whichever saves last replaces everything
 * the other did: a farmer's plot, a consent withdrawal, an OTP session. The
 * loss is silent and total, and no amount of care inside one process
 * prevents it.
 *
 * So the constraint is enforced where it can be: one writer, checked at
 * boot. A lock left behind by a process that has since died is removed
 * rather than treated as a conflict, otherwise a crash would need a manual
 * cleanup before the server could start again.
 *
 * This is a stopgap. A JSON file cannot support the payment and quota work
 * in PROJECT_LOG section 4 - those need real transactions, which means
 * PostgreSQL before money moves.
 */
function acquireWriterLock(): void {
  // Tests import this module in-process and in parallel; a lock here would
  // make them fight over a file none of them actually writes.
  if (process.env.NODE_ENV === "test") return;

  if (process.env.WM_DB_ALLOW_MULTIPLE_WRITERS === "true") {
    console.warn(
      "⚠️  WM_DB_ALLOW_MULTIPLE_WRITERS is set. Concurrent writers will overwrite each other's changes.",
    );
    return;
  }

  let holder: number | null = null;
  try {
    const parsed = Number.parseInt(fs.readFileSync(LOCK_FILE, "utf-8").trim(), 10);
    holder = Number.isInteger(parsed) ? parsed : null;
  } catch {
    holder = null; // No lock file yet, or one we cannot read.
  }

  if (holder !== null && holder !== process.pid && processAlive(holder)) {
    throw new Error(
      [
        `Another Watermelon AI server (pid ${holder}) is already writing ${DB_FILE}.`,
        "Two processes sharing this file overwrite each other's changes silently.",
        `Stop that process, or delete ${LOCK_FILE} if it is gone.`,
      ].join("\n"),
    );
  }
  if (holder !== null) {
    console.warn(`⚠️  Removing a stale database lock left behind by pid ${holder}.`);
  }

  try {
    fs.writeFileSync(LOCK_FILE, String(process.pid), "utf-8");
  } catch (err) {
    // Not fatal: refusing to serve because a lock file could not be written
    // would be a worse failure than the race it guards against.
    console.error("❌ Could not write the database lock file. A second writer will not be detected.", err);
  }
}

/** Drops our own lock. Another process's lock is left alone. */
function releaseWriterLock(): void {
  try {
    if (Number.parseInt(fs.readFileSync(LOCK_FILE, "utf-8").trim(), 10) === process.pid) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch {
    // Already gone, or never ours.
  }
}

acquireWriterLock();

export const persistentDb = new PersistentDatabase();

// A debounced write must not be dropped when the server is stopped. Not
// registered under test, where it would rewrite the real database file on the
// way out of a unit-test run.
const REGISTER_EXIT_FLUSH = process.env.NODE_ENV !== "test";
let flushedOnExit = false;
function flushOnExit() {
  if (flushedOnExit) return;
  flushedOnExit = true;
  persistentDb.flush();
  releaseWriterLock();
}
if (REGISTER_EXIT_FLUSH) {
  process.once("exit", flushOnExit);
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.once(signal, () => {
      flushOnExit();
      process.exit(0);
    });
  }
}

// -------------------------------------------------------------
// Cloud Object Storage & Pre-signed URL Service
// -------------------------------------------------------------
export class CloudStorageService {
  /**
   * Generates a tamper-proof HMAC signed URL valid for a specific duration
   */
  public static generateSignedUrl(
    filename: string,
    operation: "read" | "write" = "read",
    expiresInSec: number = 7200
  ): { url: string; token: string; expiresAt: number } {
    if (!STORAGE_SECRET) {
      throw new Error("STORAGE_SECRET is not configured - refusing to sign media URLs.");
    }
    // Callers pass this through from a request body, so it is clamped rather
    // than trusted: an unbounded TTL is a permanent public URL.
    const ttl = Number.isFinite(expiresInSec)
      ? Math.min(Math.max(Math.floor(expiresInSec), 1), MAX_SIGNED_URL_TTL_SEC)
      : 7200;
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    const payload = `${operation}:${filename}:${expiresAt}`;
    const token = crypto
      .createHmac("sha256", STORAGE_SECRET)
      .update(payload)
      .digest("hex");

    const url = `/api/v1/storage/files/${token}/${expiresAt}/${encodeURIComponent(filename)}`;
    return { url, token, expiresAt };
  }

  /**
   * Verifies an incoming signed token
   */
  public static verifySignedUrl(
    token: string,
    filename: string,
    expiresAt: number,
    operation: "read" | "write" = "read"
  ): boolean {
    if (!STORAGE_SECRET) return false;
    // Every argument here comes out of the URL path. `expiresAt` can be NaN
    // or Infinity, either of which makes the expiry comparison pass.
    if (!token || !filename || !Number.isSafeInteger(expiresAt)) {
      return false;
    }
    const now = Math.floor(Date.now() / 1000);
    if (now > expiresAt) {
      return false; // Token expired
    }
    const payload = `${operation}:${filename}:${expiresAt}`;
    const expectedToken = crypto
      .createHmac("sha256", STORAGE_SECRET)
      .update(payload)
      .digest("hex");

    // A token of the wrong length used to throw out of timingSafeEqual, so a
    // forged URL surfaced as a 500 instead of a 403.
    return safeEqual(token, expectedToken);
  }

  /**
   * Saves a file to local persistent storage (or Cloud Storage if configured)
   */
  public static async saveFile(
    filename: string,
    buffer: Buffer
  ): Promise<{ filename: string; path: string; size: number; signedUrl: string }> {
    const safeName = Date.now() + "-" + path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(UPLOADS_DIR, safeName);
    fs.writeFileSync(filePath, buffer);

    const { url } = this.generateSignedUrl(safeName, "read", 86400 * 7); // 7 days
    return {
      filename: safeName,
      path: filePath,
      size: buffer.length,
      signedUrl: url,
    };
  }

  public static getFilePath(filename: string): string | null {
    const safeName = path.basename(filename);
    const fullPath = path.join(UPLOADS_DIR, safeName);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    return null;
  }
}
