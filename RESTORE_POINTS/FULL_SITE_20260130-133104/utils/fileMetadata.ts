/**
 * 📝 إدارة البيانات الوصفية للملفات المشفرة
 * مديرية مالية حلب - نظام الاستعلامات والشكاوى
 * 
 * يوفر هذا النظام:
 * - إدارة شاملة للبيانات الوصفية للملفات المشفرة
 * - فهرسة وبحث متقدم في الملفات
 * - تتبع حالة الملفات وإحصائياتها
 * - نظام أرشفة وتنظيم للملفات
 * - مراقبة استخدام التخزين والأمان
 */

import type { FileMetadata } from '../utils/fileEncryption';
import * as crypto from 'crypto';

// واجهة البحث في الملفات
export interface FileSearchQuery {
  userId?: string;
  ticketId?: string;
  fileName?: string;
  mimeType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sizeMin?: number;
  sizeMax?: number;
  algorithm?: string;
  tags?: string[];
}

// نتيجة البحث
export interface SearchResult {
  files: FileMetadata[];
  totalCount: number;
  totalSize: number;
  searchTime: number;
}

// إحصائيات الملفات
export interface FileStatistics {
  totalFiles: number;
  totalOriginalSize: number;
  totalEncryptedSize: number;
  compressionRatio: number;
  fileTypes: { [mimeType: string]: number };
  algorithms: { [algorithm: string]: number };
  usersStats: { [userId: string]: number };
  monthlyStats: { [month: string]: number };
  securityScore: number;
}

// معلومات الأرشيف
export interface ArchiveInfo {
  id: string;
  name: string;
  description: string;
  fileCount: number;
  totalSize: number;
  createdAt: Date;
  updatedAt: Date;
  isCompressed: boolean;
  isEncrypted: boolean;
}

/**
 * فئة إدارة البيانات الوصفية للملفات
 */
export class FileMetadataManager {
  private readonly storageKey = 'file_metadata';
  private readonly archiveKey = 'file_archives';
  private readonly indexKey = 'file_index';

  constructor() {
    console.log('📝 تم تهيئة مدير البيانات الوصفية للملفات');
    this.initializeStorage();
  }

  /**
   * تهيئة التخزين والفهارس
   */
  private initializeStorage(): void {
    try {
      // إنشاء الفهارس الأساسية إذا لم تكن موجودة
      if (!this.getStorageData(this.storageKey)) {
        this.setStorageData(this.storageKey, []);
      }

      if (!this.getStorageData(this.archiveKey)) {
        this.setStorageData(this.archiveKey, []);
      }

      if (!this.getStorageData(this.indexKey)) {
        this.setStorageData(this.indexKey, {
          byUserId: {},
          byTicketId: {},
          byMimeType: {},
          byDate: {},
          bySize: {}
        });
      }

      console.log('✅ تم تهيئة نظام التخزين والفهارس');
    } catch (error) {
      console.error('🚨 فشل تهيئة نظام التخزين:', error);
    }
  }

  /**
   * إضافة البيانات الوصفية لملف جديد
   * @param metadata البيانات الوصفية
   * @returns Promise<boolean>
   */
  async addFileMetadata(metadata: FileMetadata): Promise<boolean> {
    try {
      console.log(`📝 إضافة البيانات الوصفية للملف: ${metadata.originalName}`);

      // التحقق من صحة البيانات
      if (!this.validateMetadata(metadata)) {
        throw new Error('البيانات الوصفية غير صالحة');
      }

      // الحصول على قائمة الملفات الحالية
      const allFiles = this.getStorageData(this.storageKey) || [];

      // التحقق من عدم وجود ملف بنفس المعرف
      const existingIndex = allFiles.findIndex((file: FileMetadata) => file.id === metadata.id);
      
      if (existingIndex !== -1) {
        // تحديث ملف موجود
        allFiles[existingIndex] = { ...metadata, timestamp: new Date() };
        console.log('🔄 تم تحديث البيانات الوصفية للملف الموجود');
      } else {
        // إضافة ملف جديد
        allFiles.push(metadata);
        console.log('➕ تم إضافة البيانات الوصفية للملف الجديد');
      }

      // حفظ القائمة المحدثة
      this.setStorageData(this.storageKey, allFiles);

      // تحديث الفهارس
      await this.updateIndexes(metadata);

      console.log(`✅ تم حفظ البيانات الوصفية بنجاح - ID: ${metadata.id}`);
      return true;
    } catch (error) {
      console.error('🚨 فشل إضافة البيانات الوصفية:', error);
      return false;
    }
  }

