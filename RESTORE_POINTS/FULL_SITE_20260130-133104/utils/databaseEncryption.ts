/**
 * 🛡️ تشفير قاعدة البيانات (Encryption at Rest)
 * - AES-256-GCM للمصادقة والنزاهة
 * - اشتقاق المفاتيح عبر PBKDF2 (100k)
 * - تنسيق تخزين مضغوط: base64(salt || iv || tag || ciphertext)
 */

import * as crypto from 'crypto';

export interface DbEncryptionOptions {
  iterations?: number; // PBKDF2 iterations
  keyLength?: number;  // bytes (32 = 256-bit)
  saltLength?: number; // bytes
  ivLength?: number;   // bytes
  tagLength?: number;  // bytes
  digest?: 'sha256' | 'sha512';
  algorithm?: 'aes-256-gcm';
}

export class DatabaseEncryption {
  private readonly algorithm: 'aes-256-gcm';
  private readonly keyDerivation = 'pbkdf2' as const;
  private readonly iterations: number;
  private readonly keyLength: number;
  private readonly saltLength: number;
  private readonly tagLength: number;
  private readonly ivLength: number;
  private readonly digest: 'sha256' | 'sha512';

  constructor(opts?: DbEncryptionOptions) {
    this.algorithm = (opts?.algorithm ?? 'aes-256-gcm');
    this.iterations = opts?.iterations ?? 100_000;
    this.keyLength = opts?.keyLength ?? 32;
    this.saltLength = opts?.saltLength ?? 16;
    this.tagLength = opts?.tagLength ?? 16;
    this.ivLength = opts?.ivLength ?? 16;
    this.digest = opts?.digest ?? 'sha256';
  }

  /**
   * تشفير قيمة نصية حساسة قبل التخزين في قاعدة البيانات
   * @param plaintext النص الأصلي (UTF-8)
   * @param masterKey مفتاح رئيسي (Buffer أو string)
   * @returns Base64 لسلسلة salt||iv||tag||ciphertext
   */
  async encryptField(plaintext: string, masterKey: Buffer | string): Promise<string> {
    if (plaintext == null) throw new Error('قيمة النص للتشفير مطلوبة');
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);
    const key = crypto.pbkdf2Sync(
      typeof masterKey === 'string' ? Buffer.from(masterKey, 'utf8') : masterKey,
      salt,
      this.iterations,
      this.keyLength,
      this.digest
    );

    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    const combined = Buffer.concat([salt, iv, tag, enc]);
    return combined.toString('base64');
  }

  /**
   * فك تشفير قيمة منسقة بالأسلوب أعلاه عند القراءة من قاعدة البيانات
   * @param encryptedData Base64 للسلسلة المدمجة
   * @param masterKey المفتاح الرئيسي المستخدم للاشتقاق
   * @returns النص الأصلي (UTF-8)
   */
  async decryptField(encryptedData: string, masterKey: Buffer | string): Promise<string> {
    if (!encryptedData) throw new Error('القيمة المشفرة مطلوبة');
    const data = Buffer.from(encryptedData, 'base64');
    const salt = data.slice(0, this.saltLength);
    const iv = data.slice(this.saltLength, this.saltLength + this.ivLength);
    const tag = data.slice(this.saltLength + this.ivLength, this.saltLength + this.ivLength + this.tagLength);
    const enc = data.slice(this.saltLength + this.ivLength + this.tagLength);

    const key = crypto.pbkdf2Sync(
      typeof masterKey === 'string' ? Buffer.from(masterKey, 'utf8') : masterKey,
      salt,
      this.iterations,
      this.keyLength,
      this.digest
    );

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
  }

  /**
   * تفاصيل الإعداد الحالية (للتشخيص والتوثيق)
   */
  getConfig() {
    return {
      algorithm: this.algorithm,
      keyDerivation: this.keyDerivation,
      iterations: this.iterations,
      keyLength: this.keyLength,
      saltLength: this.saltLength,
      ivLength: this.ivLength,
      tagLength: this.tagLength,
      digest: this.digest
    } as const;
  }
}

export const databaseEncryption = new DatabaseEncryption();

export default DatabaseEncryption;
