/**
 * 🔐 نظام تشفير الملفات المتقدم
 * نظام الاستعلامات والشكاوى - بوابة الخدمات الإلكترونية
 * 
 * يوفر هذا النظام:
 * - تشفير الملفات المرفوعة باستخدام AES-256-CBC
 * - التحقق من سلامة الملفات باستخدام SHA-256
 * - إدارة البيانات الوصفية للملفات المشفرة
 * - توليد مفاتيح آمنة باستخدام PBKDF2
 * - دعم الملفات الكبيرة مع streaming
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// واجهة البيانات الوصفية للملف
export interface FileMetadata {
  id: string;
  originalName: string;
  originalPath: string;
  encryptedPath: string;
  checksum: string;
  algorithm: string;
  keyLength: number;
  timestamp: Date;
  originalSize: number;
  encryptedSize: number;
  mimeType: string;
  version: string;
  userId?: string;
  ticketId?: string;
  // معلومات إضافية مفيدة لفك التشفير وإدارة المفاتيح
  saltHex?: string; // الملح المستخدم مع PBKDF2 (hex)
  kmsKeyId?: string; // المعرّف المنطقي للمفتاح المستخدم (إن وجد)
  keyDerivation?: {
    algorithm: 'PBKDF2';
    iterations: number;
    digest: 'sha512';
  };
  // تشفير بالمغلف (Envelope) - اختياري
  wrappedDek?: {
    wrapAlgorithm: 'aes-256-gcm';
    ivHex: string;
    tagHex: string;
    wrappedKeyB64: string;
  };
  dekAlgorithm?: 'aes-256-cbc';
}

// واجهة نتيجة التشفير
export interface EncryptionResult {
  success: boolean;
  checksum: string;
  metadata: FileMetadata;
  encryptedPath: string;
}

// واجهة نتيجة فك التشفير
export interface DecryptionResult {
  success: boolean;
  verified: boolean;
  decryptedPath: string;
}

/**
 * فئة تشفير الملفات المتقدمة
 */
export class FileEncryption {
  private readonly algorithm = 'aes-256-cbc';
  private readonly keyLength = 32; // 256 bit key
  private readonly ivLength = 16;  // 128 bit IV
  private readonly iterations = 100000; // PBKDF2 iterations

  constructor() {
    console.log('🔐 تم تهيئة نظام تشفير الملفات');
  }