  /**
   * الحصول على البيانات الوصفية لملف
   * @param fileId معرف الملف
   * @returns FileMetadata | null
   */
  getFileMetadata(fileId: string): FileMetadata | null {
    try {
      const allFiles = this.getStorageData(this.storageKey) || [];
      const file = allFiles.find((file: FileMetadata) => file.id === fileId);
      
      if (file) {
        console.log(`📄 تم العثور على البيانات الوصفية للملف: ${file.originalName}`);
        return file;
      } else {
        console.warn(`⚠️ لم يتم العثور على ملف بالمعرف: ${fileId}`);
        return null;
      }
    } catch (error) {
      console.error('🚨 فشل الحصول على البيانات الوصفية:', error);
      return null;
    }
  }

  /**
   * البحث في الملفات
   * @param query معايير البحث
   * @returns Promise<SearchResult>
   */
  async searchFiles(query: FileSearchQuery): Promise<SearchResult> {
    try {
      console.log('🔍 بدء البحث في الملفات:', query);
      const startTime = Date.now();

      const allFiles = this.getStorageData(this.storageKey) || [];
      let filteredFiles: FileMetadata[] = [...allFiles];

      // تطبيق فلاتر البحث
      if (query.userId) {
        filteredFiles = filteredFiles.filter(file => file.userId === query.userId);
      }

      if (query.ticketId) {
        filteredFiles = filteredFiles.filter(file => file.ticketId === query.ticketId);
      }

      if (query.fileName) {
        const searchTerm = query.fileName.toLowerCase();
        filteredFiles = filteredFiles.filter(file => 
          file.originalName.toLowerCase().includes(searchTerm)
        );
      }

      if (query.mimeType) {
        filteredFiles = filteredFiles.filter(file => file.mimeType === query.mimeType);
      }

      if (query.dateFrom) {
        filteredFiles = filteredFiles.filter(file => 
          new Date(file.timestamp) >= query.dateFrom!
        );
      }

      if (query.dateTo) {
        filteredFiles = filteredFiles.filter(file => 
          new Date(file.timestamp) <= query.dateTo!
        );
      }

      if (query.sizeMin !== undefined) {
        filteredFiles = filteredFiles.filter(file => file.originalSize >= query.sizeMin!);
      }

      if (query.sizeMax !== undefined) {
        filteredFiles = filteredFiles.filter(file => file.originalSize <= query.sizeMax!);
      }

      if (query.algorithm) {
        filteredFiles = filteredFiles.filter(file => file.algorithm === query.algorithm);
      }

      // حساب المقاييس
      const totalSize = filteredFiles.reduce((sum, file) => sum + file.originalSize, 0);
      const searchTime = Date.now() - startTime;

      console.log(`✅ تم العثور على ${filteredFiles.length} ملف في ${searchTime}ms`);

      return {
        files: filteredFiles,
        totalCount: filteredFiles.length,
        totalSize,
        searchTime
      };
    } catch (error) {
      console.error('🚨 فشل البحث في الملفات:', error);
      return {
        files: [],
        totalCount: 0,
        totalSize: 0,
        searchTime: 0
      };
    }
  }

  /**
   * حذف البيانات الوصفية لملف
   * @param fileId معرف الملف
   * @returns boolean
   */
  deleteFileMetadata(fileId: string): boolean {
    try {
      console.log(`🗑️ حذف البيانات الوصفية للملف: ${fileId}`);

      const allFiles = this.getStorageData(this.storageKey) || [];
      const fileIndex = allFiles.findIndex((file: FileMetadata) => file.id === fileId);

      if (fileIndex === -1) {
        console.warn(`⚠️ لم يتم العثور على ملف بالمعرف: ${fileId}`);
        return false;
      }

      const deletedFile = allFiles[fileIndex];
      allFiles.splice(fileIndex, 1);

      // حفظ القائمة المحدثة
      this.setStorageData(this.storageKey, allFiles);

      // إزالة من الفهارس
      this.removeFromIndexes(deletedFile);

      console.log(`✅ تم حذف البيانات الوصفية بنجاح: ${deletedFile.originalName}`);
      return true;
    } catch (error) {
      console.error('🚨 فشل حذف البيانات الوصفية:', error);
      return false;
    }
  }

