/**
 * 🔐 خدمة التشفير المتكاملة
 * نظام الاستعلامات والشكاوى - بوابة الخدمات الإلكترونية
 * 
 * خدمة شاملة تجمع جميع وظائف التشفير:
 * - تشفير الملفات المرفوعة
 * - تشفير البيانات الحساسة
 * - إدارة المفاتيح
 * - التحقق من سلامة البيانات
 */

import { fileEncryption, encryptUploadedFile, decryptFileForDownload, type FileMetadata } from '../utils/fileEncryption';
import * as crypto from 'crypto';
import { databaseEncryption, DatabaseEncryption } from '../utils/databaseEncryption';
import { wrapDekWithKek, unwrapDekWithKek, generateDek } from '../utils/envelopeEncryption';
import * as os from 'os';
import * as path from 'path';

// واجهة خدمة التشفير
export interface EncryptionService {
  // تشفير الملفات
  encryptFile(file: File, password: string, userId?: string, ticketId?: string): Promise<EncryptionResult>;
  decryptFile(encryptedPath: string, password: string): Promise<DecryptionResult>;
  
  // تشفير البيانات
  encryptData(data: string, password: string): Promise<string>;
  decryptData(encryptedData: string, password: string): Promise<string>;
  
  // إدارة المفاتيح
  generateSecureKey(password: string, salt?: Buffer): Buffer;
  generateSalt(): Buffer;
  // تشفير قاعدة البيانات (حقول)
  encryptField(plaintext: string, masterKey: Buffer | string): Promise<string>;
  decryptField(encryptedData: string, masterKey: Buffer | string): Promise<string>;
  // Envelope encryption API (ملفات)
  encryptFileEnvelope(file: File, kmsKeyId?: string, userId?: string, ticketId?: string): Promise<EncryptionResult>;
  decryptFileEnvelope(encryptedPath: string): Promise<DecryptionResult>;
  
  // التحقق من السلامة
  verifyChecksum(filePath: string, expectedChecksum: string): Promise<boolean>;
  calculateChecksum(data: Buffer | string): string;
}

// نتيجة التشفير
export interface EncryptionResult {
  success: boolean;
  encryptedPath: string;
  checksum: string;
  metadata: FileMetadata;
}

// نتيجة فك التشفير
export interface DecryptionResult {
  success: boolean;
  decryptedPath: string;
  verified: boolean;
  metadata: FileMetadata | null;
}

/**
 * تطبيق خدمة التشفير المتكاملة
 */
