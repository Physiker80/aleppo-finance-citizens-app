// =====================================================
// 💾 IndexedDB Manager
// قاعدة بيانات محلية متقدمة بدلاً من localStorage
// =====================================================

export interface DBConfig {
    name: string;
    version: number;
    stores: StoreConfig[];
}

export interface StoreConfig {
    name: string;
    keyPath: string;
    indexes?: IndexConfig[];
}

export interface IndexConfig {
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
}

// إعدادات قاعدة البيانات
const DB_CONFIG: DBConfig = {
    name: 'AleppoFinanceDB',
    version: 1,
    stores: [
        {
            name: 'tickets',
            keyPath: 'id',
            indexes: [
                { name: 'by_status', keyPath: 'status' },
                { name: 'by_department', keyPath: 'department' },
                { name: 'by_date', keyPath: 'submissionDate' },
                { name: 'by_nationalId', keyPath: 'nationalId' }
            ]
        },
        {
            name: 'employees',
            keyPath: 'username',
            indexes: [
                { name: 'by_department', keyPath: 'department' },
                { name: 'by_role', keyPath: 'role' },
                { name: 'by_nationalId', keyPath: 'nationalId' }
            ]
        },
        {
            name: 'contactMessages',
            keyPath: 'id',
            indexes: [
                { name: 'by_status', keyPath: 'status' },
                { name: 'by_department', keyPath: 'department' },
                { name: 'by_date', keyPath: 'submissionDate' }
            ]
        },
        {
            name: 'notifications',
            keyPath: 'id',
            indexes: [
                { name: 'by_department', keyPath: 'department' },
                { name: 'by_read', keyPath: 'read' },
                { name: 'by_date', keyPath: 'createdAt' }
            ]
        },
        {
            name: 'surveys',
            keyPath: 'id',
            indexes: [
                { name: 'by_rating', keyPath: 'rating' },
                { name: 'by_date', keyPath: 'createdAt' }
            ]
        },
        {
            name: 'incidents',
            keyPath: 'id',
            indexes: [
                { name: 'by_status', keyPath: 'status' },
                { name: 'by_severity', keyPath: 'severity' }
            ]
        },
        {
            name: 'internalMessages',
            keyPath: 'id',
            indexes: [
                { name: 'by_sender', keyPath: 'senderId' },
                { name: 'by_recipient', keyPath: 'recipientId' },
                { name: 'by_date', keyPath: 'createdAt' }
            ]
        },
        {
            name: 'settings',
            keyPath: 'key'
        },
        {
            name: 'cache',
            keyPath: 'key',
            indexes: [
                { name: 'by_expiry', keyPath: 'expiresAt' }
            ]
        }
    ]
};

class IndexedDBManager {
    private db: IDBDatabase | null = null;
    private dbName: string;
    private dbVersion: number;
    private stores: StoreConfig[];
    private initPromise: Promise<IDBDatabase> | null = null;

    constructor(config: DBConfig = DB_CONFIG) {
        this.dbName = config.name;
        this.dbVersion = config.version;
        this.stores = config.stores;
    }