  /**
   * الحصول على إحصائيات شاملة للملفات
   * @returns Promise<FileStatistics>
   */
  async getStatistics(): Promise<FileStatistics> {
    try {
      console.log('📊 حساب إحصائيات الملفات');

      const allFiles = this.getStorageData(this.storageKey) || [];
      
      const stats: FileStatistics = {
        totalFiles: allFiles.length,
        totalOriginalSize: 0,
        totalEncryptedSize: 0,
        compressionRatio: 0,
        fileTypes: {},
        algorithms: {},
        usersStats: {},
        monthlyStats: {},
        securityScore: 0
      };

      // حساب الأحجام والإحصائيات
      for (const file of allFiles) {
        stats.totalOriginalSize += file.originalSize || 0;
        stats.totalEncryptedSize += file.encryptedSize || 0;

        // إحصاء أنواع الملفات
        stats.fileTypes[file.mimeType] = (stats.fileTypes[file.mimeType] || 0) + 1;

        // إحصاء الخوارزميات
        stats.algorithms[file.algorithm] = (stats.algorithms[file.algorithm] || 0) + 1;

        // إحصاء المستخدمين
        if (file.userId) {
          stats.usersStats[file.userId] = (stats.usersStats[file.userId] || 0) + 1;
        }

        // إحصاء شهرية
        const monthKey = new Date(file.timestamp).toISOString().substring(0, 7); // YYYY-MM
        stats.monthlyStats[monthKey] = (stats.monthlyStats[monthKey] || 0) + 1;
      }

      // حساب نسبة الضغط
      if (stats.totalOriginalSize > 0) {
        stats.compressionRatio = ((stats.totalOriginalSize - stats.totalEncryptedSize) / stats.totalOriginalSize) * 100;
      }

      // حساب نقاط الأمان
      stats.securityScore = this.calculateSecurityScore(allFiles);

      console.log('✅ تم حساب الإحصائيات بنجاح');
      return stats;
    } catch (error) {
      console.error('🚨 فشل حساب الإحصائيات:', error);
      return {
        totalFiles: 0,
        totalOriginalSize: 0,
        totalEncryptedSize: 0,
        compressionRatio: 0,
        fileTypes: {},
        algorithms: {},
        usersStats: {},
        monthlyStats: {},
        securityScore: 0
      };
    }
  }

  /**
   * إنشاء أرشيف للملفات
   * @param name اسم الأرشيف
   * @param fileIds قائمة معرفات الملفات
   * @param description وصف الأرشيف
   * @returns Promise<string> معرف الأرشيف المُنشأ
   */
  async createArchive(name: string, fileIds: string[], description?: string): Promise<string> {
    try {
      console.log(`📦 إنشاء أرشيف: ${name} (${fileIds.length} ملف)`);

      // التحقق من صحة البيانات المدخلة
      if (!name || fileIds.length === 0) {
        throw new Error('اسم الأرشيف وقائمة الملفات مطلوبان');
      }

      // التحقق من وجود الملفات
      const allFiles = this.getStorageData(this.storageKey) || [];
      const archiveFiles = allFiles.filter((file: FileMetadata) => fileIds.includes(file.id));

      if (archiveFiles.length !== fileIds.length) {
        console.warn(`⚠️ بعض الملفات غير موجودة. مطلوب: ${fileIds.length}، موجود: ${archiveFiles.length}`);
      }

      // حساب إحصائيات الأرشيف
      const totalSize = archiveFiles.reduce((sum: number, file: FileMetadata) => sum + file.encryptedSize, 0);

      // إنشاء معرف فريد للأرشيف
      const archiveId = this.generateArchiveId();

      // إنشاء معلومات الأرشيف
      const archiveInfo: ArchiveInfo = {
        id: archiveId,
        name,
        description: description || '',
        fileCount: archiveFiles.length,
        totalSize,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCompressed: false,
        isEncrypted: true
      };

      // حفظ معلومات الأرشيف
      const archives = this.getStorageData(this.archiveKey) || [];
      archives.push(archiveInfo);
      this.setStorageData(this.archiveKey, archives);

      // حفظ قائمة الملفات في الأرشيف
      this.setStorageData(`archive_files_${archiveId}`, fileIds);

      console.log(`✅ تم إنشاء الأرشيف بنجاح - ID: ${archiveId}`);
      return archiveId;
    } catch (error) {
      console.error('🚨 فشل إنشاء الأرشيف:', error);
      throw error;
    }
  }