class EncryptionServiceImpl implements EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bit
  private readonly iterations = 100000; // PBKDF2 iterations
  // علم لتمكين تكامل KMS بشكل اختياري بدون كسر التوافق
  private readonly enableKmsIntegration = true;
  private readonly dbEnc: DatabaseEncryption = databaseEncryption;

  constructor() {
    console.log('🔐 تم تهيئة خدمة التشفير المتكاملة');
    // ربط مهام إعادة التشفير عند تدوير مفاتيح KMS
    // - عند تدوير مفتاح FILE_ENCRYPTION: إعادة تغليف DEK ب KEK الجديد (تحديث metadata فقط)
    // - بيئات Node (الاختبارات) قد لا تحتوي localStorage، لذا نتجاهل بهدوء
    (async () => {
      try {
        const { keyRotationManager, KeyType } = await import('../utils/keyRotationManager');
        const { enqueueReencryptionJob, safeLog } = await import('../utils/reEncryptionQueue');
        keyRotationManager.onReencryptionTask(KeyType.FILE_ENCRYPTION, async ({ oldKeyId, newKeyId }) => {
          try {
            await this.rewrapEnvelopedFiles(oldKeyId, newKeyId);
          } catch (e) {
            console.warn('[KMS] فشل إعادة تغليف DEKs للملفات:', e);
          }
        });
        // نقاط توصيل مستقبلية: إعادة تشفير قواعد البيانات والنسخ الاحتياطية (تتطلب مهام غير متزامنة خارجية)
        keyRotationManager.onReencryptionTask(KeyType.DATABASE_ENCRYPTION, async ({ oldKeyId, newKeyId }) => {
          try {
            const job = enqueueReencryptionJob('database', { oldKeyId, newKeyId, note: 'Rotate DB fields to new KEK' });
            safeLog('[KMS] تمت جدولة إعادة تشفير الحقول في قاعدة البيانات', { oldKeyId, newKeyId, jobId: job?.id });
          } catch (e) {
            console.warn('[KMS] فشل جدولة إعادة تشفير قاعدة البيانات:', e);
          }
        });
        keyRotationManager.onReencryptionTask(KeyType.BACKUP_ENCRYPTION, async ({ oldKeyId, newKeyId }) => {
          try {
            const job = enqueueReencryptionJob('backup', { oldKeyId, newKeyId, note: 'Rotate backup artifacts to new KEK' });
            safeLog('[KMS] تمت جدولة إعادة تشفير النسخ الاحتياطية', { oldKeyId, newKeyId, jobId: job?.id });
          } catch (e) {
            console.warn('[KMS] فشل جدولة إعادة تشفير النسخ الاحتياطية:', e);
          }
        });
      } catch (e) {
        // لا توقف الخدمة إذا لم يتوفر KMS (أو حصل خطأ أثناء التحميل الديناميكي)
        console.debug('[KMS] تعذر ربط مهام إعادة التشفير الآن (سيتم تجاهلها)', e);
      }
    })();
  }

  /**
   * تشفير ملف مرفوع
   * @param file الملف المرفوع
   * @param password كلمة مرور المستخدم
   * @param userId معرف المستخدم
   * @param ticketId معرف التذكرة
   * @returns Promise<EncryptionResult>
   */
  async encryptFile(
    file: File, 
    password: string, 
    userId?: string, 
    ticketId?: string
  ): Promise<EncryptionResult> {
    try {
      console.log(`🔐 تشفير الملف: ${file.name} (${this.formatFileSize(file.size)})`);

      // التحقق من صحة البيانات المدخلة
      if (!file || file.size === 0) {
        throw new Error('الملف غير صالح أو فارغ');
      }

      if (!password || password.length < 8) {
        throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      }

      const startTime = Date.now();

      // اختيارياً: الحصول على معرف مفتاح من KMS لاستخدامه كبيانات وصفية
      let kmsKeyId: string | undefined = undefined;
      if (this.enableKmsIntegration) {
        try {
          const { keyRotationManager, KeyType } = await import('../utils/keyRotationManager');
          // الحصول على أول مفتاح نشط لتشفير الملفات أو إنشاؤه إن لم يوجد
          const existing = keyRotationManager.getKeysByType(KeyType.FILE_ENCRYPTION).find(k => k.status === 'active');
          if (existing) {
            kmsKeyId = existing.id;
          } else {
            const created = await keyRotationManager.generateKey(KeyType.FILE_ENCRYPTION, 'attachments');
            kmsKeyId = created.id;
          }
        } catch {
          // لا توقف العملية إذا فشل KMS
        }
      }

      // تشفير الملف باستخدام نظام تشفير الملفات مع تمرير بيانات KMS الاختيارية ضمن extras (يتم حفظها داخل metadata)
      const result = await encryptUploadedFile(file, password, userId, ticketId);
      // دمج kmsKeyId داخل metadata إن تم الحصول عليه
      if (kmsKeyId) {
        (result.metadata as any).kmsKeyId = kmsKeyId;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✅ تم تشفير الملف في ${duration}ms - Checksum: ${result.checksum.substring(0, 16)}...`);

      return {
        success: result.success,
        encryptedPath: result.encryptedPath,
        checksum: result.checksum,
        metadata: result.metadata
      };
    } catch (error) {
      console.error('🚨 فشل تشفير الملف:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف في التشفير';
      throw new Error(`فشل تشفير الملف: ${errorMessage}`);
    }
  }

  /**
   * فك تشفير ملف
   * @param encryptedPath مسار الملف المشفر
   * @param password كلمة مرور فك التشفير
   * @returns Promise<DecryptionResult>
   */
  async decryptFile(encryptedPath: string, password: string): Promise<DecryptionResult> {
    try {
      console.log(`🔓 فك تشفير الملف: ${encryptedPath}`);

      // التحقق من صحة البيانات المدخلة
      if (!encryptedPath) {
        throw new Error('مسار الملف المشفر مطلوب');
      }

      if (!password) {
        throw new Error('كلمة المرور مطلوبة لفك التشفير');
      }

      const startTime = Date.now();

      // فك تشفير الملف
      const result = await decryptFileForDownload(encryptedPath, password);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✅ تم فك تشفير الملف في ${duration}ms - تم التحقق: ${result.verified ? 'نعم' : 'لا'}`);

      return {
        success: result.success,
        decryptedPath: result.decryptedPath,
        verified: result.verified,
        metadata: result.metadata
      };
    } catch (error) {
      console.error('🚨 فشل فك تشفير الملف:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف في فك التشفير';
      throw new Error(`فشل فك تشفير الملف: ${errorMessage}`);
    }
  }

  /**
   * تشفير حقل قاعدة البيانات قبل التخزين
   */
  async encryptField(plaintext: string, masterKey: Buffer | string): Promise<string> {
    return this.dbEnc.encryptField(plaintext, masterKey);
  }

  /**
   * فك تشفير حقل قاعدة البيانات بعد القراءة
   */
  async decryptField(encryptedData: string, masterKey: Buffer | string): Promise<string> {
    return this.dbEnc.decryptField(encryptedData, masterKey);
  }

  /**
   * تشفير ملف باستخدام Envelope (DEK/KEK + KMS)
   * - يولد DEK عشوائي (AES-256) لتشفير الملف (CBC عبر fileEncryption)
   * - يحصل على KEK من KMS (مادة المفتاح الخام داخل الذاكرة)
   * - يغلّف DEK بمفتاح KEK ويخزن البيانات ضمن metadata
   */
  async encryptFileEnvelope(
    file: File,
    kmsKeyId?: string,
    userId?: string,
    ticketId?: string
  ): Promise<EncryptionResult> {
    // 1) توليد DEK
    const dek = generateDek(32);

    // 2) الحصول على KEK من KMS
    let selectedKmsId = kmsKeyId;
    let kek: Buffer | null = null;
    try {
      const { keyRotationManager, KeyType } = await import('../utils/keyRotationManager');
      if (!selectedKmsId) {
        const active = keyRotationManager.getKeysByType(KeyType.FILE_ENCRYPTION).find(k => k.status === 'active');
        if (active) selectedKmsId = active.id; else {
          const created = await keyRotationManager.generateKey(KeyType.FILE_ENCRYPTION, 'attachments');
          selectedKmsId = created.id;
        }
      }
      const raw = keyRotationManager.getRawKeyMaterial(selectedKmsId!);
      if (raw) kek = Buffer.from(new Uint8Array(raw));
    } catch {
      // fallback to password-based approach if needed later
    }

    if (!kek) {
      throw new Error('تعذر الحصول على مادة مفتاح KMS المطلوبة لتغليف DEK');
    }

    // 3) تغليف DEK
    const wrappedDek = wrapDekWithKek(dek, kek);

    // 4) تشفير الملف باستخدام DEK مباشرة (CBC)
  const timestamp = Date.now();
  const tmpDir = os.tmpdir();
  const tempPath = path.join(tmpDir, `original_${timestamp}_${file.name}`);
  const encryptedPath = path.join(tmpDir, `encrypted_${timestamp}_${file.name}.enc`);
    const buffer = await file.arrayBuffer();
    const fs = require('fs');
    fs.writeFileSync(tempPath, Buffer.from(buffer));

    const result = await fileEncryption.encryptFile(
      tempPath,
      encryptedPath,
      dek,
      userId,
      ticketId,
      {
        kmsKeyId: selectedKmsId,
        wrappedDek,
        dekAlgorithm: 'aes-256-cbc'
      } as Partial<FileMetadata>
    );
    fs.unlinkSync(tempPath);
    return result;
  }

  /**
   * فك تشفير ملف مشفر بطريقة Envelope
   * - يسترجع wrappedDEK و kmsKeyId من metadata
   * - يفك تغليف DEK باستخدام KEK من KMS
   * - يفك تشفير الملف بالـ DEK
   */
  async decryptFileEnvelope(encryptedPath: string): Promise<DecryptionResult> {
    const metadata = await (fileEncryption as any)['getMetadata'](encryptedPath) as FileMetadata | null;
    if (!metadata || !metadata.wrappedDek || !metadata.kmsKeyId) {
      throw new Error('لا توجد معلومات Envelope كافية في بيانات الملف الوصفية');
    }

    // 1) الحصول على KEK من KMS
    let kek: Buffer | null = null;
    try {
      const { keyRotationManager } = await import('../utils/keyRotationManager');
      const raw = keyRotationManager.getRawKeyMaterial(metadata.kmsKeyId);
      if (raw) kek = Buffer.from(new Uint8Array(raw));
    } catch {}
    if (!kek) throw new Error('تعذر الحصول على مادة مفتاح KMS لفك تغليف DEK');

    // 2) فك تغليف DEK
    const dek = unwrapDekWithKek(metadata.wrappedDek, kek);

    // 3) فك تشفير الملف بالـ DEK
  const timestamp = Date.now();
  const tmpDir = os.tmpdir();
  const decryptedPath = path.join(tmpDir, `decrypted_${timestamp}_${metadata.originalName}`);
    const result = await fileEncryption.decryptFile(encryptedPath, decryptedPath, dek);
    return { ...result, metadata };
  }

  /**
   * إعادة تغليف مفاتيح DEK للملفات المشفرة بنمط Envelope عندما يتم تدوير KEK (FILE_ENCRYPTION)
   * - تبحث في قائمة metadata المخزنة في localStorage عن الملفات ذات kmsKeyId = oldKeyId
   * - تقوم بفك تغليف DEK باستخدام KEK القديم ثم تغليفه ب KEK الجديد وتحديث metadata
   * - لا تعيد تشفير محتوى الملف (سريع وآمن طالما DEK نفسه لم يتغير)
   */
  private async rewrapEnvelopedFiles(oldKeyId: string, newKeyId: string): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') return; // ليس في بيئة المتصفح
      const listRaw = localStorage.getItem('encryptedFiles');
      const list: any[] = listRaw ? JSON.parse(listRaw) : [];
      if (!Array.isArray(list) || list.length === 0) return;

      const { keyRotationManager } = await import('../utils/keyRotationManager');

      const oldRaw = keyRotationManager.getRawKeyMaterial(oldKeyId);
      const newRaw = keyRotationManager.getRawKeyMaterial(newKeyId);
      if (!oldRaw || !newRaw) {
        console.warn('[KMS] لا تتوفر مادة KEK في الذاكرة لإعادة التغليف. تخطٍ.', { oldKeyId, newKeyId });
        return;
      }
      const oldKek = Buffer.from(new Uint8Array(oldRaw));
      const newKek = Buffer.from(new Uint8Array(newRaw));

      const fs = require('fs');
      let updated = 0;
      for (const meta of list) {
        try {
          if (meta?.kmsKeyId !== oldKeyId || !meta?.wrappedDek) continue;
          const dek = unwrapDekWithKek(meta.wrappedDek, oldKek);
          const newWrapped = wrapDekWithKek(dek, newKek);
          meta.wrappedDek = newWrapped;
          meta.kmsKeyId = newKeyId;
          // حدث ملف .meta إن وجد
          const metaPath = String(meta.encryptedPath || '') + '.meta';
          try {
            if (metaPath && fs.existsSync(metaPath)) {
              fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
            }
          } catch {}
          updated++;
        } catch (e) {
          console.warn('[KMS] فشل إعادة تغليف ملف واحد:', meta?.id || meta?.encryptedPath, e);
        }
      }
      try {
        localStorage.setItem('encryptedFiles', JSON.stringify(list));
      } catch {}
      if (updated > 0) console.log(`[#KMS] تم إعادة تغليف DEK لعدد ${updated} من الملفات.`);
    } catch (e) {
      console.warn('[KMS] rewrapEnvelopedFiles failed', e);
    }
  }

  /**
   * تشفير البيانات النصية
   * @param data البيانات المراد تشفيرها
   * @param password كلمة مرور التشفير
   * @returns Promise<string> البيانات المشفرة
   */
  async encryptData(data: string, password: string): Promise<string> {
    try {
      console.log(`🔐 تشفير البيانات (${data.length} حرف)`);

      if (!data) {
        throw new Error('البيانات مطلوبة للتشفير');
      }

      if (!password || password.length < 8) {
        throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      }

      // توليد ملح وIV عشوائيين
      const salt = this.generateSalt();
      const iv = crypto.randomBytes(16);

      // توليد مفتاح من كلمة المرور
      const key = this.generateSecureKey(password, salt);

      // تشفير البيانات
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // الحصول على authentication tag
      const authTag = cipher.getAuthTag();

      // دمج الملح، IV، AuthTag، والبيانات المشفرة
      const result = `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

      console.log('✅ تم تشفير البيانات بنجاح');
      return result;
    } catch (error) {
      console.error('🚨 فشل تشفير البيانات:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      throw new Error(`فشل تشفير البيانات: ${errorMessage}`);
    }
  }

  /**
   * فك تشفير البيانات النصية
   * @param encryptedData البيانات المشفرة
   * @param password كلمة مرور فك التشفير
   * @returns Promise<string> البيانات الأصلية
   */
  async decryptData(encryptedData: string, password: string): Promise<string> {
    try {
      console.log('🔓 فك تشفير البيانات');

      if (!encryptedData) {
        throw new Error('البيانات المشفرة مطلوبة');
      }

      if (!password) {
        throw new Error('كلمة المرور مطلوبة لفك التشفير');
      }

      // فصل مكونات البيانات المشفرة
      const parts = encryptedData.split(':');
      if (parts.length !== 4) {
        throw new Error('تنسيق البيانات المشفرة غير صالح');
      }

      const salt = Buffer.from(parts[0], 'hex');
      const iv = Buffer.from(parts[1], 'hex');
      const authTag = Buffer.from(parts[2], 'hex');
      const encrypted = parts[3];

      // توليد المفتاح من كلمة المرور
      const key = this.generateSecureKey(password, salt);

      // فك تشفير البيانات
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      console.log('✅ تم فك تشفير البيانات بنجاح');
      return decrypted;
    } catch (error) {
      console.error('🚨 فشل فك تشفير البيانات:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      throw new Error(`فشل فك تشفير البيانات: ${errorMessage}`);
    }
  }

  /**
   * توليد مفتاح آمن من كلمة المرور
   * @param password كلمة المرور
   * @param salt الملح (اختياري)
   * @returns Buffer المفتاح المولد
   */
  generateSecureKey(password: string, salt?: Buffer): Buffer {
    const usedSalt = salt || this.generateSalt();
    return crypto.pbkdf2Sync(password, usedSalt, this.iterations, this.keyLength, 'sha512');
  }

  /**
   * توليد ملح عشوائي
   * @returns Buffer الملح العشوائي
   */
  generateSalt(): Buffer {
    return crypto.randomBytes(32);
  }

  /**
   * التحقق من checksum لملف
   * @param filePath مسار الملف
   * @param expectedChecksum الـ checksum المتوقع
   * @returns Promise<boolean> نتيجة التحقق
   */
  async verifyChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
    try {
      console.log(`🔍 التحقق من checksum للملف: ${filePath}`);

      const actualChecksum = await this.calculateFileChecksum(filePath);
      const isValid = actualChecksum === expectedChecksum;

      console.log(`${isValid ? '✅' : '❌'} نتيجة التحقق من checksum: ${isValid ? 'صالح' : 'غير صالح'}`);
      return isValid;
    } catch (error) {
      console.error('🚨 فشل التحقق من checksum:', error);
      return false;
    }
  }

  /**
   * حساب checksum لملف
   * @param filePath مسار الملف
   * @returns Promise<string> checksum الملف
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const fs = require('fs');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data: Buffer) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * حساب checksum لبيانات Buffer أو نص
   * @param data البيانات
   * @returns string checksum البيانات
   */
  calculateChecksum(data: Buffer | string): string {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  }

  /**
   * تنسيق حجم الملف لعرض سهل القراءة
   * @param bytes حجم الملف بالبايت
   * @returns string الحجم المنسق
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * إنشاء تقرير عن حالة التشفير
   * @returns Promise<EncryptionReport>
   */
  async generateEncryptionReport(): Promise<EncryptionReport> {
    try {
      console.log('📊 إنشاء تقرير التشفير');

      const stats = await fileEncryption.getEncryptionStats();

      const report: EncryptionReport = {
        timestamp: new Date(),
        totalEncryptedFiles: stats.totalFiles,
        totalEncryptedSize: stats.totalSize,
        averageFileSize: stats.averageSize,
        algorithmsUsed: stats.algorithms,
        encryptionStrength: {
          algorithm: this.algorithm,
          keyLength: this.keyLength,
          iterations: this.iterations
        },
        securityLevel: this.calculateSecurityLevel(),
        recommendations: this.generateSecurityRecommendations()
      };

      console.log('✅ تم إنشاء تقرير التشفير');
      return report;
    } catch (error) {
      console.error('🚨 فشل إنشاء تقرير التشفير:', error);
      throw error;
    }
  }

  /**
   * حساب مستوى الأمان
   * @returns string مستوى الأمان
   */
  private calculateSecurityLevel(): string {
    // تقييم مستوى الأمان بناءً على المعايير المطبقة
    const factors = {
      keyLength: this.keyLength >= 32 ? 25 : 15, // 25 نقطة للمفتاح 256-bit
      algorithm: this.algorithm.includes('256') ? 25 : 15, // 25 نقطة لـ AES-256
      iterations: this.iterations >= 100000 ? 25 : 15, // 25 نقطة للتكرار العالي
      randomness: 25 // 25 نقطة للعشوائية في IV والملح
    };

    const totalScore = Object.values(factors).reduce((sum, score) => sum + score, 0);

    if (totalScore >= 90) return 'عالي جداً (A+)';
    if (totalScore >= 80) return 'عالي (A)';
    if (totalScore >= 70) return 'متوسط عالي (B+)';
    if (totalScore >= 60) return 'متوسط (B)';
    return 'منخفض (C)';
  }

  /**
   * توليد توصيات أمنية
   * @returns string[] قائمة التوصيات
   */
  private generateSecurityRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.keyLength < 32) {
      recommendations.push('استخدام مفاتيح 256-bit للحصول على أمان أفضل');
    }

    if (this.iterations < 100000) {
      recommendations.push('زيادة عدد تكرارات PBKDF2 إلى 100,000 على الأقل');
    }

    if (!this.algorithm.includes('gcm')) {
      recommendations.push('استخدام وضع GCM للحصول على Authenticated Encryption');
    }

    // إضافة توصيات عامة
    recommendations.push('تطبيق دوران دوري لكلمات المرور');
    recommendations.push('إجراء نسخ احتياطية مشفرة للملفات الحساسة');
    recommendations.push('مراقبة محاولات الوصول غير المصرح بها');
    recommendations.push('استخدام Multi-Factor Authentication للحسابات الحساسة');

    return recommendations;
  }
}

// واجهة تقرير التشفير
export interface EncryptionReport {
  timestamp: Date;
  totalEncryptedFiles: number;
  totalEncryptedSize: number;
  averageFileSize: number;
  algorithmsUsed: { [key: string]: number };
  encryptionStrength: {
    algorithm: string;
    keyLength: number;
    iterations: number;
  };
  securityLevel: string;
  recommendations: string[];
}

// إنشاء instance مشترك للخدمة
export const encryptionService = new EncryptionServiceImpl();

// دوال مساعدة للاستخدام السريع

/**
 * تشفير سريع لملف مرفوع
 * @param file الملف المرفوع
 * @param password كلمة المرور
 * @param options خيارات إضافية
 * @returns Promise<EncryptionResult>
 */
export const quickEncryptFile = async (
  file: File, 
  password: string,
  options?: { userId?: string; ticketId?: string }
): Promise<EncryptionResult> => {
  return await encryptionService.encryptFile(file, password, options?.userId, options?.ticketId);
};

/**
 * فك تشفير سريع لملف
 * @param encryptedPath مسار الملف المشفر
 * @param password كلمة المرور
 * @returns Promise<DecryptionResult>
 */
export const quickDecryptFile = async (
  encryptedPath: string, 
  password: string
): Promise<DecryptionResult> => {
  return await encryptionService.decryptFile(encryptedPath, password);
};

/**
 * تشفير سريع للبيانات النصية
 * @param data البيانات
 * @param password كلمة المرور
 * @returns Promise<string>
 */
export const quickEncryptData = async (data: string, password: string): Promise<string> => {
  return await encryptionService.encryptData(data, password);
};

/**
 * فك تشفير سريع للبيانات النصية
 * @param encryptedData البيانات المشفرة
 * @param password كلمة المرور
 * @returns Promise<string>
 */
export const quickDecryptData = async (encryptedData: string, password: string): Promise<string> => {
  return await encryptionService.decryptData(encryptedData, password);
};

/**
 * التحقق السريع من checksum
 * @param filePath مسار الملف
 * @param expectedChecksum الـ checksum المتوقع
 * @returns Promise<boolean>
 */
export const quickVerifyChecksum = async (filePath: string, expectedChecksum: string): Promise<boolean> => {
  return await encryptionService.verifyChecksum(filePath, expectedChecksum);
};

// تصدير الخدمة كافتراضية
export default encryptionService;