  /**
   * تشفير ملف مع إنشاء checksum للتحقق من السلامة
   * @param filePath مسار الملف الأصلي
   * @param outputPath مسار الملف المشفر
   * @param key مفتاح التشفير (32 بايت)
   * @param userId معرف المستخدم (اختياري)
   * @param ticketId معرف التذكرة (اختياري)
   * @returns Promise<EncryptionResult>
   */
  async encryptFile(
    filePath: string, 
    outputPath: string, 
    key: Buffer,
    userId?: string,
    ticketId?: string,
    extras?: Partial<FileMetadata>
  ): Promise<EncryptionResult> {
    try {
      console.log(`🔐 بدء تشفير الملف: ${path.basename(filePath)}`);

      // التحقق من وجود الملف الأصلي
      if (!fs.existsSync(filePath)) {
        throw new Error(`الملف غير موجود: ${filePath}`);
      }

      // التحقق من طول المفتاح
      if (key.length !== this.keyLength) {
        throw new Error(`طول المفتاح يجب أن يكون ${this.keyLength} بايت`);
      }

      // توليد IV عشوائي لكل ملف
      const iv = crypto.randomBytes(this.ivLength);
      
      // إنشاء cipher للتشفير
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      // إنشاء streams للقراءة والكتابة (دعم الملفات الكبيرة)
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(outputPath);
      
      // كتابة IV في بداية الملف المشفر
      output.write(iv);
      
      // تشفير الملف مع streaming للملفات الكبيرة
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        input
          .pipe(cipher)
          .pipe(output)
          .on('finish', async () => {
            try {
              const endTime = Date.now();
              const duration = endTime - startTime;
              
              console.log(`⏱️ تم تشفير الملف في ${duration}ms`);
              
              // حساب checksum للملف المشفر للتحقق من السلامة
              const checksum = await this.calculateChecksum(outputPath);
              
              // إنشاء البيانات الوصفية
              const metadata = await this.createMetadata(
                filePath, 
                outputPath, 
                checksum,
                userId,
                ticketId,
                extras
              );
              
              // حفظ البيانات الوصفية
              await this.saveMetadata(metadata);
              
              console.log(`✅ تم تشفير الملف بنجاح: ${checksum.substring(0, 16)}...`);
              
              resolve({ 
                success: true, 
                checksum, 
                metadata,
                encryptedPath: outputPath
              });
            } catch (error) {
              console.error('🚨 خطأ في معالجة ما بعد التشفير:', error);
              reject(error);
            }
          })
          .on('error', (error: Error) => {
            console.error('🚨 خطأ في عملية التشفير:', error);
            reject(error);
          });
      });
    } catch (error) {
      console.error('🚨 خطأ في تشفير الملف:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      throw new Error(`فشل تشفير الملف: ${errorMessage}`);
    }
  }
  
  /**
   * فك تشفير ملف مع التحقق من السلامة
   * @param encryptedPath مسار الملف المشفر
   * @param outputPath مسار الملف المفكوك التشفير
   * @param key مفتاح فك التشفير
   * @returns Promise<DecryptionResult>
   */
  async decryptFile(
    encryptedPath: string, 
    outputPath: string, 
    key: Buffer
  ): Promise<DecryptionResult> {
    try {
      console.log(`🔓 بدء فك تشفير الملف: ${path.basename(encryptedPath)}`);

      // التحقق من وجود الملف المشفر
      if (!fs.existsSync(encryptedPath)) {
        throw new Error(`الملف المشفر غير موجود: ${encryptedPath}`);
      }

      // التحقق من طول المفتاح
      if (key.length !== this.keyLength) {
        throw new Error(`طول المفتاح يجب أن يكون ${this.keyLength} بايت`);
      }

      const startTime = Date.now();
      
      // قراءة IV من بداية الملف المشفر
      const fileBuffer = fs.readFileSync(encryptedPath);
      
      if (fileBuffer.length < this.ivLength) {
        throw new Error('الملف المشفر تالف: حجم غير صالح');
      }
      
      const iv = fileBuffer.slice(0, this.ivLength);
      const encryptedData = fileBuffer.slice(this.ivLength);
      
      // إنشاء decipher لفك التشفير
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      
      // فك تشفير البيانات
      let decrypted: Buffer;
      try {
        decrypted = Buffer.concat([
          decipher.update(encryptedData),
          decipher.final()
        ]);
      } catch (error) {
        throw new Error('فشل فك التشفير: مفتاح خاطئ أو ملف تالف');
      }
      
      // كتابة الملف المفكوك التشفير
      fs.writeFileSync(outputPath, decrypted);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️ تم فك تشفير الملف في ${duration}ms`);
      
      // التحقق من checksum إذا توفر
      const metadata = await this.getMetadata(encryptedPath);
      let verified = false;
      
      if (metadata && metadata.checksum) {
        const currentChecksum = await this.calculateChecksum(encryptedPath);
        verified = currentChecksum === metadata.checksum;
        
        if (verified) {
          console.log('✅ تم التحقق من سلامة الملف بنجاح');
        } else {
          console.warn('⚠️ تحذير: فشل التحقق من سلامة الملف');
        }
      }
      
      console.log(`✅ تم فك تشفير الملف بنجاح: ${path.basename(outputPath)}`);
      
      return { 
        success: true, 
        verified,
        decryptedPath: outputPath
      };
    } catch (error) {
      console.error('🚨 خطأ في فك تشفير الملف:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      throw new Error(`فشل فك تشفير الملف: ${errorMessage}`);
    }
  }
  
  /**
   * حساب checksum للملف باستخدام SHA-256
   * @param filePath مسار الملف
   * @returns Promise<string> checksum بصيغة hex
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => {
        const checksum = hash.digest('hex');
        resolve(checksum);
      });
      stream.on('error', reject);
    });
  }
  
  /**
   * إنشاء البيانات الوصفية للملف
   * @param originalPath مسار الملف الأصلي
   * @param encryptedPath مسار الملف المشفر
   * @param checksum checksum الملف المشفر
   * @param userId معرف المستخدم
   * @param ticketId معرف التذكرة
   * @returns Promise<FileMetadata>
   */
  private async createMetadata(
    originalPath: string, 
    encryptedPath: string, 
    checksum: string,
    userId?: string,
    ticketId?: string,
    extras?: Partial<FileMetadata>
  ): Promise<FileMetadata> {
    const originalStats = fs.statSync(originalPath);
    const encryptedStats = fs.statSync(encryptedPath);
    
    const metadata: FileMetadata = {
      id: this.generateFileId(),
      originalName: path.basename(originalPath),
      originalPath,
      encryptedPath,
      checksum,
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      timestamp: new Date(),
      originalSize: originalStats.size,
      encryptedSize: encryptedStats.size,
      mimeType: this.getMimeType(originalPath),
      version: '1.0',
      userId,
      ticketId,
      keyDerivation: {
        algorithm: 'PBKDF2',
        iterations: this.iterations,
        digest: 'sha512'
      },
      ...(extras || {})
    };
    
    return metadata;
  }
  
  /**
   * حفظ البيانات الوصفية في قاعدة البيانات أو ملف
   * @param metadata البيانات الوصفية
   */
  private async saveMetadata(metadata: FileMetadata): Promise<void> {
    const metadataPath = metadata.encryptedPath + '.meta';
    const metadataJson = JSON.stringify(metadata, null, 2);
    
    try {
      // حفظ كملف JSON
      fs.writeFileSync(metadataPath, metadataJson, 'utf8');
      
      // حفظ في قاعدة البيانات أيضاً (localStorage في المتصفح)
      await this.saveToDatabase(metadata);
      
      console.log(`📝 تم حفظ البيانات الوصفية: ${metadata.id}`);
    } catch (error) {
      console.error('🚨 خطأ في حفظ البيانات الوصفية:', error);
      throw error;
    }
  }
  
  /**
   * استرداد البيانات الوصفية للملف
   * @param encryptedPath مسار الملف المشفر
   * @returns Promise<FileMetadata | null>
   */
  private async getMetadata(encryptedPath: string): Promise<FileMetadata | null> {
    const metadataPath = encryptedPath + '.meta';
    
    try {
      // محاولة القراءة من الملف
      if (fs.existsSync(metadataPath)) {
        const metadataJson = fs.readFileSync(metadataPath, 'utf8');
        return JSON.parse(metadataJson);
      }
      
      // محاولة الاسترداد من قاعدة البيانات
      return await this.getFromDatabase(encryptedPath);
    } catch (error) {
      console.error('🚨 خطأ في قراءة البيانات الوصفية:', error);
      return null;
    }
  }
  
  /**
   * توليد مفتاح تشفير آمن من كلمة المرور
   * @param password كلمة مرور المستخدم
   * @param salt الملح العشوائي
   * @returns Buffer مفتاح التشفير
   */
  generateKey(password: string, salt: Buffer): Buffer {
    console.log('🔑 توليد مفتاح التشفير...');
    const startTime = Date.now();
    
    // استخدام PBKDF2 لتوليد مفتاح قوي من كلمة المرور
    const key = crypto.pbkdf2Sync(password, salt, this.iterations, this.keyLength, 'sha512');
    
    const endTime = Date.now();
    console.log(`⏱️ تم توليد المفتاح في ${endTime - startTime}ms`);
    
    return key;
  }
  
  /**
   * توليد ملح عشوائي للتشفير
   * @returns Buffer الملح العشوائي
   */
  generateSalt(): Buffer {
    return crypto.randomBytes(32);
  }
  
  /**
   * توليد معرف فريد للملف
   * @returns string معرف الملف
   */
  private generateFileId(): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(8).toString('hex');
    return `file_${timestamp}_${random}`;
  }
  
  /**
   * تحديد نوع MIME للملف
   * @param filePath مسار الملف
   * @returns string نوع MIME
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      // Documents
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.rtf': 'application/rtf',
      
      // Images
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      
      // Archives
      '.zip': 'application/zip',
      '.rar': 'application/vnd.rar',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      
      // Audio/Video
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      
      // Other
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.csv': 'text/csv'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
  
  /**
   * حفظ البيانات الوصفية في قاعدة البيانات
   * @param metadata البيانات الوصفية
   */
  private async saveToDatabase(metadata: FileMetadata): Promise<void> {
    try {
      // في بيئة المتصفح: localStorage
      if (typeof localStorage !== 'undefined') {
        const existingData = JSON.parse(localStorage.getItem('encryptedFiles') || '[]');
        existingData.push(metadata);
        localStorage.setItem('encryptedFiles', JSON.stringify(existingData));
        return;
      }
      
      // في بيئة الخادم: يمكن حفظ في قاعدة بيانات فعلية
      // مثال: await database.saveFileMetadata(metadata);
      
      console.log('💾 تم حفظ البيانات الوصفية في قاعدة البيانات');
    } catch (error) {
      console.warn('⚠️ تحذير: فشل حفظ البيانات في قاعدة البيانات:', error);
    }
  }
  
  /**
   * استرداد البيانات الوصفية من قاعدة البيانات
   * @param encryptedPath مسار الملف المشفر
   * @returns Promise<FileMetadata | null>
   */
  private async getFromDatabase(encryptedPath: string): Promise<FileMetadata | null> {
    try {
      // في بيئة المتصفح: localStorage
      if (typeof localStorage !== 'undefined') {
        const existingData = JSON.parse(localStorage.getItem('encryptedFiles') || '[]');
        return existingData.find((meta: FileMetadata) => meta.encryptedPath === encryptedPath) || null;
      }
      
      // في بيئة الخادم: يمكن الاسترداد من قاعدة بيانات فعلية
      // مثال: return await database.getFileMetadata(encryptedPath);
      
      return null;
    } catch (error) {
      console.warn('⚠️ تحذير: فشل استرداد البيانات من قاعدة البيانات:', error);
      return null;
    }
  }
  
  /**
   * حذف الملف المشفر والبيانات الوصفية
   * @param encryptedPath مسار الملف المشفر
   * @returns Promise<boolean>
   */
  async deleteEncryptedFile(encryptedPath: string): Promise<boolean> {
    try {
      console.log(`🗑️ حذف الملف المشفر: ${path.basename(encryptedPath)}`);
      
      // حذف الملف المشفر
      if (fs.existsSync(encryptedPath)) {
        fs.unlinkSync(encryptedPath);
      }
      
      // حذف ملف البيانات الوصفية
      const metadataPath = encryptedPath + '.meta';
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }
      
      // حذف من قاعدة البيانات
      await this.removeFromDatabase(encryptedPath);
      
      console.log('✅ تم حذف الملف المشفر بنجاح');
      return true;
    } catch (error) {
      console.error('🚨 خطأ في حذف الملف المشفر:', error);
      return false;
    }
  }
  
  /**
   * إزالة البيانات الوصفية من قاعدة البيانات
   * @param encryptedPath مسار الملف المشفر
   */
  private async removeFromDatabase(encryptedPath: string): Promise<void> {
    try {
      // في بيئة المتصفح: localStorage
      if (typeof localStorage !== 'undefined') {
        const existingData = JSON.parse(localStorage.getItem('encryptedFiles') || '[]');
        const filteredData = existingData.filter((meta: FileMetadata) => meta.encryptedPath !== encryptedPath);
        localStorage.setItem('encryptedFiles', JSON.stringify(filteredData));
        return;
      }
      
      // في بيئة الخادم: يمكن الحذف من قاعدة بيانات فعلية
      // مثال: await database.deleteFileMetadata(encryptedPath);
      
    } catch (error) {
      console.warn('⚠️ تحذير: فشل حذف البيانات من قاعدة البيانات:', error);
    }
  }
  
  /**
   * الحصول على إحصائيات التشفير
   * @returns Promise<object>
   */
  async getEncryptionStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    averageSize: number;
    algorithms: { [key: string]: number };
  }> {
    try {
      const allFiles = await this.getAllEncryptedFiles();
      
      const stats = {
        totalFiles: allFiles.length,
        totalSize: allFiles.reduce((sum, file) => sum + file.encryptedSize, 0),
        averageSize: 0,
        algorithms: {} as { [key: string]: number }
      };
      
      if (stats.totalFiles > 0) {
        stats.averageSize = Math.round(stats.totalSize / stats.totalFiles);
      }
      
      // إحصاء الخوارزميات المستخدمة
      allFiles.forEach(file => {
        stats.algorithms[file.algorithm] = (stats.algorithms[file.algorithm] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('🚨 خطأ في إحصائيات التشفير:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        averageSize: 0,
        algorithms: {}
      };
    }
  }
  
  /**
   * الحصول على قائمة جميع الملفات المشفرة
   * @returns Promise<FileMetadata[]>
   */
  private async getAllEncryptedFiles(): Promise<FileMetadata[]> {
    try {
      // في بيئة المتصفح: localStorage
      if (typeof localStorage !== 'undefined') {
        return JSON.parse(localStorage.getItem('encryptedFiles') || '[]');
      }
      
      // في بيئة الخادم: يمكن الاسترداد من قاعدة بيانات فعلية
      // مثال: return await database.getAllFileMetadata();
      
      return [];
    } catch (error) {
      console.error('🚨 خطأ في استرداد الملفات المشفرة:', error);
      return [];
    }
  }
}

// إنشاء instance مشترك
export const fileEncryption = new FileEncryption();

// دالة مساعدة لتشفير ملف مرفوع من المتصفح
export const encryptUploadedFile = async (
  file: File, 
  userPassword: string,
  userId?: string,
  ticketId?: string
): Promise<{
  success: boolean; 
  encryptedPath: string; 
  checksum: string;
  metadata: FileMetadata;
}> => {
  try {
    console.log(`📤 تشفير الملف المرفوع: ${file.name}`);

  // توليد ملح عشوائي
  const salt = fileEncryption.generateSalt();
  const saltHex = salt.toString('hex');
    
    // توليد مفتاح من كلمة مرور المستخدم
    const key = fileEncryption.generateKey(userPassword, salt);
    
    // تحديد مسارات الملفات
    const timestamp = Date.now();
    const tmpDir = os.tmpdir();
    const tempPath = path.join(tmpDir, `original_${timestamp}_${file.name}`);
    const encryptedPath = path.join(tmpDir, `encrypted_${timestamp}_${file.name}.enc`);
    
    // تحويل File إلى Buffer وحفظه مؤقتاً
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(buffer));
    
    // تشفير الملف
    const result = await fileEncryption.encryptFile(
      tempPath,
      encryptedPath,
      key,
      userId,
      ticketId,
      { saltHex }
    );
    
    // حذف الملف الأصلي المؤقت (للأمان)
    fs.unlinkSync(tempPath);
    
    console.log(`✅ تم تشفير الملف المرفوع بنجاح: ${result.checksum.substring(0, 16)}...`);
    
    return {
      success: result.success,
      encryptedPath,
      checksum: result.checksum,
      metadata: result.metadata
    };
  } catch (error) {
    console.error('🚨 خطأ في تشفير الملف المرفوع:', error);
    const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
    throw new Error(`فشل تشفير الملف: ${errorMessage}`);
  }
};

// دالة مساعدة لفك تشفير ملف للتحميل
export const decryptFileForDownload = async (
  encryptedPath: string,
  userPassword: string
): Promise<{
  success: boolean;
  decryptedPath: string;
  verified: boolean;
  metadata: FileMetadata | null;
}> => {
  try {
    console.log(`📥 فك تشفير الملف للتحميل: ${path.basename(encryptedPath)}`);

    // استرداد البيانات الوصفية
    const metadata = await fileEncryption['getMetadata'](encryptedPath);
    if (!metadata) {
      throw new Error('البيانات الوصفية للملف غير موجودة');
    }

    // توليد المفتاح من كلمة المرور باستخدام نفس الملح المخزن في البيانات الوصفية
    if (!metadata.saltHex) {
      throw new Error('لا يحتوي الملف على معلومات الملح اللازمة لفك التشفير');
    }
    const salt = Buffer.from(metadata.saltHex, 'hex');
    const key = fileEncryption.generateKey(userPassword, salt);
    
    // تحديد مسار الملف المفكوك التشفير
    const timestamp = Date.now();
    const tmpDir = os.tmpdir();
    const decryptedPath = path.join(tmpDir, `decrypted_${timestamp}_${metadata.originalName}`);
    
    // فك تشفير الملف
    const result = await fileEncryption.decryptFile(encryptedPath, decryptedPath, key);
    
    console.log(`✅ تم فك تشفير الملف بنجاح: ${path.basename(decryptedPath)}`);
    
    return {
      success: result.success,
      decryptedPath,
      verified: result.verified,
      metadata
    };
  } catch (error) {
    console.error('🚨 خطأ في فك تشفير الملف:', error);
    const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
    throw new Error(`فشل فك تشفير الملف: ${errorMessage}`);
  }
};

/**
 * دالة للتحقق من صحة كلمة مرور فك التشفير
 * @param encryptedPath مسار الملف المشفر
 * @param password كلمة المرور المقترحة
 * @returns Promise<boolean>
 */
export const validateDecryptionPassword = async (
  encryptedPath: string,
  password: string
): Promise<boolean> => {
  try {
    // محاولة فك تشفير جزء صغير من الملف للتحقق
    const tmpDir = os.tmpdir();
    const tempDecryptedPath = path.join(tmpDir, `validation_${Date.now()}.tmp`);
    
    // يجب استخدام الملح المحفوظ مع الملف
    const metadata = await fileEncryption['getMetadata'](encryptedPath);
    if (!metadata || !metadata.saltHex) {
      throw new Error('لا يحتوي الملف على معلومات الملح اللازمة للتحقق');
    }
    const salt = Buffer.from(metadata.saltHex, 'hex');
    const key = fileEncryption.generateKey(password, salt);
    
    const result = await fileEncryption.decryptFile(encryptedPath, tempDecryptedPath, key);
    
    // حذف الملف المؤقت
    if (fs.existsSync(tempDecryptedPath)) {
      fs.unlinkSync(tempDecryptedPath);
    }
    
    return result.success;
  } catch (error) {
    console.warn('⚠️ فشل التحقق من كلمة مرور فك التشفير:', error);
    return false;
  }
};

export default FileEncryption;