  /**
   * الحصول على قائمة الأرشيف
   * @returns ArchiveInfo[]
   */
  getArchives(): ArchiveInfo[] {
    try {
      const archives = this.getStorageData(this.archiveKey) || [];
      console.log(`📦 تم العثور على ${archives.length} أرشيف`);
      return archives;
    } catch (error) {
      console.error('🚨 فشل الحصول على قائمة الأرشيف:', error);
      return [];
    }
  }

  /**
   * تصدير البيانات الوصفية
   * @param format تنسيق التصدير (json, csv, xml)
   * @returns Promise<string>
   */
  async exportMetadata(format: 'json' | 'csv' | 'xml' = 'json'): Promise<string> {
    try {
      console.log(`📤 تصدير البيانات الوصفية بتنسيق: ${format.toUpperCase()}`);

      const allFiles = this.getStorageData(this.storageKey) || [];

      switch (format) {
        case 'json':
          return JSON.stringify(allFiles, null, 2);

        case 'csv':
          return this.convertToCSV(allFiles);

        case 'xml':
          return this.convertToXML(allFiles);

        default:
          throw new Error(`تنسيق غير مدعوم: ${format}`);
      }
    } catch (error) {
      console.error('🚨 فشل تصدير البيانات الوصفية:', error);
      throw error;
    }
  }

  /**
   * استيراد البيانات الوصفية
   * @param data البيانات المستوردة
   * @param format تنسيق البيانات
   * @returns Promise<number> عدد الملفات المستوردة
   */
  async importMetadata(data: string, format: 'json' | 'csv' = 'json'): Promise<number> {
    try {
      console.log(`📥 استيراد البيانات الوصفية بتنسيق: ${format.toUpperCase()}`);

      let importedFiles: FileMetadata[] = [];

      switch (format) {
        case 'json':
          importedFiles = JSON.parse(data);
          break;

        case 'csv':
          importedFiles = this.parseCSV(data);
          break;

        default:
          throw new Error(`تنسيق غير مدعوم: ${format}`);
      }

      // التحقق من صحة البيانات
      const validFiles = importedFiles.filter(file => this.validateMetadata(file));

      // إضافة الملفات الصالحة
      for (const file of validFiles) {
        await this.addFileMetadata(file);
      }

      console.log(`✅ تم استيراد ${validFiles.length} ملف من أصل ${importedFiles.length}`);
      return validFiles.length;
    } catch (error) {
      console.error('🚨 فشل استيراد البيانات الوصفية:', error);
      throw error;
    }
  }

  // ===== دوال مساعدة خاصة =====

  /**
   * التحقق من صحة البيانات الوصفية
   * @param metadata البيانات الوصفية
   * @returns boolean
   */
  private validateMetadata(metadata: FileMetadata): boolean {
    const required = ['id', 'originalName', 'encryptedPath', 'checksum', 'algorithm'];
    return required.every(field => field in metadata && metadata[field as keyof FileMetadata]);
  }

