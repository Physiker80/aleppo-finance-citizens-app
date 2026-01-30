/**
 * 🗃️ Re-Encryption Job Queue (best-effort)
 * - When KMS rotates keys that require data re-encryption, we enqueue a job
 * - In Node environments, we append to NDJSON file under ./observability
 * - In browser, we push into localStorage list 'kms.reencryption.jobs.v1'
 * - Non-blocking, tolerant to missing fs/localStorage
 */

export type ReencryptJobType = 'database' | 'backup';

export interface ReencryptionJob {
  id: string;
  type: ReencryptJobType;
  oldKeyId: string;
  newKeyId: string;
  createdAt: string; // ISO string
  status: 'queued' | 'processing' | 'done' | 'error';
  note?: string;
}

function generateId(): string {
  try {
    // Use crypto if available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    return 'job_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex');
  } catch {
    // Fallback
    return 'job_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }
}

/**
 * Enqueue a re-encryption job for later processing by a background worker.
 * Best-effort: writes to file when possible, otherwise localStorage.
 */
export function enqueueReencryptionJob(
  type: ReencryptJobType,
  args: { oldKeyId: string; newKeyId: string; note?: string }
): ReencryptionJob | null {
  const job: ReencryptionJob = {
    id: generateId(),
    type,
    oldKeyId: args.oldKeyId,
    newKeyId: args.newKeyId,
    createdAt: new Date().toISOString(),
    status: 'queued',
    note: args.note,
  };

  // Try Node filesystem first
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const dir = path.join(process.cwd(), 'observability');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const file = path.join(dir, 'kms-reencryption-queue.ndjson');
    fs.appendFileSync(file, JSON.stringify(job) + '\n', 'utf8');
    return job;
  } catch {
    // Ignore and try localStorage
  }

  // Try localStorage (browser)
  try {
    if (typeof localStorage !== 'undefined') {
      const key = 'kms.reencryption.jobs.v1';
      const existingRaw = localStorage.getItem(key);
      const list = existingRaw ? JSON.parse(existingRaw) : [];
      list.push(job);
      localStorage.setItem(key, JSON.stringify(list));
      return job;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Convenience helper for logs without throwing.
 */
export function safeLog(...args: any[]) {
  try { console.log(...args); } catch {}
}
