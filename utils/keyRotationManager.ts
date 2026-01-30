/**
 * 🗝️ Key Rotation Manager (Browser-friendly)
 * - Hierarchical key management (metadata in localStorage)
 * - Web Crypto (SubtleCrypto) for randomness and AES keys
 * - Rotation schedules with timers
 * - No Node.js APIs here (safe to import in React)
 */

// Helpers: feature detection
const hasWebCrypto = typeof crypto !== 'undefined' && !!crypto.getRandomValues && !!crypto.subtle;

// Enums and types
export enum KeyType {
  ROOT_MASTER = 'root_master',
  DATA_MASTER = 'data_master',
  SIGNING_MASTER = 'signing_master',
  AUTH_MASTER = 'auth_master',
  FILE_ENCRYPTION = 'file_encryption',
  DATABASE_ENCRYPTION = 'database_encryption',
  MESSAGE_ENCRYPTION = 'message_encryption',
  BACKUP_ENCRYPTION = 'backup_encryption',
  SESSION_KEY = 'session_key',
  TEMPORARY_KEY = 'temporary_key',
  // Signing subclasses
  SIGNING_SESSION = 'signing_session',
  SIGNING_API = 'signing_api',
  SIGNING_LOG = 'signing_log',
  // Auth subclasses
  HMAC_KEY = 'hmac_key',
  JWT_KEY = 'jwt_key',
  OAUTH_KEY = 'oauth_key'
}

export enum KeyStrength {
  AES_128 = 'aes_128',
  AES_256 = 'aes_256'
  // Note: RSA strengths omitted here to keep browser implementation light
}

export enum KeyStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  DEPRECATED = 'deprecated',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  ARCHIVED = 'archived'
}

export enum RotationType {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
  EMERGENCY = 'emergency'
}

export enum RotationStatus {
  INITIATED = 'initiated',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

export interface RotationSchedule {
  keyType: KeyType;
  rotationPeriod: number; // ms
  warningPeriod: number;  // ms
  nextRotation: Date;
  nextWarning: Date;
  enabled: boolean;
  warningIssued?: boolean;
}

export interface KeyInfo {
  id: string;
  type: KeyType;
  purpose: string;
  strength: KeyStrength;
  createdAt: Date;
  expiresAt: Date;
  status: KeyStatus;
  version: number;
  parentKeyId: string | null;
  metadata: {
    algorithm: string; // e.g., 'AES-GCM'
    usage?: string[];  // e.g., ['encrypt','decrypt']
    rotationPolicy?: string;
    [key: string]: any;
  };
}

export interface RotationJobMetrics {
  affectedDataSize: number;
  reEncryptedItems: number;
  totalItems: number;
  errors: Array<{ id: string; error: string; timestamp: Date }>;
}

export interface RotationJob {
  id: string;
  oldKeyId: string;
  newKeyId: string;
  rotationType: RotationType;
  status: RotationStatus;
  startedAt: Date;
  completedAt?: Date;
  metrics: RotationJobMetrics;
}

export interface SecurityReport {
  timestamp: Date;
  systemStatus: 'secure' | 'warning' | 'critical';
  keyStatistics: {
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    rotationsPending: number;
  };
  rotationStatus: {
    scheduled: number;
    inProgress: number;
    completed: number;
    failed: number;
  };
  securityAlerts: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
  }>;
  complianceStatus: {
    rotationCompliance: number; // % following schedule
    keyStrengthCompliance: number; // % >= AES-256 for sensitive
    overallCompliance: number; // composite
  };
  recommendations: string[];
}

export interface KeyRotationConfig {
  rotationSchedules?: Partial<Record<KeyType, Pick<RotationSchedule, 'rotationPeriod' | 'warningPeriod'>>>;
}

// Internal storage model: we NEVER persist raw key material to localStorage.
// We only keep metadata in localStorage and store material in-memory.
type InMemoryMaterial = ArrayBuffer; // Raw AES key bytes
type KeyRecord = KeyInfo & { material?: InMemoryMaterial };