  /**
   * تحديث الفهارس
   * @param metadata البيانات الوصفية
   */
  private async updateIndexes(metadata: FileMetadata): Promise<void> {
    try {
      const indexes = this.getStorageData(this.indexKey) || {};

      // فهرس المستخدمين
      if (metadata.userId) {
        indexes.byUserId[metadata.userId] = indexes.byUserId[metadata.userId] || [];
        if (!indexes.byUserId[metadata.userId].includes(metadata.id)) {
          indexes.byUserId[metadata.userId].push(metadata.id);
        }
      }

      // فهرس التذاكر
      if (metadata.ticketId) {
        indexes.byTicketId[metadata.ticketId] = indexes.byTicketId[metadata.ticketId] || [];
        if (!indexes.byTicketId[metadata.ticketId].includes(metadata.id)) {
          indexes.byTicketId[metadata.ticketId].push(metadata.id);
        }
      }

      // فهرس أنواع الملفات
      indexes.byMimeType[metadata.mimeType] = indexes.byMimeType[metadata.mimeType] || [];
      if (!indexes.byMimeType[metadata.mimeType].includes(metadata.id)) {
        indexes.byMimeType[metadata.mimeType].push(metadata.id);
      }

      // فهرس التواريخ
      const dateKey = new Date(metadata.timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
      indexes.byDate[dateKey] = indexes.byDate[dateKey] || [];
      if (!indexes.byDate[dateKey].includes(metadata.id)) {
        indexes.byDate[dateKey].push(metadata.id);
      }

      // فهرس الأحجام
      const sizeCategory = this.getSizeCategory(metadata.originalSize);
      indexes.bySize[sizeCategory] = indexes.bySize[sizeCategory] || [];
      if (!indexes.bySize[sizeCategory].includes(metadata.id)) {
        indexes.bySize[sizeCategory].push(metadata.id);
      }

      // حفظ الفهارس المحدثة
      this.setStorageData(this.indexKey, indexes);
    } catch (error) {
      console.error('🚨 فشل تحديث الفهارس:', error);
    }
  }

  /**
   * إزالة من الفهارس
   * @param metadata البيانات الوصفية
   */
  private removeFromIndexes(metadata: FileMetadata): void {
    try {
      const indexes = this.getStorageData(this.indexKey) || {};

      // إزالة من فهرس المستخدمين
      if (metadata.userId && indexes.byUserId[metadata.userId]) {
        indexes.byUserId[metadata.userId] = indexes.byUserId[metadata.userId].filter(
          (id: string) => id !== metadata.id
        );
      }

      // إزالة من فهرس التذاكر
      if (metadata.ticketId && indexes.byTicketId[metadata.ticketId]) {
        indexes.byTicketId[metadata.ticketId] = indexes.byTicketId[metadata.ticketId].filter(
          (id: string) => id !== metadata.id
        );
      }

      // إزالة من فهرس أنواع الملفات
      if (indexes.byMimeType[metadata.mimeType]) {
        indexes.byMimeType[metadata.mimeType] = indexes.byMimeType[metadata.mimeType].filter(
          (id: string) => id !== metadata.id
        );
      }

      // حفظ الفهارس المحدثة
      this.setStorageData(this.indexKey, indexes);
    } catch (error) {
      console.error('🚨 فشل إزالة من الفهارس:', error);
    }
  }

  /**
   * حساب نقاط الأمان
   * @param files قائمة الملفات
   * @returns number نقاط الأمان (0-100)
   */
  private calculateSecurityScore(files: FileMetadata[]): number {
    if (files.length === 0) return 100;

    let score = 0;
    const factors = {
      strongAlgorithm: 0,
      recentFiles: 0,
      checksumValid: 0,
      properNaming: 0
    };

    for (const file of files) {
      // خوارزمية قوية (25 نقطة)
      if (file.algorithm.includes('256')) {
        factors.strongAlgorithm++;
      }

      // ملفات حديثة (25 نقطة)
      const fileAge = Date.now() - new Date(file.timestamp).getTime();
      if (fileAge < 30 * 24 * 60 * 60 * 1000) { // أقل من شهر
        factors.recentFiles++;
      }

      // checksum صالح (25 نقطة)
      if (file.checksum && file.checksum.length === 64) { // SHA-256 hash
        factors.checksumValid++;
      }

      // تسمية مناسبة (25 نقطة)
      if (file.originalName && !file.originalName.includes('..') && file.originalName.length > 0) {
        factors.properNaming++;
      }
    }

    // حساب المتوسط
    const totalFiles = files.length;
    score = Math.round(
      ((factors.strongAlgorithm / totalFiles) * 25) +
      ((factors.recentFiles / totalFiles) * 25) +
      ((factors.checksumValid / totalFiles) * 25) +
      ((factors.properNaming / totalFiles) * 25)
    );

    return Math.min(100, Math.max(0, score));
  }

  /**
   * تصنيف حجم الملف
   * @param size حجم الملف بالبايت
   * @returns string تصنيف الحجم
   */
  private getSizeCategory(size: number): string {
    if (size < 1024) return 'tiny'; // أقل من 1KB
    if (size < 1024 * 1024) return 'small'; // أقل من 1MB
    if (size < 10 * 1024 * 1024) return 'medium'; // أقل من 10MB
    if (size < 100 * 1024 * 1024) return 'large'; // أقل من 100MB
    return 'huge'; // أكبر من 100MB
  }

  /**
   * توليد معرف فريد للأرشيف
   * @returns string معرف الأرشيف
   */
  private generateArchiveId(): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(4).toString('hex');
    return `archive_${timestamp}_${random}`;
  }