    /**
     * تهيئة قاعدة البيانات
     */
    async init(): Promise<IDBDatabase> {
        if (this.db) return this.db;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                reject(new Error('IndexedDB not supported'));
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('[IndexedDB] Open failed:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[IndexedDB] Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                this.createStores(db);
            };
        });

        return this.initPromise;
    }

    /**
     * إنشاء المخازن
     */
    private createStores(db: IDBDatabase): void {
        for (const storeConfig of this.stores) {
            if (!db.objectStoreNames.contains(storeConfig.name)) {
                const store = db.createObjectStore(storeConfig.name, {
                    keyPath: storeConfig.keyPath,
                    autoIncrement: false
                });

                // إنشاء الفهارس
                if (storeConfig.indexes) {
                    for (const index of storeConfig.indexes) {
                        store.createIndex(index.name, index.keyPath, index.options);
                    }
                }

                console.log(`[IndexedDB] Created store: ${storeConfig.name}`);
            }
        }
    }

    /**
     * الحصول على مخزن
     */
    private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
        const db = await this.init();
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    /**
     * إضافة أو تحديث عنصر
     */
    async put<T>(storeName: string, data: T): Promise<T> {
        const store = await this.getStore(storeName, 'readwrite');

        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(data);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * إضافة عناصر متعددة
     */
    async putMany<T>(storeName: string, items: T[]): Promise<T[]> {
        const db = await this.init();
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            let completed = 0;

            for (const item of items) {
                const request = store.put(item);
                request.onsuccess = () => {
                    completed++;
                    if (completed === items.length) resolve(items);
                };
                request.onerror = () => reject(request.error);
            }

            if (items.length === 0) resolve([]);
        });
    }

    /**
     * الحصول على عنصر بالمفتاح
     */
    async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
        const store = await this.getStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * الحصول على جميع العناصر
     */
    async getAll<T>(storeName: string): Promise<T[]> {
        const store = await this.getStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * البحث بفهرس
     */
    async getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
        const store = await this.getStore(storeName);
        const index = store.index(indexName);

        return new Promise((resolve, reject) => {
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * البحث بنطاق
     */
    async getByRange<T>(
        storeName: string,
        indexName: string,
        lower?: IDBValidKey,
        upper?: IDBValidKey
    ): Promise<T[]> {
        const store = await this.getStore(storeName);
        const index = store.index(indexName);

        let range: IDBKeyRange | null = null;
        if (lower && upper) {
            range = IDBKeyRange.bound(lower, upper);
        } else if (lower) {
            range = IDBKeyRange.lowerBound(lower);
        } else if (upper) {
            range = IDBKeyRange.upperBound(upper);
        }

        return new Promise((resolve, reject) => {
            const request = index.getAll(range);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * حذف عنصر
     */
    async delete(storeName: string, key: IDBValidKey): Promise<void> {
        const store = await this.getStore(storeName, 'readwrite');

        return new Promise((resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * مسح جميع العناصر
     */
    async clear(storeName: string): Promise<void> {
        const store = await this.getStore(storeName, 'readwrite');

        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * عدد العناصر
     */
    async count(storeName: string): Promise<number> {
        const store = await this.getStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * البحث المتقدم مع فلاتر
     */
    async query<T>(
        storeName: string,
        filter: (item: T) => boolean,
        options?: { limit?: number; offset?: number }
    ): Promise<T[]> {
        const all = await this.getAll<T>(storeName);
        let filtered = all.filter(filter);

        if (options?.offset) {
            filtered = filtered.slice(options.offset);
        }
        if (options?.limit) {
            filtered = filtered.slice(0, options.limit);
        }

        return filtered;
    }

    /**
     * تحديث عنصر جزئياً
     */
    async update<T extends object>(
        storeName: string,
        key: IDBValidKey,
        updates: Partial<T>
    ): Promise<T | undefined> {
        const existing = await this.get<T>(storeName, key);
        if (!existing) return undefined;

        const updated = { ...existing, ...updates };
        await this.put(storeName, updated);
        return updated;
    }

    /**
     * ترحيل البيانات من localStorage
     */
    async migrateFromLocalStorage(): Promise<void> {
        console.log('[IndexedDB] Starting migration from localStorage...');

        const migrations: { key: string; store: string }[] = [
            { key: 'tickets', store: 'tickets' },
            { key: 'employees', store: 'employees' },
            { key: 'contactMessages', store: 'contactMessages' },
            { key: 'notifications', store: 'notifications' },
            { key: 'citizenSurveys', store: 'surveys' },
            { key: 'incidents', store: 'incidents' },
            { key: 'internalMessages', store: 'internalMessages' }
        ];

        for (const { key, store } of migrations) {
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const data = JSON.parse(raw);
                    if (Array.isArray(data) && data.length > 0) {
                        await this.putMany(store, data);
                        console.log(`[IndexedDB] Migrated ${data.length} items from ${key}`);
                    }
                }
            } catch (error) {
                console.error(`[IndexedDB] Failed to migrate ${key}:`, error);
            }
        }

        // تخزين إعدادات منفردة
        const settingsKeys = ['theme', 'appStoreLinks', 'departmentsList'];
        for (const key of settingsKeys) {
            try {
                const value = localStorage.getItem(key);
                if (value) {
                    await this.put('settings', { key, value: JSON.parse(value) });
                    console.log(`[IndexedDB] Migrated setting: ${key}`);
                }
            } catch (error) {
                // قد يكون النص عادي وليس JSON
                const value = localStorage.getItem(key);
                if (value) {
                    await this.put('settings', { key, value });
                }
            }
        }

        console.log('[IndexedDB] Migration completed');
    }

    /**
     * تصدير قاعدة البيانات
     */
    async exportAll(): Promise<Record<string, unknown[]>> {
        const result: Record<string, unknown[]> = {};

        for (const store of this.stores) {
            result[store.name] = await this.getAll(store.name);
        }

        return result;
    }

    /**
     * استيراد قاعدة البيانات
     */
    async importAll(data: Record<string, unknown[]>): Promise<void> {
        for (const [storeName, items] of Object.entries(data)) {
            if (Array.isArray(items) && items.length > 0) {
                await this.putMany(storeName, items);
            }
        }
    }

    /**
     * إغلاق قاعدة البيانات
     */
    close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initPromise = null;
        }
    }

    /**
     * حذف قاعدة البيانات
     */
    async deleteDatabase(): Promise<void> {
        this.close();

        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// Export singleton
export const indexedDB_Manager = new IndexedDBManager();

export default indexedDB_Manager;