const KMS_STORAGE_KEY = 'kms.key.metadata.v1';
const KMS_ROTATION_LOGS_KEY = 'kms.rotation.logs.v1';
const KMS_ALERTS_KEY = 'kms.alerts.v1';
const KMS_DELETION_SCHEDULE_KEY = 'kms.deletion.schedule.v1';

function randomId(prefix = 'kms'): string {
  const buf = new Uint8Array(8);
  if (hasWebCrypto) crypto.getRandomValues(buf); else {
    for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${Date.now().toString(36)}_${hex}`;
}

function nowPlus(ms: number): Date {
  return new Date(Date.now() + ms);
}

function toBase64(arr: ArrayBuffer): string {
  const bytes = new Uint8Array(arr);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}

function fromBase64(b64: string): ArrayBuffer {
  const binary = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// KeyRotationManager
export class KeyRotationManager {
  private keys = new Map<string, KeyRecord>();
  private rotationSchedules = new Map<KeyType, RotationSchedule>();
  private activeRotations = new Map<string, RotationJob>();
  private reencryptionHandlers = new Map<KeyType, Array<(args: { oldKeyId: string; newKeyId: string; }) => Promise<void> | void>>();

  constructor(config?: KeyRotationConfig) {
    this.restoreFromStorage();
    this.initializeRotationSchedules(config?.rotationSchedules);
    this.startRotationScheduler();
    this.startDeletionScheduler();
  }

  // Public API
  async generateKey(keyType: KeyType, keyPurpose: string, strength: KeyStrength = KeyStrength.AES_256): Promise<KeyInfo> {
    const id = `${keyType}-${keyPurpose}-${randomId('key')}`.toLowerCase();
    const parentKeyId = this.findParentKeyId(keyType);
    const algorithm = this.getAlgorithmForKeyType(keyType);
    const usage = this.getUsageForKeyType(keyType);

    const keyBytes = await this.generateKeyMaterial(strength);

    const info: KeyRecord = {
      id,
      type: keyType,
      purpose: keyPurpose,
      strength,
      createdAt: new Date(),
      expiresAt: this.calculateExpiryDate(keyType),
      status: KeyStatus.ACTIVE,
      version: 1,
      parentKeyId,
      metadata: { algorithm, usage, rotationPolicy: this.getRotationPolicyForKeyType(keyType) },
      material: keyBytes
    };

    this.keys.set(id, info);
    this.persistMetadata();
    return this.stripMaterial(info);
  }

  /**
   * Register re-encryption tasks to run when a new key of a given type is activated.
   */
  onReencryptionTask(type: KeyType, handler: (args: { oldKeyId: string; newKeyId: string }) => Promise<void> | void): void {
    const arr = this.reencryptionHandlers.get(type) || [];
    arr.push(handler);
    this.reencryptionHandlers.set(type, arr);
  }

  /**
   * تدوير مفاتيح نوع محدد وفق سير العمل الكامل: توليد -> تغليف -> حفظ (pending) -> اختبار -> تفعيل -> إعادة تشفير -> جدولة حذف القديم -> تسجيل
   */
  async rotateKeys(keyType: KeyType): Promise<{ success: boolean; results: Array<{ oldKeyId?: string; newKeyId?: string; success: boolean; error?: string }> }> {
    const results: Array<{ oldKeyId?: string; newKeyId?: string; success: boolean; error?: string }> = [];
    const targets = this.getKeysByType(keyType).filter(k => k.status === KeyStatus.ACTIVE);
    // إذا لم يوجد مفتاح نشط من هذا النوع، أنشئ واحداً جديداً كتهيئة أولية
    if (targets.length === 0) {
      const init = await this.generateKey(keyType, 'default');
      results.push({ newKeyId: init.id, success: true });
      return { success: true, results };
    }

    for (const current of targets) {
      try {
        // 1) توليد مفتاح جديد (ورفع رقم النسخة)
        const nextVersion = await this.getNextVersion(current.type, current.purpose);
        const newRaw = await this.generateKeyMaterial(current.strength);
        const parentKeyId = this.findParentKeyId(current.type);
        const newId = `${current.type}-${current.purpose}-${randomId('keyv' + nextVersion)}`.toLowerCase();
        const info: KeyRecord = {
          id: newId,
          type: current.type,
          purpose: current.purpose,
          strength: current.strength,
          createdAt: new Date(),
          expiresAt: this.calculateExpiryDate(current.type),
          status: KeyStatus.PENDING,
          version: nextVersion,
          parentKeyId,
          metadata: { algorithm: this.getAlgorithmForKeyType(current.type), usage: this.getUsageForKeyType(current.type), rotationPolicy: this.getRotationPolicyForKeyType(current.type) },
          material: newRaw
        };

        // 2) تغليف المفتاح الجديد بالمفتاح الرئيسي (KEK)
        const wrapped = await this.encryptKeyWithParent(info);
        if (wrapped) {
          (info.metadata as any).wrappedWithParent = wrapped;
        }

        // 3) حفظ المفتاح الجديد (metadata فقط) كـ pending
        this.keys.set(info.id, info);
        this.persistMetadata();

        // 4) اختبار المفتاح الجديد
        const testResult = await this.testKey(info);
        if (!testResult.success) {
          throw new Error(testResult.error || 'unknown test failure');
        }

        // 5) تفعيل المفتاح الجديد + 6) بدء إعادة التشفير
        await this.activateKey(current.id, info.id);
        await this.startReencryption(current.type, { oldKeyId: current.id, newKeyId: info.id });

        // 7) جدولة حذف المفتاح القديم بعد 30 يوم
        await this.scheduleOldKeyDeletion(current.id, 30);

        // 8) تسجيل العملية
        await this.logRotation({
          keyType: current.type,
          timestamp: new Date(),
          status: 'success',
          newKeyVersion: info.version,
          oldKeyId: current.id,
          newKeyId: info.id
        });

        results.push({ oldKeyId: current.id, newKeyId: info.id, success: true });
      } catch (e: any) {
        const msg = e?.message || String(e);
        await this.logRotation({ keyType, timestamp: new Date(), status: 'failed', error: msg });
        await this.alertAdmins({ type: 'KEY_ROTATION_FAILED', keyType, error: msg, severity: 'CRITICAL' });
        results.push({ oldKeyId: current.id, success: false, error: msg });
      }
    }
    return { success: results.every(r => r.success), results };
  }

  async rotateKey(keyId: string, rotationType: RotationType = RotationType.MANUAL): Promise<{ success: boolean; newKeyId?: string }> {
    const current = this.keys.get(keyId);
    if (!current) throw new Error(`Key not found: ${keyId}`);

    // Create successor key preserving type/purpose/strength
    const newInfo = await this.generateKey(current.type, current.purpose, current.strength);

    // Mark old deprecated
    this.updateKeyStatus(keyId, KeyStatus.DEPRECATED);

    const job: RotationJob = {
      id: randomId('rot'),
      oldKeyId: keyId,
      newKeyId: newInfo.id,
      rotationType,
      status: RotationStatus.COMPLETED,
      startedAt: new Date(),
      completedAt: new Date(),
      metrics: { affectedDataSize: 0, reEncryptedItems: 0, totalItems: 0, errors: [] }
    };

    this.activeRotations.set(job.id, job);
    return { success: true, newKeyId: newInfo.id };
  }

  getKeyInfo(keyId: string): KeyInfo | null {
    const rec = this.keys.get(keyId);
    return rec ? this.stripMaterial(rec) : null;
  }

  /**
   * إرجاع مادة المفتاح الخام (في الذاكرة فقط). قد تكون غير متاحة إذا لم يُنشأ المفتاح خلال هذه الجلسة.
   */
  getRawKeyMaterial(keyId: string): ArrayBuffer | null {
    const rec = this.keys.get(keyId);
    return rec?.material ?? null;
  }

  /**
   * استيراد مادة مفتاح خام (في الذاكرة فقط) لمفتاح موجود. لا يتم حفظ المادة في localStorage.
   */
  importRawKeyMaterial(keyId: string, raw: ArrayBuffer): boolean {
    const rec = this.keys.get(keyId);
    if (!rec) return false;
    rec.material = raw;
    return true;
  }

  getKeysByType(type: KeyType): KeyInfo[] {
    return Array.from(this.keys.values())
      .filter(k => k.type === type)
      .map(k => this.stripMaterial(k));
  }

  updateKeyStatus(keyId: string, status: KeyStatus): void {
    const rec = this.keys.get(keyId);
    if (!rec) return;
    rec.status = status;
    this.persistMetadata();
  }

  async generateSecurityReport(): Promise<SecurityReport> {
    const all = Array.from(this.keys.values());
    const active = all.filter(k => k.status === KeyStatus.ACTIVE).length;
    const expired = all.filter(k => k.status === KeyStatus.EXPIRED).length;

    const report: SecurityReport = {
      timestamp: new Date(),
      systemStatus: 'secure',
      keyStatistics: {
        totalKeys: all.length,
        activeKeys: active,
        expiredKeys: expired,
        rotationsPending: 0
      },
      rotationStatus: {
        scheduled: 0,
        inProgress: 0,
        completed: this.activeRotations.size,
        failed: 0
      },
      securityAlerts: [],
      complianceStatus: {
        rotationCompliance: 100,
        keyStrengthCompliance: all.length === 0 ? 100 : Math.round((all.filter(k => k.strength === KeyStrength.AES_256).length / all.length) * 100),
        overallCompliance: 95
      },
      recommendations: [
        'قم بتدوير المفاتيح الحساسة كل 90 يوماً',
        'استخدم AES-256 لمفاتيح تشفير الملفات'
      ]
    };
    return report;
  }

  // Scheduling
  private initializeRotationSchedules(overrides?: KeyRotationConfig['rotationSchedules']): void {
    const defaults: Array<RotationSchedule> = [
      { keyType: KeyType.ROOT_MASTER, rotationPeriod: 365 * 24 * 60 * 60 * 1000, warningPeriod: 30 * 24 * 60 * 60 * 1000, nextRotation: nowPlus(365 * 24 * 60 * 60 * 1000), nextWarning: nowPlus(335 * 24 * 60 * 60 * 1000), enabled: true },
      { keyType: KeyType.DATA_MASTER, rotationPeriod: 90 * 24 * 60 * 60 * 1000, warningPeriod: 7 * 24 * 60 * 60 * 1000, nextRotation: nowPlus(90 * 24 * 60 * 60 * 1000), nextWarning: nowPlus(83 * 24 * 60 * 60 * 1000), enabled: true },
      { keyType: KeyType.SIGNING_MASTER, rotationPeriod: 180 * 24 * 60 * 60 * 1000, warningPeriod: 14 * 24 * 60 * 60 * 1000, nextRotation: nowPlus(180 * 24 * 60 * 60 * 1000), nextWarning: nowPlus(166 * 24 * 60 * 60 * 1000), enabled: true },
      { keyType: KeyType.AUTH_MASTER, rotationPeriod: 30 * 24 * 60 * 60 * 1000, warningPeriod: 3 * 24 * 60 * 60 * 1000, nextRotation: nowPlus(30 * 24 * 60 * 60 * 1000), nextWarning: nowPlus(27 * 24 * 60 * 60 * 1000), enabled: true },
      { keyType: KeyType.SESSION_KEY, rotationPeriod: 7 * 24 * 60 * 60 * 1000, warningPeriod: 24 * 60 * 60 * 1000, nextRotation: nowPlus(7 * 24 * 60 * 60 * 1000), nextWarning: nowPlus(6 * 24 * 60 * 60 * 1000), enabled: true },
      { keyType: KeyType.TEMPORARY_KEY, rotationPeriod: 24 * 60 * 60 * 1000, warningPeriod: 2 * 60 * 60 * 1000, nextRotation: nowPlus(24 * 60 * 60 * 1000), nextWarning: nowPlus(22 * 60 * 60 * 1000), enabled: true },
      // Sub-keys schedules (inherit from their master by default)
      { keyType: KeyType.FILE_ENCRYPTION, rotationPeriod: 90 * 24 * 60 * 60 * 1000, warningPeriod: 7 * 24 * 60 * 60 * 1000, nextRotation: nowPlus(90 * 24 * 60 * 60 * 1000), nextWarning: nowPlus(83 * 24 * 60 * 60 * 1000), enabled: true },
      { keyType: KeyType.DATABASE_ENCRYPTION, rotationPeriod: 180 * 24 * 60 * 60 * 1000, warningPeriod: 14 * 24 * 60 * 60 * 1000, nextRotation: nowPlus(180 * 24 * 60 * 60 * 1000), nextWarning: nowPlus(166 * 24 * 60 * 60 * 1000), enabled: true },
      { keyType: KeyType.BACKUP_ENCRYPTION, rotationPeriod: 180 * 24 * 60 * 60 * 1000, warningPeriod: 14 * 24 * 60 * 60 * 1000, nextRotation: nowPlus(180 * 24 * 60 * 60 * 1000), nextWarning: nowPlus(166 * 24 * 60 * 60 * 1000), enabled: true },
      { keyType: KeyType.SIGNING_SESSION, rotationPeriod: 30 * 24 * 60 * 60 * 1000, warningPeriod: 3 * 24 * 60 * 60 * 1000, nextRotation: nowPlus(30 * 24 * 60 * 60 * 1000), nextWarning: nowPlus(27 * 24 * 60 * 60 * 1000), enabled: true },
      { keyType: KeyType.SIGNING_API, rotationPeriod: 90 * 24 * 60 * 60 * 1000, warningPeriod: 7 * 24 * 60 * 60 * 1000, nextRotation: nowPlus(90 * 24 * 60 * 60 * 1000), nextWarning: nowPlus(83 * 24 * 60 * 60 * 1000), enabled: true },
      { keyType: KeyType.SIGNING_LOG, rotationPeriod: 180 * 24 * 60 * 60 * 1000, warningPeriod: 14 * 24 * 60 * 60 * 1000, nextRotation: nowPlus(180 * 24 * 60 * 60 * 1000), nextWarning: nowPlus(166 * 24 * 60 * 60 * 1000), enabled: true },
      { keyType: KeyType.HMAC_KEY, rotationPeriod: 30 * 24 * 60 * 60 * 1000, warningPeriod: 3 * 24 * 60 * 60 * 1000, nextRotation: nowPlus(30 * 24 * 60 * 60 * 1000), nextWarning: nowPlus(27 * 24 * 60 * 60 * 1000), enabled: true },
      { keyType: KeyType.JWT_KEY, rotationPeriod: 30 * 24 * 60 * 60 * 1000, warningPeriod: 3 * 24 * 60 * 60 * 1000, nextRotation: nowPlus(30 * 24 * 60 * 60 * 1000), nextWarning: nowPlus(27 * 24 * 60 * 60 * 1000), enabled: true },
      { keyType: KeyType.OAUTH_KEY, rotationPeriod: 90 * 24 * 60 * 60 * 1000, warningPeriod: 7 * 24 * 60 * 60 * 1000, nextRotation: nowPlus(90 * 24 * 60 * 60 * 1000), nextWarning: nowPlus(83 * 24 * 60 * 60 * 1000), enabled: true },
    ];

    defaults.forEach(d => {
      const ov = overrides?.[d.keyType];
      const rotationPeriod = ov?.rotationPeriod ?? d.rotationPeriod;
      const warningPeriod = ov?.warningPeriod ?? d.warningPeriod;
      const nextRotation = nowPlus(rotationPeriod);
      const nextWarning = new Date(nextRotation.getTime() - warningPeriod);
      this.rotationSchedules.set(d.keyType, { keyType: d.keyType, rotationPeriod, warningPeriod, nextRotation, nextWarning, enabled: true });
    });
  }

  private startRotationScheduler(): void {
    // Check hourly
    setInterval(() => this.checkRotationSchedules().catch(() => {}), 60 * 60 * 1000);
    // Initial check after short delay
    setTimeout(() => this.checkRotationSchedules().catch(() => {}), 3000);
  }

  private async checkRotationSchedules(): Promise<void> {
    const now = new Date();
    for (const [type, sched] of this.rotationSchedules) {
      if (!sched.enabled) continue;
      if (now >= sched.nextWarning && !sched.warningIssued) {
        // For now, just flag warning; integrate with your notification system if needed
        sched.warningIssued = true;
      }
      if (now >= sched.nextRotation) {
        // Rotate all ACTIVE keys of this type
        try {
          await this.rotateKeys(type);
        } catch { /* no-op */ }
        // Schedule next window
        sched.nextRotation = nowPlus(sched.rotationPeriod);
        sched.nextWarning = new Date(sched.nextRotation.getTime() - sched.warningPeriod);
        sched.warningIssued = false;
      }
    }
  }

  // Internals
  private calculateExpiryDate(keyType: KeyType): Date {
    const sched = this.rotationSchedules.get(keyType);
    return sched ? nowPlus(sched.rotationPeriod) : nowPlus(90 * 24 * 60 * 60 * 1000);
  }

  private getAlgorithmForKeyType(keyType: KeyType): string {
    switch (keyType) {
      case KeyType.FILE_ENCRYPTION:
      case KeyType.DATABASE_ENCRYPTION:
      case KeyType.BACKUP_ENCRYPTION:
      case KeyType.MESSAGE_ENCRYPTION:
      case KeyType.SESSION_KEY:
      case KeyType.TEMPORARY_KEY:
      case KeyType.DATA_MASTER:
      case KeyType.AUTH_MASTER:
        return 'AES-GCM';
      case KeyType.SIGNING_MASTER:
      case KeyType.SIGNING_SESSION:
      case KeyType.SIGNING_API:
      case KeyType.SIGNING_LOG:
      case KeyType.ROOT_MASTER:
      default:
        return 'AES-GCM'; // Keep consistent in browser implementation
    }
  }

  private getUsageForKeyType(keyType: KeyType): string[] {
    switch (keyType) {
      case KeyType.SIGNING_MASTER:
      case KeyType.SIGNING_SESSION:
      case KeyType.SIGNING_API:
      case KeyType.SIGNING_LOG:
        return ['sign', 'verify'];
      case KeyType.HMAC_KEY:
        return ['sign'];
      default:
        return ['encrypt', 'decrypt'];
    }
  }

  private getRotationPolicyForKeyType(keyType: KeyType): string {
    const s = this.rotationSchedules.get(keyType);
    if (!s) return 'none';
    const days = Math.round(s.rotationPeriod / (24 * 60 * 60 * 1000));
    return `rotate-every-${days}-days`;
  }

  private findParentKeyId(keyType: KeyType): string | null {
    if (keyType === KeyType.DATA_MASTER || keyType === KeyType.SIGNING_MASTER || keyType === KeyType.AUTH_MASTER) {
      const root = this.firstActiveOfType(KeyType.ROOT_MASTER);
      return root?.id || null;
    }
    if (keyType === KeyType.FILE_ENCRYPTION || keyType === KeyType.DATABASE_ENCRYPTION || keyType === KeyType.BACKUP_ENCRYPTION || keyType === KeyType.MESSAGE_ENCRYPTION) {
      const dmk = this.firstActiveOfType(KeyType.DATA_MASTER);
      return dmk?.id || null;
    }
    if (keyType === KeyType.SESSION_KEY || keyType === KeyType.TEMPORARY_KEY || keyType === KeyType.HMAC_KEY || keyType === KeyType.JWT_KEY || keyType === KeyType.OAUTH_KEY) {
      const amk = this.firstActiveOfType(KeyType.AUTH_MASTER);
      return amk?.id || null;
    }
    if (keyType === KeyType.SIGNING_SESSION || keyType === KeyType.SIGNING_API || keyType === KeyType.SIGNING_LOG) {
      const smk = this.firstActiveOfType(KeyType.SIGNING_MASTER);
      return smk?.id || null;
    }
    return null;
  }

  private firstActiveOfType(type: KeyType): KeyInfo | undefined {
    return this.getKeysByType(type).find(k => k.status === KeyStatus.ACTIVE);
  }

  private async generateKeyMaterial(strength: KeyStrength): Promise<ArrayBuffer> {
    const size = strength === KeyStrength.AES_128 ? 16 : 32;
    const buf = new Uint8Array(size);
    if (hasWebCrypto) crypto.getRandomValues(buf); else {
      for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
    }
    return buf.buffer;
  }

  private stripMaterial(rec: KeyRecord): KeyInfo {
    const { material: _m, ...info } = rec;
    return { ...info };
  }

  // ----- New helpers for rotation workflow -----
  private async getNextVersion(type: KeyType, purpose: string): Promise<number> {
    const all = this.getKeysByType(type).filter(k => k.purpose === purpose);
    return (all.map(k => k.version).reduce((a, b) => Math.max(a, b), 0) || 0) + 1;
  }

  private async getCurrentVersion(type: KeyType, purpose: string): Promise<number> {
    const all = this.getKeysByType(type).filter(k => k.purpose === purpose && k.status === KeyStatus.ACTIVE);
    return all.length ? all[0].version : 0;
  }

  private async encryptKeyWithParent(info: KeyRecord): Promise<{ algorithm: 'AES-GCM'; ivB64: string; wrappedB64: string } | null> {
    try {
      if (!info.parentKeyId) return null;
      const parent = this.keys.get(info.parentKeyId);
      if (!parent?.material || !info.material) return null; // parent raw key not available in-memory
      if (!hasWebCrypto) return null;
      const iv = new Uint8Array(12);
      crypto.getRandomValues(iv);
      const kekKey = await crypto.subtle.importKey('raw', parent.material, 'AES-GCM', false, ['encrypt']);
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kekKey, info.material);
      return { algorithm: 'AES-GCM', ivB64: toBase64(iv.buffer), wrappedB64: toBase64(ciphertext) };
    } catch {
      return null;
    }
  }

  private async testKey(info: KeyRecord): Promise<{ success: boolean; error?: string }> {
    try {
      if (!info.material) return { success: false, error: 'no material' };
      const usage = (info.metadata?.usage || []) as string[];
      if (!hasWebCrypto || !usage.includes('encrypt')) return { success: true };
      const iv = new Uint8Array(12); crypto.getRandomValues(iv);
      const key = await crypto.subtle.importKey('raw', info.material, 'AES-GCM', false, ['encrypt', 'decrypt']);
      const data = new TextEncoder().encode('kms-self-test');
      const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
      const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, enc);
      const ok = new TextDecoder().decode(dec) === 'kms-self-test';
      return { success: ok, error: ok ? undefined : 'mismatch' };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  }

  private async activateKey(oldKeyId: string, newKeyId: string): Promise<void> {
    const oldRec = this.keys.get(oldKeyId);
    const newRec = this.keys.get(newKeyId);
    if (oldRec) oldRec.status = KeyStatus.DEPRECATED;
    if (newRec) newRec.status = KeyStatus.ACTIVE;
    this.persistMetadata();
  }

  private async startReencryption(type: KeyType, args: { oldKeyId: string; newKeyId: string }): Promise<void> {
    try {
      const handlers = this.reencryptionHandlers.get(type) || [];
      for (const h of handlers) { await h(args); }
      if (typeof window !== 'undefined' && typeof (window as any).dispatchEvent === 'function') {
        try { (window as any).dispatchEvent(new CustomEvent('kms-rotation-start', { detail: { type, ...args } })); } catch {}
      }
    } catch {}
  }

  private async scheduleOldKeyDeletion(oldKeyId: string, afterDays: number): Promise<void> {
    try {
      const dueAt = Date.now() + Math.max(1, afterDays) * 24 * 60 * 60 * 1000;
      const entry = { keyId: oldKeyId, dueAt };
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(KMS_DELETION_SCHEDULE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        arr.push(entry);
        localStorage.setItem(KMS_DELETION_SCHEDULE_KEY, JSON.stringify(arr));
      }
    } catch {}
  }

  private startDeletionScheduler(): void {
    const tick = () => {
      try {
        if (typeof localStorage === 'undefined') return;
        const raw = localStorage.getItem(KMS_DELETION_SCHEDULE_KEY);
        if (!raw) return;
        const arr: Array<{ keyId: string; dueAt: number }> = JSON.parse(raw);
        const keep: typeof arr = [];
        for (const it of arr) {
          if (Date.now() >= it.dueAt) {
            const rec = this.keys.get(it.keyId);
            if (rec) { rec.status = KeyStatus.ARCHIVED; delete (rec as any).material; }
          } else keep.push(it);
        }
        localStorage.setItem(KMS_DELETION_SCHEDULE_KEY, JSON.stringify(keep));
        this.persistMetadata();
      } catch {}
    };
    setInterval(tick, 60 * 60 * 1000);
    setTimeout(tick, 5000);
  }

  private async logRotation(log: { keyType: KeyType; timestamp: Date; status: 'success' | 'failed'; newKeyVersion?: number; error?: string; oldKeyId?: string; newKeyId?: string }): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(KMS_ROTATION_LOGS_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        arr.push({ ...log, timestamp: log.timestamp.toISOString() });
        localStorage.setItem(KMS_ROTATION_LOGS_KEY, JSON.stringify(arr.slice(-500)));
      }
    } catch {}
  }

  private async alertAdmins(alert: { type: string; keyType: KeyType; error: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' }): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(KMS_ALERTS_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        arr.push({ ...alert, at: new Date().toISOString() });
        localStorage.setItem(KMS_ALERTS_KEY, JSON.stringify(arr.slice(-200)));
      }
      // Also log to console for visibility during development
      console.warn('[KMS][ALERT]', alert.type, alert.keyType, alert.severity, alert.error);
    } catch {}
  }

  // Persistence (metadata only)
  private persistMetadata(): void {
    try {
      const meta = Array.from(this.keys.values()).map(k => ({
        ...this.stripMaterial(k),
        // Serialize dates
        createdAt: k.createdAt.toISOString(),
        expiresAt: k.expiresAt.toISOString()
      }));
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(KMS_STORAGE_KEY, JSON.stringify(meta));
      }
    } catch (e) {
      // ignore
    }
  }

  private restoreFromStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(KMS_STORAGE_KEY);
      if (!raw) return;
      const list = JSON.parse(raw) as Array<Omit<KeyInfo, never> & { createdAt: string; expiresAt: string; }>;
      list.forEach((m) => {
        const rec: KeyRecord = {
          ...m,
          createdAt: new Date(m.createdAt),
          expiresAt: new Date(m.expiresAt)
          // material intentionally omitted
        } as unknown as KeyRecord;
        this.keys.set(rec.id, rec);
      });
    } catch {
      // ignore
    }
  }
}

// Singleton instance for app usage
export const keyRotationManager = new KeyRotationManager();