  /**
   * تحويل البيانات إلى تنسيق CSV
   * @param files قائمة الملفات
   * @returns string البيانات بتنسيق CSV
   */
  private convertToCSV(files: FileMetadata[]): string {
    if (files.length === 0) return '';

    const headers = Object.keys(files[0]).join(',');
    const rows = files.map(file => 
      Object.values(file).map(value => 
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * تحويل البيانات إلى تنسيق XML
   * @param files قائمة الملفات
   * @returns string البيانات بتنسيق XML
   */
  private convertToXML(files: FileMetadata[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<files>\n';
    
    for (const file of files) {
      xml += '  <file>\n';
      for (const [key, value] of Object.entries(file)) {
        xml += `    <${key}>${this.escapeXML(String(value))}</${key}>\n`;
      }
      xml += '  </file>\n';
    }
    
    xml += '</files>';
    return xml;
  }

  /**
   * تحليل البيانات من تنسيق CSV
   * @param csvData البيانات بتنسيق CSV
   * @returns FileMetadata[] قائمة الملفات
   */
  private parseCSV(csvData: string): FileMetadata[] {
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');
    const files: FileMetadata[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => 
        value.replace(/^"(.*)"$/, '$1')
      );
      
      const file: any = {};
      headers.forEach((header, index) => {
        file[header] = values[index] || '';
      });
      
      files.push(file as FileMetadata);
    }

    return files;
  }

  /**
   * تشفير نص XML
   * @param text النص المراد تشفيره
   * @returns string النص المشفر
   */
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * الحصول على بيانات التخزين
   * @param key مفتاح البيانات
   * @returns any البيانات المحفوظة
   */
  private getStorageData(key: string): any {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }
      return null;
    } catch (error) {
      console.error(`🚨 فشل قراءة البيانات من التخزين: ${key}`, error);
      return null;
    }
  }

  /**
   * حفظ بيانات في التخزين
   * @param key مفتاح البيانات
   * @param data البيانات المراد حفظها
   */
  private setStorageData(key: string, data: any): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (error) {
      console.error(`🚨 فشل حفظ البيانات في التخزين: ${key}`, error);
    }
  }
}

// إنشاء instance مشترك
export const fileMetadataManager = new FileMetadataManager();

// دوال مساعدة للاستخدام السريع

/**
 * البحث السريع في الملفات
 * @param query معايير البحث
 * @returns Promise<SearchResult>
 */
export const quickSearchFiles = async (query: FileSearchQuery): Promise<SearchResult> => {
  return await fileMetadataManager.searchFiles(query);
};

/**
 * الحصول على إحصائيات سريعة
 * @returns Promise<FileStatistics>
 */
export const quickGetStatistics = async (): Promise<FileStatistics> => {
  return await fileMetadataManager.getStatistics();
};

/**
 * إنشاء أرشيف سريع
 * @param name اسم الأرشيف
 * @param fileIds قائمة معرفات الملفات
 * @param description وصف الأرشيف
 * @returns Promise<string>
 */
export const quickCreateArchive = async (
  name: string, 
  fileIds: string[], 
  description?: string
): Promise<string> => {
  return await fileMetadataManager.createArchive(name, fileIds, description);
};

export default fileMetadataManager;